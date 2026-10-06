const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole, requireWarehousePermission } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

router.use(requireWarehousePermission('groups_items'));

/**
 * GET /api/swm/categories
 * List all categories with parent hierarchy
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const categories = await query(
      `SELECT c.*, p.category_name AS parent_name,
              COUNT(pr.id)::int AS products_count
       FROM product_categories c
       LEFT JOIN product_categories p ON p.id = c.parent_id
       LEFT JOIN products pr ON pr.category_id = c.id
       GROUP BY c.id, p.category_name
       ORDER BY c.display_order ASC, c.id ASC`
    );
    return res.json({ success: true, data: categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/categories
 * Create new category
 */
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'content_manager', 'warehouse_manager']), async (req, res) => {
  try {
    const { category_name, slug, parent_id, description, image_url, display_order, is_ecom_visible } = req.body;
    if (!category_name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const generatedSlug = (slug || category_name)
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `cat-${Date.now()}`;

    const rows = await query(
      `INSERT INTO product_categories (
        category_name, slug, parent_id, description, image_url,
        display_order, is_ecom_visible, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
      RETURNING id, category_name, slug`,
      [
        category_name.trim(),
        generatedSlug,
        parent_id ? parseInt(parent_id, 10) : null,
        description || null,
        image_url || null,
        display_order || 0,
        is_ecom_visible !== undefined ? Boolean(is_ecom_visible) : true
      ]
    );

    const newCat = rows[0];

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'CREATE_CATEGORY',
      entityType: 'product_categories',
      entityId: newCat.id,
      newValue: { category_name, slug: generatedSlug },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(201).json({ success: true, data: newCat });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/categories/:id
 */
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'content_manager', 'warehouse_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const [old] = await query(`SELECT * FROM product_categories WHERE id = $1`, [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { category_name, slug, parent_id, description, image_url, display_order, is_ecom_visible, status } = req.body;

    await query(
      `UPDATE product_categories
       SET category_name = COALESCE($1, category_name),
           slug = COALESCE($2, slug),
           parent_id = COALESCE($3, parent_id),
           description = COALESCE($4, description),
           image_url = COALESCE($5, image_url),
           display_order = COALESCE($6, display_order),
           is_ecom_visible = COALESCE($7, is_ecom_visible),
           status = COALESCE($8, status),
           updated_at = NOW()
       WHERE id = $9`,
      [
        category_name || null,
        slug || null,
        parent_id !== undefined ? parent_id : null,
        description || null,
        image_url || null,
        display_order !== undefined ? display_order : null,
        is_ecom_visible !== undefined ? is_ecom_visible : null,
        status || null,
        id
      ]
    );

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'UPDATE_CATEGORY',
      entityType: 'product_categories',
      entityId: id,
      oldValue: old,
      newValue: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'Category updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/swm/categories/:id
 */
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'content_manager', 'inventory_manager', 'warehouse_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const [cat] = await query(`SELECT * FROM product_categories WHERE id = $1`, [id]);
    if (!cat) {
      return res.status(404).json({ success: false, message: 'المجموعة غير موجودة' });
    }

    const prods = await query(`SELECT id, product_name FROM products WHERE category_id = $1`, [id]);
    const cnt = prods.length;

    // Process each product belonging to this category
    for (const prod of prods) {
      const [purchaseItem] = await query(`SELECT id FROM purchase_invoice_items WHERE product_id = $1 LIMIT 1`, [prod.id]);
      const [posItem] = await query(`SELECT id FROM swm_sales_invoice_items WHERE product_id = $1 LIMIT 1`, [prod.id]);
      const [ecpItem] = await query(`SELECT id FROM ecp_order_items WHERE product_id = $1 LIMIT 1`, [prod.id]);
      const [transferItem] = await query(`SELECT id FROM stock_transfer_items WHERE product_id = $1 LIMIT 1`, [prod.id]);

      if (purchaseItem || posItem || ecpItem || transferItem) {
        // Soft delete to protect financial/sales records
        await query(`UPDATE products SET status = 'discontinued', category_id = NULL, updated_at = NOW() WHERE id = $1`, [prod.id]);
      } else {
        // Completely safe to permanently delete
        await query(`DELETE FROM inventory_balances WHERE product_id = $1`, [prod.id]);
        await query(`DELETE FROM product_variants WHERE product_id = $1`, [prod.id]);
        await query(`DELETE FROM products WHERE id = $1`, [prod.id]);
      }
    }

    // Unlink child categories and delete the category
    await query(`UPDATE product_categories SET parent_id = NULL WHERE parent_id = $1`, [id]);
    await query(`DELETE FROM product_categories WHERE id = $1`, [id]);

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'DELETE_CATEGORY',
      entityType: 'product_categories',
      entityId: id,
      oldValue: cat,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Category ${cat.category_name} deleted (and its ${cnt} products removed/discontinued)`
    });

    return res.json({
      success: true,
      message: cnt > 0
        ? `تم حذف المجموعة وحذف/تعطيل (${cnt}) صنف تابعة لها بنجاح`
        : 'تم حذف المجموعة بنجاح'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
