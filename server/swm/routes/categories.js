const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * GET /api/swm/categories
 * List all categories with parent hierarchy
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const categories = await query(
      `SELECT c.*, p.category_name AS parent_name
       FROM product_categories c
       LEFT JOIN product_categories p ON p.id = c.parent_id
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
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'content_manager']), async (req, res) => {
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
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'content_manager']), async (req, res) => {
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

module.exports = router;
