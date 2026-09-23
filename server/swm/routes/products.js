const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * GET /api/swm/products
 * Paginated list with category name and aggregated inventory stock
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category_id, branch_id, status } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [];
    const params = [];
    let pIdx = 1;

    if (search && search.trim()) {
      whereClauses.push(`(p.product_name ILIKE $${pIdx} OR p.product_code ILIKE $${pIdx} OR p.barcode ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (category_id) {
      whereClauses.push(`p.category_id = $${pIdx}`);
      params.push(parseInt(category_id, 10));
      pIdx++;
    }

    if (status) {
      whereClauses.push(`p.status = $${pIdx}`);
      params.push(status);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let branchJoinSql = '';
    if (branch_id) {
      branchJoinSql = `AND ib.branch_id = $${pIdx}`;
      params.push(parseInt(branch_id, 10));
      pIdx++;
    }

    // Query Total Count
    const countSql = `SELECT COUNT(DISTINCT p.id) AS total FROM products p ${whereSql}`;
    const countResult = await query(countSql, params.slice(0, branch_id ? pIdx - 2 : pIdx - 1));
    const total = parseInt(countResult[0]?.total || 0, 10);

    // Query Data
    const dataSql = `
      SELECT p.id, p.product_code, p.barcode, p.product_name, p.slug, p.brand,
             p.cost_price, p.selling_price, p.wholesale_price, p.sale_price,
             p.status, p.is_ecom_listed, p.is_featured, p.category_id,
             c.category_name,
             COALESCE(SUM(ib.available_qty), 0) AS total_stock,
             COUNT(DISTINCT v.id) AS variant_count
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN product_variants v ON v.product_id = p.id
      LEFT JOIN inventory_balances ib ON ib.product_id = p.id ${branchJoinSql}
      ${whereSql}
      GROUP BY p.id, c.category_name
      ORDER BY p.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const products = await query(dataSql, params);

    return res.json({
      success: true,
      data: products,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Products list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/products/:id
 * Retrieve single product with full variants and branch inventory matrix
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [product] = await query(
      `SELECT p.*, c.category_name
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [id]
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const variants = await query(
      `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id ASC`,
      [id]
    );

    const inventory = await query(
      `SELECT ib.*, b.branch_name, b.branch_code, v.variant_sku, v.color, v.size
       FROM inventory_balances ib
       JOIN branches b ON b.id = ib.branch_id
       LEFT JOIN product_variants v ON v.id = ib.variant_id
       WHERE ib.product_id = $1`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...product,
        variants,
        inventory
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/products
 * Create product + all variants in a SINGLE atomic database transaction
 */
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), async (req, res) => {
  try {
    const {
      product_code,
      product_name,
      barcode,
      category_id,
      sub_category_id,
      brand,
      material,
      color,
      size,
      cost_price,
      selling_price,
      wholesale_price,
      sale_price,
      reorder_level = 5,
      is_ecom_listed = false,
      variants = []
    } = req.body;

    if (!product_code || !product_name || !category_id || cost_price === undefined || selling_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product code, name, category, cost price, and selling price are required'
      });
    }

    const cleanCode = String(product_code).trim().toUpperCase();
    const existing = await query(`SELECT id FROM products WHERE product_code = $1`, [cleanCode]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Product code already in use' });
    }

    const slug = (product_name || cleanCode)
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '') + `-${Date.now().toString().slice(-6)}`;

    // Execute product and variants insertion in a single transaction
    const createdProductId = await transaction(async (client) => {
      const prodResult = await client.query(
        `INSERT INTO products (
          product_code, barcode, product_name, slug, brand,
          category_id, sub_category_id, material, color, size,
          cost_price, selling_price, wholesale_price, sale_price,
          reorder_level, is_ecom_listed, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, 'active', NOW(), NOW()
        ) RETURNING id`,
        [
          cleanCode,
          barcode ? String(barcode).trim() : cleanCode,
          product_name.trim(),
          slug,
          brand || null,
          parseInt(category_id, 10),
          sub_category_id ? parseInt(sub_category_id, 10) : null,
          material || null,
          color || null,
          size || null,
          parseFloat(cost_price),
          parseFloat(selling_price),
          wholesale_price ? parseFloat(wholesale_price) : null,
          sale_price ? parseFloat(sale_price) : null,
          parseInt(reorder_level, 10) || 5,
          Boolean(is_ecom_listed)
        ]
      );

      const productId = prodResult.rows[0].id;

      // Insert product variants if supplied
      if (Array.isArray(variants) && variants.length > 0) {
        for (const v of variants) {
          const sku = v.sku || `${cleanCode}-${(v.color || 'STD').toUpperCase()}-${(v.size || 'STD').toUpperCase()}`;
          await client.query(
            `INSERT INTO product_variants (
              product_id, variant_sku, color, size, material, price_modifier, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())`,
            [
              productId,
              sku,
              v.color || null,
              v.size || null,
              v.material || null,
              v.price_modifier ? parseFloat(v.price_modifier) : 0
            ]
          );
        }
      }

      return productId;
    });

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'CREATE_PRODUCT',
      entityType: 'products',
      entityId: createdProductId,
      newValue: { product_code: cleanCode, product_name, variants_count: variants.length, selling_price },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Product ${product_name} (${cleanCode}) created with ${variants.length} variants`
    });

    return res.status(201).json({
      success: true,
      data: {
        id: createdProductId,
        product_code: cleanCode,
        product_name,
        variants_count: variants.length
      }
    });
  } catch (err) {
    console.error('Product creation error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/products/:id
 * Update product with old vs new price differential logging
 */
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const [old] = await query(`SELECT * FROM products WHERE id = $1`, [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      product_name,
      category_id,
      sub_category_id,
      brand,
      cost_price,
      selling_price,
      wholesale_price,
      sale_price,
      status,
      is_ecom_listed,
      reorder_level
    } = req.body;

    await query(
      `UPDATE products SET
        product_name = COALESCE($1, product_name),
        category_id = COALESCE($2, category_id),
        sub_category_id = COALESCE($3, sub_category_id),
        brand = COALESCE($4, brand),
        cost_price = COALESCE($5, cost_price),
        selling_price = COALESCE($6, selling_price),
        wholesale_price = COALESCE($7, wholesale_price),
        sale_price = COALESCE($8, sale_price),
        status = COALESCE($9, status),
        is_ecom_listed = COALESCE($10, is_ecom_listed),
        reorder_level = COALESCE($11, reorder_level),
        updated_at = NOW()
       WHERE id = $12`,
      [
        product_name || null,
        category_id || null,
        sub_category_id || null,
        brand || null,
        cost_price !== undefined ? parseFloat(cost_price) : null,
        selling_price !== undefined ? parseFloat(selling_price) : null,
        wholesale_price !== undefined ? parseFloat(wholesale_price) : null,
        sale_price !== undefined ? parseFloat(sale_price) : null,
        status || null,
        is_ecom_listed !== undefined ? Boolean(is_ecom_listed) : null,
        reorder_level !== undefined ? parseInt(reorder_level, 10) : null,
        id
      ]
    );

    const priceChanged = selling_price !== undefined && parseFloat(selling_price) !== parseFloat(old.selling_price);

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: priceChanged ? 'UPDATE_PRICE' : 'UPDATE_PRODUCT',
      entityType: 'products',
      entityId: id,
      oldValue: {
        cost_price: old.cost_price,
        selling_price: old.selling_price,
        status: old.status
      },
      newValue: {
        cost_price: cost_price !== undefined ? cost_price : old.cost_price,
        selling_price: selling_price !== undefined ? selling_price : old.selling_price,
        status: status || old.status
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: priceChanged
        ? `Selling price modified from ${old.selling_price} to ${selling_price}`
        : `Product ${id} updated`
    });

    return res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/swm/products/:id
 * Soft delete product (sets status to 'discontinued')
 */
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE products SET status = 'discontinued', updated_at = NOW() WHERE id = $1`, [id]);

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'DELETE_PRODUCT',
      entityType: 'products',
      entityId: id,
      notes: `Product ${id} marked as discontinued`
    });

    return res.json({ success: true, message: 'Product marked as discontinued' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
