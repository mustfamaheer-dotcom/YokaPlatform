const router = require('express').Router();
const { query } = require('../../shared/db');
const redis = require('../../shared/redis');

// Online fulfillment branch (defaults to branch 1 or 2)
const ONLINE_BRANCH_ID = parseInt(process.env.ONLINE_BRANCH_ID || '1', 10);

/**
 * GET /api/ecp/categories
 * Public product categories with active product counts
 */
router.get('/categories', async (req, res) => {
  try {
    const cacheKey = 'ecp:cache:categories';
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return res.json({ success: true, data: JSON.parse(cached), fromCache: true });
      } catch (e) {}
    }

    const categories = await query(`
      SELECT c.id, c.category_name, c.slug, c.description, c.image_url,
             COUNT(p.id) AS products_count
      FROM product_categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active' AND p.is_ecom_listed = true
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.display_order ASC, c.category_name ASC
    `);

    await redis.setex(cacheKey, 300, JSON.stringify(categories));
    return res.json({ success: true, data: categories });
  } catch (err) {
    console.error('ECP categories error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/ecp/catalog
 * Public paginated catalog with faceted filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      category_id,
      brand,
      min_price,
      max_price,
      color,
      size,
      search,
      sort = 'newest'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(60, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Cache key for common queries
    const queryHash = JSON.stringify({ pageNum, limitNum, category, category_id, brand, min_price, max_price, color, size, search, sort });
    const cacheKey = `ecp:cache:catalog:${Buffer.from(queryHash).toString('base64').slice(0, 32)}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return res.json({ ...JSON.parse(cached), fromCache: true });
      } catch (e) {}
    }

    const whereClauses = [`p.status = 'active'`, `p.is_ecom_listed = true`];
    const params = [ONLINE_BRANCH_ID];
    let pIdx = 2;

    if (search && search.trim()) {
      whereClauses.push(`(p.product_name ILIKE $${pIdx} OR p.product_code ILIKE $${pIdx} OR p.brand ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (category_id) {
      whereClauses.push(`p.category_id = $${pIdx}`);
      params.push(parseInt(category_id, 10));
      pIdx++;
    } else if (category) {
      whereClauses.push(`c.slug = $${pIdx}`);
      params.push(category.trim());
      pIdx++;
    }

    if (brand && brand.trim()) {
      whereClauses.push(`p.brand ILIKE $${pIdx}`);
      params.push(`%${brand.trim()}%`);
      pIdx++;
    }

    if (min_price) {
      whereClauses.push(`COALESCE(p.sale_price, p.selling_price) >= $${pIdx}`);
      params.push(parseFloat(min_price));
      pIdx++;
    }

    if (max_price) {
      whereClauses.push(`COALESCE(p.sale_price, p.selling_price) <= $${pIdx}`);
      params.push(parseFloat(max_price));
      pIdx++;
    }

    if (color && color.trim()) {
      whereClauses.push(`EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.color ILIKE $${pIdx})`);
      params.push(color.trim());
      pIdx++;
    }

    if (size && size.trim()) {
      whereClauses.push(`EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.size ILIKE $${pIdx})`);
      params.push(size.trim());
      pIdx++;
    }

    // Sort mappings
    let orderSql = 'p.id DESC';
    if (sort === 'price_asc') {
      orderSql = 'effective_price ASC, p.id DESC';
    } else if (sort === 'price_desc') {
      orderSql = 'effective_price DESC, p.id DESC';
    } else if (sort === 'popular') {
      orderSql = 'p.total_sold DESC, p.id DESC';
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count
    const countSql = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      ${whereSql}
    `;
    const [countResult] = await query(countSql, params.slice(1));
    const total = parseInt(countResult?.total || 0, 10);

    // Products list with calculated available stock
    const dataSql = `
      SELECT p.id,
             p.product_code,
             p.barcode,
             p.product_name,
             p.slug,
             p.brand,
             p.selling_price,
             p.sale_price,
             COALESCE(p.sale_price, p.selling_price) AS effective_price,
             p.featured_image,
             p.gallery_images,
             p.is_featured,
             p.rating_count,
             p.average_rating,
             p.created_at,
             c.id AS category_id,
             c.category_name,
             c.slug AS category_slug,
             COALESCE(SUM(ib.available_qty), 0) AS total_stock,
             COUNT(DISTINCT v.id) AS variants_count
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN product_variants v ON v.product_id = p.id AND v.status = 'active'
      LEFT JOIN inventory_balances ib ON ib.product_id = p.id AND ib.branch_id = $1
      ${whereSql}
      GROUP BY p.id, c.id, c.category_name, c.slug
      ORDER BY ${orderSql}
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const products = await query(dataSql, params);

    // Fetch variant options for card previews
    if (products.length > 0) {
      const pIds = products.map((p) => p.id);
      const variants = await query(
        `SELECT id, product_id, variant_sku, color, size, price_modifier
         FROM product_variants
         WHERE product_id = ANY($1) AND status = 'active'
         ORDER BY id ASC`,
        [pIds]
      );

      const variantMap = {};
      for (const v of variants) {
        if (!variantMap[v.product_id]) variantMap[v.product_id] = [];
        variantMap[v.product_id].push(v);
      }

      for (const p of products) {
        p.variants = variantMap[p.id] || [];
        p.colors = [...new Set(p.variants.map((v) => v.color).filter(Boolean))];
        p.sizes = [...new Set(p.variants.map((v) => v.size).filter(Boolean))];
      }
    }

    const payload = {
      success: true,
      data: products,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };

    // Cache results for 120 seconds
    await redis.setex(cacheKey, 120, JSON.stringify(payload));
    return res.json(payload);
  } catch (err) {
    console.error('ECP catalog error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/ecp/catalog/:slug
 * Detailed product view with full variants matrix and stock
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Check slug or ID
    const isId = /^\d+$/.test(slug);
    const whereCondition = isId ? 'p.id = $2' : 'p.slug = $2';

    const [product] = await query(
      `SELECT p.*,
              c.category_name,
              c.slug AS category_slug,
              COALESCE(p.sale_price, p.selling_price) AS effective_price,
              COALESCE(ib_base.available_qty, 0) AS base_stock
       FROM products p
       LEFT JOIN product_categories c ON c.id = p.category_id
       LEFT JOIN inventory_balances ib_base ON ib_base.product_id = p.id
                                           AND ib_base.variant_id IS NULL
                                           AND ib_base.branch_id = $1
       WHERE ${whereCondition} AND p.status = 'active'`,
      [ONLINE_BRANCH_ID, isId ? parseInt(slug, 10) : slug]
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Query variants with branch-level inventory
    const variants = await query(
      `SELECT v.*,
              COALESCE(ib.available_qty, $3) AS available_qty
       FROM product_variants v
       LEFT JOIN inventory_balances ib ON ib.product_id = v.product_id
                                      AND ib.variant_id = v.id
                                      AND ib.branch_id = $1
       WHERE v.product_id = $2 AND v.status = 'active'
       ORDER BY v.id ASC`,
      [ONLINE_BRANCH_ID, product.id, product.base_stock]
    );

    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];

    // Compute total available stock
    const totalStock = variants.length > 0
      ? variants.reduce((sum, v) => sum + parseInt(v.available_qty || 0, 10), 0)
      : parseInt(product.base_stock, 10);

    return res.json({
      success: true,
      data: {
        ...product,
        total_stock: totalStock,
        variants,
        colors,
        sizes
      }
    });
  } catch (err) {
    console.error('ECP product detail error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
