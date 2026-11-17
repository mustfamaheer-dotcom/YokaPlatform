const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireRole, requireWarehousePermission } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');
const redis = require('../../shared/redis');
const { persistDataUri, persistGalleryImagesJson } = require('../../shared/imageStore');
const { generateValidEAN13 } = require('../../shared/barcode');
const {
  getSafeColorCode,
  getSafeSizeCode,
  buildVariantSku,
  ensureUniqueVariantSku
} = require('../../shared/skuHelper');

/**
 * Checks if a product is referenced in historical transaction records or positive balances
 */
async function checkProductHistory(productId, executeQuery = query) {
  const checks = [
    `SELECT 1 FROM purchase_invoice_items WHERE product_id = $1 LIMIT 1`,
    `SELECT 1 FROM swm_sales_invoice_items WHERE product_id = $1 LIMIT 1`,
    `SELECT 1 FROM ecp_order_items WHERE product_id = $1 LIMIT 1`,
    `SELECT 1 FROM stock_transfer_items WHERE product_id = $1 LIMIT 1`,
    `SELECT 1 FROM stock_adjustment_items WHERE product_id = $1 LIMIT 1`,
    `SELECT 1 FROM purchase_return_items WHERE product_id = $1 LIMIT 1`,
    `SELECT 1 FROM inventory_movements WHERE product_id = $1 LIMIT 1`,
    `SELECT 1 FROM inventory_counts WHERE product_id = $1 LIMIT 1`,
    `SELECT 1 FROM inventory_balances WHERE product_id = $1 AND (available_qty > 0 OR reserved_qty > 0) LIMIT 1`
  ];

  for (const sql of checks) {
    try {
      const res = await executeQuery(sql, [productId]);
      const rows = res.rows || res;
      if (rows && rows.length > 0) {
        return true;
      }
    } catch (e) {
      // Table or column might not exist or error, continue checking
    }
  }
  return false;
}

/**
 * Checks if a variant is referenced in historical transaction records or positive balances
 */
async function checkVariantHistory(variantId, executeQuery = query) {
  const checks = [
    `SELECT 1 FROM purchase_invoice_items WHERE variant_id = $1 LIMIT 1`,
    `SELECT 1 FROM swm_sales_invoice_items WHERE variant_id = $1 LIMIT 1`,
    `SELECT 1 FROM ecp_order_items WHERE variant_id = $1 LIMIT 1`,
    `SELECT 1 FROM stock_transfer_items WHERE variant_id = $1 LIMIT 1`,
    `SELECT 1 FROM stock_adjustment_items WHERE variant_id = $1 LIMIT 1`,
    `SELECT 1 FROM purchase_return_items WHERE variant_id = $1 LIMIT 1`,
    `SELECT 1 FROM inventory_movements WHERE variant_id = $1 LIMIT 1`,
    `SELECT 1 FROM inventory_counts WHERE variant_id = $1 LIMIT 1`,
    `SELECT 1 FROM inventory_balances WHERE variant_id = $1 AND (available_qty > 0 OR reserved_qty > 0) LIMIT 1`
  ];

  for (const sql of checks) {
    try {
      const res = await executeQuery(sql, [variantId]);
      const rows = res.rows || res;
      if (rows && rows.length > 0) {
        return true;
      }
    } catch (e) {
      // Ignore
    }
  }
  return false;
}

router.use(requireWarehousePermission('groups_items'));

/**
 * GET /api/swm/products
 * Paginated list with category name and aggregated inventory stock
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 5000, search, category_id, branch_id, status } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(10000, parseInt(limit, 10) || 5000));
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
      if (status === 'archived' || status === 'discontinued') {
        whereClauses.push(`p.status IN ('archived', 'discontinued')`);
      } else {
        whereClauses.push(`p.status = $${pIdx}`);
        params.push(status);
        pIdx++;
      }
    } else if (!status) {
      // By default exclude discontinued/archived products unless explicitly asked for (status='all' or status='archived')
      whereClauses.push(`(p.status NOT IN ('discontinued', 'archived') OR p.status IS NULL)`);
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
             p.color AS base_color, p.size AS base_size,
             COALESCE(
               NULLIF(STRING_AGG(DISTINCT v.color, ' / ') FILTER (WHERE v.color IS NOT NULL AND v.color != ''), ''),
               p.color,
               ''
             ) AS color,
             COALESCE(
               NULLIF(STRING_AGG(DISTINCT v.size, ' / ') FILTER (WHERE v.size IS NOT NULL AND v.size != ''), ''),
               p.size,
               ''
             ) AS size,
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
 * GET /api/swm/products/stock-alerts
 * Dedicated stock alert dashboard endpoint:
 * Lists products based on inventory_balances:
 * a) Out of Stock: Quantity = 0
 * b) Low Stock: Remaining quantity of 2 pieces or fewer (1 <= Quantity <= 2)
 */
router.get('/stock-alerts', requireAuth, async (req, res) => {
  try {
    let branchId = req.query.branch_id;
    if (['salesperson', 'supervisor'].includes(req.user?.role) && req.user?.branchId) {
      branchId = req.user.branchId;
    }
    const targetBranchId = parseInt(branchId || req.user?.branchId || 1, 10);

    const { search, category_id, filter_type = 'all' } = req.query;

    const whereClauses = [
      `p.status = 'active'`,
      `COALESCE(ib.available_qty, 0) <= 2`
    ];
    const params = [targetBranchId];
    let pIdx = 2;

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

    if (filter_type === 'out_of_stock') {
      whereClauses.push(`COALESCE(ib.available_qty, 0) = 0`);
    } else if (filter_type === 'low_stock') {
      whereClauses.push(`COALESCE(ib.available_qty, 0) > 0 AND COALESCE(ib.available_qty, 0) <= 2`);
    }

    const whereSql = whereClauses.join(' AND ');

    const sql = `
      SELECT 
        p.id,
        p.product_name,
        p.product_code,
        p.barcode,
        p.cost_price,
        p.selling_price,
        COALESCE(c.category_name, 'عام') AS category_name,
        v.id AS variant_id,
        v.variant_sku,
        COALESCE(v.color, p.color) AS color,
        COALESCE(v.size, p.size) AS size,
        COALESCE(ib.available_qty, 0)::int AS system_qty,
        COALESCE(ib.reserved_qty, 0)::int AS reserved_qty,
        b.id AS branch_id,
        b.branch_name,
        CASE 
          WHEN COALESCE(ib.available_qty, 0) = 0 THEN 'out_of_stock'
          ELSE 'low_stock'
        END AS alert_type
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN product_variants v ON v.product_id = p.id
      LEFT JOIN inventory_balances ib ON ib.product_id = p.id
        AND (ib.variant_id = v.id OR (ib.variant_id IS NULL AND v.id IS NULL))
        AND ib.branch_id = $1
      LEFT JOIN branches b ON b.id = $1
      WHERE ${whereSql}
      ORDER BY COALESCE(ib.available_qty, 0) ASC, p.product_name ASC
    `;

    const items = await query(sql, params);

    // Global counts across the branch without search/filter restriction
    const [counts] = await query(`
      SELECT 
        COUNT(CASE WHEN COALESCE(ib.available_qty, 0) = 0 THEN 1 END)::int AS out_of_stock,
        COUNT(CASE WHEN COALESCE(ib.available_qty, 0) > 0 AND COALESCE(ib.available_qty, 0) <= 2 THEN 1 END)::int AS low_stock,
        COUNT(*)::int AS total_alerts
      FROM products p
      LEFT JOIN product_variants v ON v.product_id = p.id
      LEFT JOIN inventory_balances ib ON ib.product_id = p.id
        AND (ib.variant_id = v.id OR (ib.variant_id IS NULL AND v.id IS NULL))
        AND ib.branch_id = $1
      WHERE p.status = 'active'
        AND COALESCE(ib.available_qty, 0) <= 2
    `, [targetBranchId]);

    return res.json({
      success: true,
      data: {
        summary: {
          total_alerts: parseInt(counts?.total_alerts || 0, 10),
          out_of_stock_count: parseInt(counts?.out_of_stock || 0, 10),
          low_stock_count: parseInt(counts?.low_stock || 0, 10)
        },
        items
      }
    });
  } catch (err) {
    console.error('Stock alerts error:', err);
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
      if (ecomBranch) {
        targetBranchId = ecomBranch.id;
      } else {
        const [mainBranch] = await query(
          `SELECT id FROM branches WHERE branch_type = 'main_warehouse' ORDER BY id ASC LIMIT 1`
        );
        targetBranchId = mainBranch ? mainBranch.id : 1;
      }
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
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'warehouse_manager']), validate(createProductSchema), async (req, res) => {
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
      gallery_images = null,
      variants = []
    } = req.body;

    const persistedFeaturedImage = featured_image ? persistDataUri(featured_image) : null;
    const persistedGalleryImages = gallery_images ? persistGalleryImagesJson(gallery_images) : null;

    // Auto-generate code & barcode if not explicitly supplied
    const cleanCode = product_code
      ? String(product_code).trim().toUpperCase()
      : `PRD-${Date.now().toString().slice(-6)}`;

    const cleanBarcode = (barcode && /^\d{12,14}$/.test(String(barcode).trim()))
      ? String(barcode).trim()
      : generateValidEAN13('622');

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
          reorder_level, is_ecom_listed, featured_image, gallery_images, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, 'active', NOW(), NOW()
        ) RETURNING id`,
        [
          cleanCode,
          cleanBarcode,
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
          persistedFeaturedImage || null,
          persistedGalleryImages || null
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
            candidateSku = buildVariantSku(cleanCode, v.color, v.size, i, i);
          }
          const finalSku = await ensureUniqueVariantSku(client, candidateSku, usedSkusInBatch);

          // Inheritance Logic: If no variant-specific image is provided, inherit the model's featured_image
          const variantImage = (v.image_url ? persistDataUri(v.image_url) : null) || persistedFeaturedImage || null;

          const variantBarcode = (v.barcode && /^\d{12,14}$/.test(String(v.barcode).trim()))
            ? String(v.barcode).trim()
            : generateValidEAN13('622');

          await client.query(
            `INSERT INTO product_variants (
              product_id, variant_sku, barcode, color, size, material, price_modifier, image_url, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW(), NOW())`,
            [
              productId,
              finalSku,
              variantBarcode,
              v.color || null,
              v.size || null,
              v.material || null,
              v.price_modifier ? parseFloat(v.price_modifier) : 0,
              variantImage
            ]
          );
        }
      }

      return productId;
    });

    logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.fullName || req.user.username,
      actionUrl: '/dashboard/groups_items',
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
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'warehouse_manager']), async (req, res) => {
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
      gallery_images,
      color_images,
      variants
    } = req.body;

    const persistedFeaturedImage = featured_image !== undefined ? (persistDataUri(featured_image) || null) : undefined;
    const persistedGalleryImages = gallery_images !== undefined ? (persistGalleryImagesJson(gallery_images) || null) : undefined;

    // Check code uniqueness if changed
    const cleanCode = product_code ? product_code.trim().toUpperCase() : old.product_code;
    if (product_code && cleanCode !== old.product_code) {
      const existing = await query(`SELECT id FROM products WHERE product_code = $1 AND id != $2`, [cleanCode, id]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'كود الصنف مسجل مسبقاً لصنف آخر' });
      }
    }

    // Execute master product and variant synchronization inside a single database transaction
    await transaction(async (client) => {
      // 1. Update product master row
      await client.query(
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
          gallery_images = COALESCE($18, gallery_images),
          updated_at = NOW()
         WHERE id = $19`,
        [
          product_name || null,
          cleanCode || null,
          barcode ? (String(barcode).trim().replace(/\D/g, '') || null) : null,
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
          persistedFeaturedImage !== undefined ? persistedFeaturedImage : null,
          persistedGalleryImages !== undefined ? persistedGalleryImages : null,
          id
        ]
      );

      // Update variant color images if explicitly supplied
      if (color_images && typeof color_images === 'object') {
        for (const [colorName, img] of Object.entries(color_images)) {
          if (img) {
            const persistedImg = persistDataUri(img);
            await client.query(
              `UPDATE product_variants SET image_url = $1, updated_at = NOW() WHERE product_id = $2 AND color = $3`,
              [persistedImg, id, colorName]
            );
          }
        }
      }

      // 2. Synchronize product variants if variants array was provided
      if (Array.isArray(variants)) {
        const existingVarsRes = await client.query(
          `SELECT * FROM product_variants WHERE product_id = $1`,
          [id]
        );
        const existingVariants = existingVarsRes.rows || [];
        const usedSkusInBatch = new Set();
        const matchedExistingIds = new Set();

        // Process each incoming variant
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          const vColor = v.color ? String(v.color).trim() : null;
          const vSize = v.size ? String(v.size).trim() : null;
          const rawImg = v.image_url || (vColor && color_images?.[vColor]) || null;
          const vImg = rawImg ? persistDataUri(rawImg) : null;
          const vPriceMod = v.price_modifier !== undefined ? parseFloat(v.price_modifier) : 0;

          // Attempt match with existing variants
          // Priority 1: by variant ID
          let matchedVar = null;
          if (v.id) {
            matchedVar = existingVariants.find(ev => ev.id === parseInt(v.id, 10));
          }
          // Priority 2: by exact color and size match
          if (!matchedVar) {
            matchedVar = existingVariants.find(
              ev => !matchedExistingIds.has(ev.id) &&
                    (ev.color || null) === vColor &&
                    (ev.size || null) === vSize
            );
          }

          if (matchedVar) {
            matchedExistingIds.add(matchedVar.id);
            usedSkusInBatch.add(matchedVar.variant_sku);

            // Update matched existing variant - preserve existing ID & SKU!
            await client.query(
              `UPDATE product_variants SET
                color = $1,
                size = $2,
                material = COALESCE($3, material),
                price_modifier = $4,
                image_url = COALESCE($5, image_url),
                status = 'active',
                updated_at = NOW()
               WHERE id = $6`,
              [
                vColor,
                vSize,
                v.material || null,
                vPriceMod,
                vImg,
                matchedVar.id
              ]
            );
          } else {
            // New variant: generate unique SKU using skuHelper
            let candidateSku = v.sku ? String(v.sku).trim().toUpperCase() : null;
            if (!candidateSku) {
              candidateSku = buildVariantSku(cleanCode, vColor, vSize, i, i);
            }
            const finalSku = await ensureUniqueVariantSku(client, candidateSku, usedSkusInBatch);

            const vBarcode = (v.barcode && /^\d{12,14}$/.test(String(v.barcode).trim()))
              ? String(v.barcode).trim()
              : generateValidEAN13('622');

            await client.query(
              `INSERT INTO product_variants (
                product_id, variant_sku, barcode, color, size, material, price_modifier, image_url, status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW(), NOW())`,
              [
                id,
                finalSku,
                vBarcode,
                vColor,
                vSize,
                v.material || null,
                vPriceMod,
                vImg || persistedFeaturedImage || null
              ]
            );
          }
        }

        // Handle variants that were removed by the user
        const removedVariants = existingVariants.filter(ev => !matchedExistingIds.has(ev.id));
        for (const remVar of removedVariants) {
          const hasHistory = await checkVariantHistory(remVar.id, (sql, p) => client.query(sql, p));
          if (hasHistory) {
            // Soft-archive variant: keep record to preserve historical transactions and accounting integrity
            await client.query(
              `UPDATE product_variants SET status = 'inactive', updated_at = NOW() WHERE id = $1`,
              [remVar.id]
            );
          } else {
            // Completely safe to delete permanently
            await client.query(`DELETE FROM inventory_balances WHERE variant_id = $1`, [remVar.id]);
            await client.query(`DELETE FROM product_variants WHERE id = $1`, [remVar.id]);
          }
        }

        // Synchronize master product color and size summary
        const activeVariantsRes = await client.query(
          `SELECT DISTINCT color, size FROM product_variants WHERE product_id = $1 AND status = 'active'`,
          [id]
        );
        const activeRows = activeVariantsRes.rows || [];
        const activeColors = [...new Set(activeRows.map(r => r.color).filter(Boolean))].join(' / ');
        const activeSizes = [...new Set(activeRows.map(r => r.size).filter(Boolean))].join(' / ');

        await client.query(
          `UPDATE products SET color = $1, size = $2 WHERE id = $3`,
          [activeColors || color || null, activeSizes || size || null, id]
        );
      }
    });

    // Invalidate Redis caches
    try {
      const keys = await redis.keys('ecp:cache:*');
      if (keys && keys.length > 0) await redis.del(...keys);
      if (old.slug) await redis.del(`ecp:seo:product:${old.slug}`);
    } catch (e) {}

    const priceChanged = selling_price !== undefined && parseFloat(selling_price) !== parseFloat(old.selling_price);

    logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.fullName || req.user.username,
      actionUrl: '/dashboard/groups_items',
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
        : `Product ${id} updated with atomic variant synchronization`
    });

    return res.json({ success: true, message: 'تم تحديث بيانات الصنف والمتغيرات بنجاح' });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/swm/products/:id/price
 * Dedicated, audited endpoint for updating product selling/cost/wholesale/sale prices
 */
router.patch('/:id/price', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'warehouse_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { selling_price, cost_price, wholesale_price, sale_price, reason } = req.body;

    const [old] = await query(`SELECT * FROM products WHERE id = $1`, [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    }

    const newSelling = selling_price !== undefined ? parseFloat(selling_price) : parseFloat(old.selling_price);
    const newCost = cost_price !== undefined ? parseFloat(cost_price) : parseFloat(old.cost_price || 0);
    const newWholesale = wholesale_price !== undefined ? (wholesale_price ? parseFloat(wholesale_price) : null) : old.wholesale_price;
    const newSale = sale_price !== undefined ? (sale_price ? parseFloat(sale_price) : null) : old.sale_price;

    if (isNaN(newSelling) || newSelling <= 0) {
      return res.status(400).json({ success: false, message: 'سعر البيع يجب أن يكون رقماً أكبر من صفر' });
    }
    if (isNaN(newCost) || newCost < 0) {
      return res.status(400).json({ success: false, message: 'سعر التكلفة لا يمكن أن يكون سالباً' });
    }

    const [updated] = await query(
      `UPDATE products SET
        selling_price = $1,
        cost_price = $2,
        wholesale_price = $3,
        sale_price = $4,
        updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [newSelling, newCost, newWholesale, newSale, id]
    );

    // Audit activity log
    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'UPDATE_PRICE',
      entityType: 'products',
      entityId: id,
      oldValue: {
        selling_price: old.selling_price,
        cost_price: old.cost_price,
        wholesale_price: old.wholesale_price,
        sale_price: old.sale_price
      },
      newValue: {
        selling_price: newSelling,
        cost_price: newCost,
        wholesale_price: newWholesale,
        sale_price: newSale
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: reason || `تم تعديل سعر الصنف (${old.product_name || id}) إلى ${newSelling} ج.م`
    });

    // Invalidate Redis caches
    try {
      const redis = require('../../shared/redis');
      await redis.del(`ecp:seo:product:${old.slug}`);
      const catalogKeys = await redis.keys('ecp:catalog:*');
      if (catalogKeys.length > 0) await redis.del(catalogKeys);
    } catch (e) {}

    return res.json({
      success: true,
      message: 'تم تحديث واعتماد سعر الصنف بنجاح',
      data: updated
    });
  } catch (err) {
    console.error('Update price error:', err);
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

    // Generate SKU using skuHelper
    const baseCandidate = buildVariantSku(prod.product_code, cleanColor, cleanSize);
    const finalSku = await ensureUniqueVariantSku({ query }, baseCandidate, new Set());

    const persistedImageUrl = image_url ? persistDataUri(image_url) : null;
    const variantBarcode = (req.body.barcode && /^\d{12,14}$/.test(String(req.body.barcode).trim()))
      ? String(req.body.barcode).trim()
      : generateValidEAN13('622');

    const [newVariant] = await query(
      `INSERT INTO product_variants (
        product_id, variant_sku, barcode, color, size, material, price_modifier, image_url, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, 'active', NOW(), NOW())
      RETURNING *`,
      [id, finalSku, variantBarcode, cleanColor, cleanSize, material || null, persistedImageUrl]
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
 * Delete product permanently if no history, or archive if transaction history exists
 */
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [product] = await query(`SELECT id, product_name, status FROM products WHERE id = $1`, [id]);
    if (!product) {
      return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    }

    const hasHistory = await checkProductHistory(id);

    if (hasHistory) {
      // Soft-delete / Archive to preserve financial and inventory records
      await transaction(async (client) => {
        await client.query(`UPDATE products SET status = 'archived', updated_at = NOW() WHERE id = $1`, [id]);
        await client.query(`UPDATE product_variants SET status = 'inactive', updated_at = NOW() WHERE product_id = $1`, [id]);
      });

      // Invalidate caches
      try {
        const keys = await redis.keys('ecp:cache:*');
        if (keys && keys.length > 0) await redis.del(...keys);
      } catch (e) {}

      logActivity({
        userId: req.user.id,
        userRole: req.user.role,
        userName: req.user.fullName || req.user.username,
        actionUrl: '/dashboard/groups_items',
        branchId: req.user.branchId,
        actionType: 'ARCHIVE_PRODUCT',
        entityType: 'products',
        entityId: id,
        notes: `Product ${id} (${product.product_name}) archived due to transaction history`
      });

      return res.json({
        success: true,
        action: 'archived',
        message: `تم أرشفة وتعطيل الصنف "${product.product_name}" بنجاح لحفظ سجلات الحركات المالية والمبيعات`
      });
    }

    // Completely safe to delete permanently
    await transaction(async (client) => {
      await client.query(`DELETE FROM inventory_balances WHERE product_id = $1`, [id]);
      await client.query(`DELETE FROM product_variants WHERE product_id = $1`, [id]);
      await client.query(`DELETE FROM products WHERE id = $1`, [id]);
    });

    // Invalidate caches
    try {
      const keys = await redis.keys('ecp:cache:*');
      if (keys && keys.length > 0) await redis.del(...keys);
    } catch (e) {}

    logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.fullName || req.user.username,
      actionUrl: '/dashboard/groups_items',
      branchId: req.user.branchId,
      actionType: 'DELETE_PRODUCT',
      entityType: 'products',
      entityId: id,
      notes: `Product ${id} (${product.product_name}) permanently deleted`
    });

    return res.json({
      success: true,
      action: 'deleted',
      message: `تم حذف الصنف "${product.product_name}" نهائياً بنجاح لعدم وجود حركات أو أرصدة سابقة`
    });
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/products/:id/restore
 * Restore archived product and its variants to active status
 */
router.post('/:id/restore', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [product] = await query(`SELECT id, product_name, status FROM products WHERE id = $1`, [id]);
    if (!product) {
      return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    }

    if (product.status === 'active') {
      return res.json({ success: true, message: 'الصنف نشط بالفعل' });
    }

    await transaction(async (client) => {
      await client.query(`UPDATE products SET status = 'active', updated_at = NOW() WHERE id = $1`, [id]);
      await client.query(`UPDATE product_variants SET status = 'active', updated_at = NOW() WHERE product_id = $1`, [id]);
    });

    // Invalidate caches
    try {
      const keys = await redis.keys('ecp:cache:*');
      if (keys && keys.length > 0) await redis.del(...keys);
    } catch (e) {}

    logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.fullName || req.user.username,
      actionUrl: '/dashboard/groups_items',
      branchId: req.user.branchId,
      actionType: 'RESTORE_PRODUCT',
      entityType: 'products',
      entityId: id,
      notes: `Product ${id} (${product.product_name}) restored to active status`
    });

    return res.json({
      success: true,
      message: `تمت استعادة وتنشيط الصنف "${product.product_name}" بنجاح وإتاحته للعمليات`
    });
  } catch (err) {
    console.error('Restore product error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/products/bulk-delete
 * Bulk delete or archive selected products safely
 */
router.post('/bulk-delete', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد الأصناف المراد حذفها' });
    }

    const numericIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0);
    if (numericIds.length === 0) {
      return res.status(400).json({ success: false, message: 'معرفات الأصناف غير صحيحة' });
    }

    let deletedCount = 0;
    let archivedCount = 0;

    await transaction(async (client) => {
      for (const prodId of numericIds) {
        const hasHistory = await checkProductHistory(prodId, (sql, p) => client.query(sql, p));
        if (hasHistory) {
          await client.query(`UPDATE products SET status = 'archived', updated_at = NOW() WHERE id = $1`, [prodId]);
          await client.query(`UPDATE product_variants SET status = 'inactive', updated_at = NOW() WHERE product_id = $1`, [prodId]);
          archivedCount++;
        } else {
          await client.query(`DELETE FROM inventory_balances WHERE product_id = $1`, [prodId]);
          await client.query(`DELETE FROM product_variants WHERE product_id = $1`, [prodId]);
          await client.query(`DELETE FROM products WHERE id = $1`, [prodId]);
          deletedCount++;
        }
      }
    });

    // Invalidate caches
    try {
      const keys = await redis.keys('ecp:cache:*');
      if (keys && keys.length > 0) await redis.del(...keys);
    } catch (e) {}

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'BULK_DELETE_PRODUCTS',
      entityType: 'products',
      notes: `Bulk processed ${numericIds.length} products: ${deletedCount} deleted, ${archivedCount} archived`
    });

    return res.json({
      success: true,
      message: `تمت معالجة حذف ${numericIds.length} صنف: (حذف نهائي: ${deletedCount}، أرشفة وتعطيل: ${archivedCount})`,
      data: { deletedCount, archivedCount, total: numericIds.length }
    });
  } catch (err) {
    console.error('Bulk delete products error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
