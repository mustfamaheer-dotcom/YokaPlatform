const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');
const redis = require('../../shared/redis');

/**
 * GET /api/swm/products
 * Paginated list with category name and aggregated inventory stock
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category_id, branch_id, status } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [];
    const params = [];
    let pIdx = 1;

    if (search && search.trim()) {
      whereClauses.push(`(p.product_name ILIKE $${pIdx} OR p.product_code ILIKE $${pIdx} OR p.barcode ILIKE $${pIdx} OR p.brand ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (category_id) {
      whereClauses.push(`p.category_id = $${pIdx}`);
      params.push(parseInt(category_id, 10));
      pIdx++;
    }

    if (status && status !== 'all') {
      whereClauses.push(`p.status = $${pIdx}`);
      params.push(status);
      pIdx++;
    } else if (!status) {
      // By default exclude discontinued/deleted products unless explicitly asked for (status='all' or status='discontinued')
      whereClauses.push(`(p.status != 'discontinued' OR p.status IS NULL)`);
    }

    if (req.query.has_category === 'true') {
      whereClauses.push(`p.category_id IS NOT NULL`);
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
             p.status, p.is_ecom_listed, p.is_featured, p.category_id, p.featured_image,
             c.category_name,
             COALESCE(SUM(ib.available_qty), 0) AS total_stock,
             COUNT(DISTINCT v.id) AS variant_count,
             COALESCE(
               JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('color', v.color, 'image_url', v.image_url))
               FILTER (WHERE v.id IS NOT NULL AND v.color IS NOT NULL),
               '[]'::json
             ) AS color_variants
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
 * GET /api/swm/products/ecom-warehouse-stock
 * Retrieve inventory stock and e-commerce listing status for the E-Commerce Warehouse
 */
router.get('/ecom-warehouse-stock', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'inventory_manager', 'warehouse_admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 30,
      search,
      category_id,
      is_ecom_listed,
      stock_filter = 'all',
      branch_id
    } = req.query;

    let targetBranchId = branch_id ? parseInt(branch_id, 10) : (req.user.branchId ? parseInt(req.user.branchId, 10) : null);
    if (!targetBranchId) {
      const [ecomBranch] = await query(
        `SELECT id FROM branches WHERE branch_type = 'ecom_warehouse' OR branch_code = 'BR-ECOM' ORDER BY id ASC LIMIT 1`
      );
      targetBranchId = ecomBranch ? ecomBranch.id : 1;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [`p.status = 'active'`];
    const params = [targetBranchId];
    let pIdx = 2;

    if (search && search.trim()) {
      whereClauses.push(`(p.product_name ILIKE $${pIdx} OR p.product_code ILIKE $${pIdx} OR p.barcode ILIKE $${pIdx} OR p.brand ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (category_id) {
      whereClauses.push(`p.category_id = $${pIdx}`);
      params.push(parseInt(category_id, 10));
      pIdx++;
    }

    if (is_ecom_listed === 'true' || is_ecom_listed === true) {
      whereClauses.push(`p.is_ecom_listed = true`);
    } else if (is_ecom_listed === 'false' || is_ecom_listed === false) {
      whereClauses.push(`(p.is_ecom_listed = false OR p.is_ecom_listed IS NULL)`);
    }

    const whereSql = whereClauses.join(' AND ');

    let havingSql = '';
    if (stock_filter === 'in_stock') {
      havingSql = `HAVING COALESCE(SUM(ib.available_qty), 0) > 0`;
    } else if (stock_filter === 'out_of_stock') {
      havingSql = `HAVING COALESCE(SUM(ib.available_qty), 0) = 0`;
    }

    // Query Total matching products
    const countSql = `
      SELECT COUNT(sub.id) AS total FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN product_categories c ON c.id = p.category_id
        LEFT JOIN product_variants pv ON pv.product_id = p.id
        LEFT JOIN inventory_balances ib ON ib.product_id = p.id 
                                       AND (ib.variant_id = pv.id OR (pv.id IS NULL AND ib.variant_id IS NULL))
                                       AND ib.branch_id = $1
        WHERE ${whereSql}
        GROUP BY p.id
        ${havingSql}
      ) sub
    `;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult[0]?.total || 0, 10);

    // Query Data
    const dataSql = `
      SELECT 
        p.id,
        p.product_code,
        p.barcode,
        p.product_name,
        p.slug,
        p.brand,
        p.selling_price,
        p.sale_price,
        p.cost_price,
        p.status,
        p.is_ecom_listed,
        p.is_featured,
        p.featured_image,
        c.category_name,
        COALESCE(SUM(ib.available_qty), 0)::int AS warehouse_stock,
        COUNT(DISTINCT pv.id) AS variant_count,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'variant_id', pv.id,
              'sku', pv.variant_sku,
              'color', pv.color,
              'size', pv.size,
              'available_qty', COALESCE(ib.available_qty, 0)
            ) ORDER BY pv.id ASC
          ) FILTER (WHERE pv.id IS NOT NULL),
          '[]'::json
        ) AS variants_stock
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      LEFT JOIN inventory_balances ib ON ib.product_id = p.id 
                                     AND (ib.variant_id = pv.id OR (pv.id IS NULL AND ib.variant_id IS NULL))
                                     AND ib.branch_id = $1
      WHERE ${whereSql}
      GROUP BY p.id, c.category_name
      ${havingSql}
      ORDER BY p.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const products = await query(dataSql, params);

    // Query high-level statistics for this warehouse
    const statsSql = `
      SELECT 
        COUNT(DISTINCT p.id) AS total_products,
        COALESCE(SUM(ib.available_qty), 0)::int AS total_units,
        COUNT(DISTINCT p.id) FILTER (WHERE p.is_ecom_listed = true) AS listed_count,
        COUNT(DISTINCT p.id) FILTER (WHERE p.is_ecom_listed = false OR p.is_ecom_listed IS NULL) AS unlisted_count
      FROM products p
      JOIN inventory_balances ib ON ib.product_id = p.id AND ib.branch_id = $1
      WHERE p.status = 'active'
    `;
    const [stats] = await query(statsSql, [targetBranchId]);

    // Query target branch info
    const [branchInfo] = await query(`SELECT id, branch_name, branch_code FROM branches WHERE id = $1`, [targetBranchId]);

    return res.json({
      success: true,
      data: products,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      stats: {
        total_products: parseInt(stats?.total_products || 0, 10),
        total_units: parseInt(stats?.total_units || 0, 10),
        listed_count: parseInt(stats?.listed_count || 0, 10),
        unlisted_count: parseInt(stats?.unlisted_count || 0, 10)
      },
      branch: branchInfo || { id: targetBranchId, branch_name: 'مستودع المتجر الإلكتروني' }
    });
  } catch (err) {
    console.error('Ecom warehouse stock error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/swm/products/:id/ecom-listing
 * Toggle single product e-commerce display status (is_ecom_listed)
 */
router.patch('/:id/ecom-listing', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'inventory_manager', 'warehouse_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_ecom_listed } = req.body;

    if (typeof is_ecom_listed !== 'boolean') {
      return res.status(400).json({ success: false, message: 'حالة العرض غير صحيحة' });
    }

    const [prod] = await query(`SELECT id, product_name, is_ecom_listed FROM products WHERE id = $1`, [id]);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }

    await query(
      `UPDATE products SET is_ecom_listed = $1, updated_at = NOW() WHERE id = $2`,
      [is_ecom_listed, id]
    );

    // Invalidate Redis cache for storefront
    try {
      const keys = await redis.keys('ecp:cache:*');
      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (e) {
      // Redis optional
    }

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'UPDATE_ECOM_LISTING',
      entityType: 'products',
      entityId: id,
      notes: `${is_ecom_listed ? 'عرض' : 'إخفاء'} المنتج "${prod.product_name}" من المتجر الإلكتروني`
    });

    return res.json({
      success: true,
      message: is_ecom_listed ? 'تم تفعيل عرض الصنف بالمتجر الإلكتروني بنجاح' : 'تم إخفاء الصنف من المتجر الإلكتروني بنجاح',
      data: { id: parseInt(id, 10), is_ecom_listed }
    });
  } catch (err) {
    console.error('Update ecom listing error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/swm/products/batch-ecom-listing
 * Batch toggle multiple products e-commerce display status
 */
router.patch('/batch-ecom-listing', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'inventory_manager', 'warehouse_admin']), async (req, res) => {
  try {
    const { product_ids, is_ecom_listed } = req.body;

    if (!Array.isArray(product_ids) || product_ids.length === 0 || typeof is_ecom_listed !== 'boolean') {
      return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
    }

    const ids = product_ids.map(id => parseInt(id, 10)).filter(Boolean);

    await query(
      `UPDATE products SET is_ecom_listed = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
      [is_ecom_listed, ids]
    );

    // Invalidate Redis cache
    try {
      const keys = await redis.keys('ecp:cache:*');
      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (e) {
      // Redis optional
    }

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'BATCH_UPDATE_ECOM_LISTING',
      entityType: 'products',
      entityId: null,
      notes: `${is_ecom_listed ? 'عرض' : 'إخفاء'} عدد ${ids.length} صنف بالمتجر الإلكتروني`
    });

    return res.json({
      success: true,
      message: is_ecom_listed ? `تم تفعيل عرض ${ids.length} صنف بالمتجر بنجاح` : `تم إخفاء ${ids.length} صنف من المتجر بنجاح`,
      updated_count: ids.length
    });
  } catch (err) {
    console.error('Batch ecom listing error:', err);
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

const { validate, createProductSchema } = require('../../shared/validators');

/**
 * POST /api/swm/products
 * Create product + all variants in a SINGLE atomic database transaction
 */
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), validate(createProductSchema), async (req, res) => {
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
      featured_image = null,
      variants = []
    } = req.body;

    // Auto-generate code & barcode if not explicitly supplied
    const cleanCode = product_code
      ? String(product_code).trim().toUpperCase()
      : `PRD-${Date.now().toString().slice(-6)}`;

    const cleanBarcode = barcode
      ? String(barcode).trim()
      : `622${Date.now().toString().slice(-10)}`;

    const existing = await query(`SELECT id FROM products WHERE product_code = $1`, [cleanCode]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'كود المنتج مسجل مسبقاً' });
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
          reorder_level, is_ecom_listed, featured_image, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, 'active', NOW(), NOW()
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
          Boolean(is_ecom_listed),
          featured_image || null
        ]
      );

      const productId = prodResult.rows[0].id;

      // Insert product variants if supplied
      if (Array.isArray(variants) && variants.length > 0) {
        const usedSkusInBatch = new Set();
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          let candidateSku = v.sku ? String(v.sku).trim().toUpperCase() : null;
          if (!candidateSku) {
            const rawColor = String(v.color || '').trim();
            const rawSize = String(v.size || '').trim();
            const cClean = rawColor.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || `C${i + 1}`;
            const sClean = rawSize.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || `S${i + 1}`;
            candidateSku = `${cleanCode}-${cClean}-${sClean}`;
          }

          // Ensure unique within current batch
          let finalSku = candidateSku;
          let counter = 1;
          while (usedSkusInBatch.has(finalSku)) {
            finalSku = `${candidateSku}-${++counter}`;
          }

          // Check if already exists in product_variants table across the entire database
          const existingVariant = await client.query(
            `SELECT id FROM product_variants WHERE variant_sku = $1 LIMIT 1`,
            [finalSku]
          );
          if (existingVariant.rows.length > 0) {
            finalSku = `${finalSku}-${Math.floor(Math.random() * 900 + 100)}`;
          }

          usedSkusInBatch.add(finalSku);

          await client.query(
            `INSERT INTO product_variants (
              product_id, variant_sku, color, size, material, price_modifier, image_url, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())`,
            [
              productId,
              finalSku,
              v.color || null,
              v.size || null,
              v.material || null,
              v.price_modifier ? parseFloat(v.price_modifier) : 0,
              v.image_url || null
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
/**
 * PUT /api/swm/products/:id
 * Update product master data & sync variants/images
 */
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const [old] = await query(`SELECT * FROM products WHERE id = $1`, [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    }

    const {
      product_name,
      product_code,
      barcode,
      category_id,
      sub_category_id,
      brand,
      color,
      size,
      material,
      cost_price,
      selling_price,
      wholesale_price,
      sale_price,
      status,
      is_ecom_listed,
      reorder_level,
      featured_image,
      color_images,
      variants
    } = req.body;

    // Check code uniqueness if changed
    if (product_code && product_code.trim().toUpperCase() !== old.product_code) {
      const cleanCode = product_code.trim().toUpperCase();
      const existing = await query(`SELECT id FROM products WHERE product_code = $1 AND id != $2`, [cleanCode, id]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'كود الصنف مسجل مسبقاً لصنف آخر' });
      }
    }

    await query(
      `UPDATE products SET
        product_name = COALESCE($1, product_name),
        product_code = COALESCE($2, product_code),
        barcode = COALESCE($3, barcode),
        category_id = COALESCE($4, category_id),
        sub_category_id = COALESCE($5, sub_category_id),
        brand = COALESCE($6, brand),
        color = COALESCE($7, color),
        size = COALESCE($8, size),
        material = COALESCE($9, material),
        cost_price = COALESCE($10, cost_price),
        selling_price = COALESCE($11, selling_price),
        wholesale_price = COALESCE($12, wholesale_price),
        sale_price = COALESCE($13, sale_price),
        status = COALESCE($14, status),
        is_ecom_listed = COALESCE($15, is_ecom_listed),
        reorder_level = COALESCE($16, reorder_level),
        featured_image = COALESCE($17, featured_image),
        updated_at = NOW()
       WHERE id = $18`,
      [
        product_name || null,
        product_code ? product_code.trim().toUpperCase() : null,
        barcode ? barcode.trim() : null,
        category_id || null,
        sub_category_id || null,
        brand || null,
        color || null,
        size || null,
        material || null,
        cost_price !== undefined ? parseFloat(cost_price) : null,
        selling_price !== undefined ? parseFloat(selling_price) : null,
        wholesale_price !== undefined ? parseFloat(wholesale_price) : null,
        sale_price !== undefined ? parseFloat(sale_price) : null,
        status || null,
        is_ecom_listed !== undefined ? Boolean(is_ecom_listed) : null,
        reorder_level !== undefined ? parseInt(reorder_level, 10) : null,
        featured_image !== undefined ? featured_image : null,
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

    // Update variant color images
    if (color_images && typeof color_images === 'object') {
      for (const [colorName, img] of Object.entries(color_images)) {
        if (img) {
          await query(
            `UPDATE product_variants SET image_url = $1, updated_at = NOW() WHERE product_id = $2 AND color = $3`,
            [img, id, colorName]
          );
        }
      }
    }

    // Sync and insert new variants if provided
    if (Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        const vColor = v.color ? String(v.color).trim() : null;
        const vSize = v.size ? String(v.size).trim() : null;
        const vImg = v.image_url || (vColor && color_images?.[vColor]) || null;

        const existingVar = await query(
          `SELECT id FROM product_variants 
           WHERE product_id = $1 
             AND (color = $2 OR (color IS NULL AND $2 IS NULL))
             AND (size = $3 OR (size IS NULL AND $3 IS NULL))`,
          [id, vColor, vSize]
        );

        if (existingVar.length > 0) {
          if (vImg) {
            await query(`UPDATE product_variants SET image_url = $1, updated_at = NOW() WHERE id = $2`, [vImg, existingVar[0].id]);
          }
        } else {
          const codePrefix = product_code || old.product_code;
          const cClean = vColor ? vColor.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'COL' : 'GEN';
          const sClean = vSize ? vSize.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'SIZ' : 'ONE';
          let newSku = `${codePrefix}-${cClean}-${sClean}`;
          const skuDup = await query(`SELECT id FROM product_variants WHERE variant_sku = $1`, [newSku]);
          if (skuDup.length > 0) newSku = `${newSku}-${Math.floor(Math.random() * 900 + 100)}`;

          await query(
            `INSERT INTO product_variants (product_id, variant_sku, color, size, image_url, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())`,
            [id, newSku, vColor, vSize, vImg]
          );
        }
      }
    }

    return res.json({ success: true, message: 'تم تحديث بيانات الصنف والمتغيرات والصور بنجاح' });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/products/:id/variants
 * Add a new variant (color, size, etc.) to an existing product
 */
router.post('/:id/variants', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { color, size, material, image_url } = req.body;

    const [prod] = await query(`SELECT * FROM products WHERE id = $1`, [id]);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    }

    const cleanColor = color ? String(color).trim() : null;
    const cleanSize = size ? String(size).trim() : null;

    if (!cleanColor && !cleanSize) {
      return res.status(400).json({ success: false, message: 'يجب تحديد لون أو مقاس للمتغير الجديد' });
    }

    // Check if this variant combination already exists for this product
    const existing = await query(
      `SELECT * FROM product_variants 
       WHERE product_id = $1 
         AND (color = $2 OR (color IS NULL AND $2 IS NULL)) 
         AND (size = $3 OR (size IS NULL AND $3 IS NULL))`,
      [id, cleanColor, cleanSize]
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'هذا المتغير موجود بالفعل',
        data: existing[0]
      });
    }

    // Generate SKU
    const cClean = cleanColor ? cleanColor.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || `C${Date.now().toString().slice(-3)}` : 'GEN';
    const sClean = cleanSize ? cleanSize.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || `S${Date.now().toString().slice(-2)}` : 'ONE';
    let baseSku = `${prod.product_code}-${cClean}-${sClean}`;
    let finalSku = baseSku;

    const skuCheck = await query(`SELECT id FROM product_variants WHERE variant_sku = $1`, [finalSku]);
    if (skuCheck.length > 0) {
      finalSku = `${finalSku}-${Math.floor(Math.random() * 900 + 100)}`;
    }

    const [newVariant] = await query(
      `INSERT INTO product_variants (
        product_id, variant_sku, color, size, material, price_modifier, image_url, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 0, $6, 'active', NOW(), NOW())
      RETURNING *`,
      [id, finalSku, cleanColor, cleanSize, material || null, image_url || null]
    );

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'CREATE_VARIANT',
      entityType: 'product_variants',
      entityId: newVariant.id,
      newValue: newVariant,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Added variant ${cleanColor || ''} / ${cleanSize || ''} to product ${prod.product_name}`
    });

    return res.json({
      success: true,
      message: 'تمت إضافة المتغير بنجاح للصنف',
      data: newVariant
    });
  } catch (err) {
    console.error('Error adding variant:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/swm/products/:id
 * Soft delete product (sets status to 'discontinued')
 */
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product is referenced in actual sales or purchase transactions
    const [purchaseItem] = await query(`SELECT id FROM purchase_invoice_items WHERE product_id = $1 LIMIT 1`, [id]);
    const [posItem] = await query(`SELECT id FROM swm_sales_invoice_items WHERE product_id = $1 LIMIT 1`, [id]);
    const [ecpItem] = await query(`SELECT id FROM ecp_order_items WHERE product_id = $1 LIMIT 1`, [id]);
    const [transferItem] = await query(`SELECT id FROM stock_transfer_items WHERE product_id = $1 LIMIT 1`, [id]);

    if (purchaseItem || posItem || ecpItem || transferItem) {
      // Soft-delete to preserve accounting integrity
      await query(`UPDATE products SET status = 'discontinued', updated_at = NOW() WHERE id = $1`, [id]);
      logActivity({
        userId: req.user.id,
        branchId: req.user.branchId,
        actionType: 'DELETE_PRODUCT',
        entityType: 'products',
        entityId: id,
        notes: `Product ${id} marked as discontinued (has transaction history)`
      });
      return res.json({ success: true, message: 'تم تعطيل الصنف بنجاح لحفظ سجل الحركات المالية والمبيعات' });
    }

    // Completely safe to delete
    await query(`DELETE FROM inventory_balances WHERE product_id = $1`, [id]);
    await query(`DELETE FROM product_variants WHERE product_id = $1`, [id]);
    await query(`DELETE FROM products WHERE id = $1`, [id]);

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'DELETE_PRODUCT',
      entityType: 'products',
      entityId: id,
      notes: `Product ${id} permanently deleted`
    });

    return res.json({ success: true, message: 'تم حذف الصنف نهائياً بنجاح' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
