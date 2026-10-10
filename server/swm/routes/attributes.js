const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole, requireWarehousePermission } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

router.use(requireWarehousePermission('groups_items'));

/**
 * GET /api/swm/attributes
 * Fetch sizes and/or colors
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { type, status } = req.query;
    const whereClauses = [];
    const params = [];
    let pIdx = 1;

    if (type) {
      whereClauses.push(`attribute_type = $${pIdx}`);
      params.push(type.toLowerCase());
      pIdx++;
    }

    if (status) {
      whereClauses.push(`status = $${pIdx}`);
      params.push(status.toLowerCase());
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const attributes = await query(
      `SELECT * FROM product_attributes
       ${whereSql}
       ORDER BY display_order ASC, id ASC`,
      params
    );

    return res.json({ success: true, data: attributes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/attributes
 * Add new size or color
 */
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'content_manager', 'inventory_manager', 'warehouse_manager']), async (req, res) => {
  try {
    const { attribute_type, name, code, display_order } = req.body;
    if (!attribute_type || !['size', 'color'].includes(attribute_type.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'نوع الخاصية يجب أن يكون size أو color' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'اسم المقاس أو اللون مطلوب' });
    }

    const cleanName = name.trim();
    const cleanType = attribute_type.toLowerCase();

    // Check for duplicate
    const existing = await query(
      `SELECT id FROM product_attributes WHERE attribute_type = $1 AND LOWER(name) = LOWER($2)`,
      [cleanType, cleanName]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `هذا الـ (${cleanType === 'size' ? 'المقاس' : 'اللون'}) مسجل بالفعل مسبقاً` });
    }

    const rows = await query(
      `INSERT INTO product_attributes (attribute_type, name, code, display_order, status, created_at, updated_at)
       VALUES ($1, $2, $3, COALESCE($4, 0), 'active', NOW(), NOW())
       RETURNING *`,
      [cleanType, cleanName, code ? code.trim() : null, display_order || 0]
    );

    const newAttr = rows[0];

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'CREATE_ATTRIBUTE',
      entityType: 'product_attributes',
      entityId: newAttr.id,
      newValue: newAttr,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Added new ${cleanType}: ${cleanName}`
    });

    return res.status(201).json({ success: true, data: newAttr });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/attributes/:id
 * Update size or color
 */
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'content_manager', 'warehouse_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, display_order, status } = req.body;

    const [old] = await query(`SELECT * FROM product_attributes WHERE id = $1`, [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'الخاصية غير موجودة' });
    }

    await query(
      `UPDATE product_attributes
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           display_order = COALESCE($3, display_order),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $5`,
      [
        name ? name.trim() : null,
        code !== undefined ? code : null,
        display_order !== undefined ? parseInt(display_order, 10) : null,
        status || null,
        id
      ]
    );

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'UPDATE_ATTRIBUTE',
      entityType: 'product_attributes',
      entityId: id,
      oldValue: old,
      newValue: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'تم تحديث الخاصية بنجاح' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/swm/attributes/:id
 * Delete size or color
 */
router.delete('/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [attr] = await query(`SELECT * FROM product_attributes WHERE id = $1`, [id]);
    if (!attr) {
      return res.status(404).json({ success: false, message: 'الخاصية غير موجودة' });
    }

    await query(`DELETE FROM product_attributes WHERE id = $1`, [id]);

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'DELETE_ATTRIBUTE',
      entityType: 'product_attributes',
      entityId: id,
      oldValue: attr,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Deleted ${attr.attribute_type}: ${attr.name}`
    });

    return res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
