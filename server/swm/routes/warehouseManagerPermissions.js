const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * GET /api/swm/wm-permissions/:userId
 * Get warehouse manager granular permissions
 */
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = parseInt(userId, 10);

    const isSelf = req.user.id === targetUserId;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بعرض هذه الصلاحيات.' });
    }

    const rows = await query(
      `SELECT * FROM warehouse_manager_permissions WHERE user_id = $1 LIMIT 1`,
      [targetUserId]
    );

    if (rows.length > 0) {
      return res.json({ success: true, data: rows[0] });
    }

    // Check if user exists and is a warehouse_manager
    const userRows = await query(`SELECT id, role, username FROM users WHERE id = $1 LIMIT 1`, [targetUserId]);
    if (!userRows.length) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
    }

    // Auto-create default permissions
    const created = await query(
      `INSERT INTO warehouse_manager_permissions (
        user_id, perm_pos, perm_daily_shift, perm_branches_daily,
        perm_groups_items, perm_stock_audit, perm_transfers,
        perm_purchases, perm_suppliers,
        perm_payroll, perm_treasury,
        perm_branches, perm_users
      ) VALUES ($1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
      RETURNING *`,
      [targetUserId]
    );

    return res.json({ success: true, data: created[0] });
  } catch (err) {
    console.error('Error fetching WM permissions:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/wm-permissions/:userId
 * Update warehouse manager granular permissions (Admin & Super Admin only)
 */
router.put('/:userId', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = parseInt(userId, 10);

    const {
      perm_pos,
      perm_daily_shift,
      perm_branches_daily,
      perm_groups_items,
      perm_stock_audit,
      perm_transfers,
      perm_purchases,
      perm_suppliers,
      perm_payroll,
      perm_treasury,
      perm_branches,
      perm_users
    } = req.body;

    const existingRows = await query(
      `SELECT * FROM warehouse_manager_permissions WHERE user_id = $1 LIMIT 1`,
      [targetUserId]
    );

    let updatedPerms;
    if (existingRows.length > 0) {
      const current = existingRows[0];
      const updated = await query(
        `UPDATE warehouse_manager_permissions
         SET perm_pos = $1,
             perm_daily_shift = $2,
             perm_branches_daily = $3,
             perm_groups_items = $4,
             perm_stock_audit = $5,
             perm_transfers = $6,
             perm_purchases = $7,
             perm_suppliers = $8,
             perm_payroll = $9,
             perm_treasury = $10,
             perm_branches = $11,
             perm_users = $12,
             updated_at = NOW()
         WHERE user_id = $13
         RETURNING *`,
        [
          perm_pos !== undefined ? Boolean(perm_pos) : current.perm_pos,
          perm_daily_shift !== undefined ? Boolean(perm_daily_shift) : current.perm_daily_shift,
          perm_branches_daily !== undefined ? Boolean(perm_branches_daily) : current.perm_branches_daily,
          perm_groups_items !== undefined ? Boolean(perm_groups_items) : current.perm_groups_items,
          perm_stock_audit !== undefined ? Boolean(perm_stock_audit) : current.perm_stock_audit,
          perm_transfers !== undefined ? Boolean(perm_transfers) : current.perm_transfers,
          perm_purchases !== undefined ? Boolean(perm_purchases) : current.perm_purchases,
          perm_suppliers !== undefined ? Boolean(perm_suppliers) : current.perm_suppliers,
          perm_payroll !== undefined ? Boolean(perm_payroll) : current.perm_payroll,
          perm_treasury !== undefined ? Boolean(perm_treasury) : current.perm_treasury,
          perm_branches !== undefined ? Boolean(perm_branches) : current.perm_branches,
          perm_users !== undefined ? Boolean(perm_users) : current.perm_users,
          targetUserId
        ]
      );
      updatedPerms = updated[0];
    } else {
      const inserted = await query(
        `INSERT INTO warehouse_manager_permissions (
          user_id, perm_pos, perm_daily_shift, perm_branches_daily,
          perm_groups_items, perm_stock_audit, perm_transfers,
          perm_purchases, perm_suppliers,
          perm_payroll, perm_treasury,
          perm_branches, perm_users
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          targetUserId,
          perm_pos !== undefined ? Boolean(perm_pos) : true,
          perm_daily_shift !== undefined ? Boolean(perm_daily_shift) : true,
          perm_branches_daily !== undefined ? Boolean(perm_branches_daily) : true,
          perm_groups_items !== undefined ? Boolean(perm_groups_items) : true,
          perm_stock_audit !== undefined ? Boolean(perm_stock_audit) : true,
          perm_transfers !== undefined ? Boolean(perm_transfers) : true,
          perm_purchases !== undefined ? Boolean(perm_purchases) : true,
          perm_suppliers !== undefined ? Boolean(perm_suppliers) : true,
          perm_payroll !== undefined ? Boolean(perm_payroll) : true,
          perm_treasury !== undefined ? Boolean(perm_treasury) : true,
          perm_branches !== undefined ? Boolean(perm_branches) : true,
          perm_users !== undefined ? Boolean(perm_users) : true
        ]
      );
      updatedPerms = inserted[0];
    }

    logActivity({
      userId: req.user.id,
      actionType: 'UPDATE_WAREHOUSE_MANAGER_PERMISSIONS',
      entityType: 'warehouse_manager_permissions',
      entityId: targetUserId,
      newValue: updatedPerms,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Admin updated permissions for warehouse manager (User ID: ${targetUserId})`
    });

    return res.json({
      success: true,
      data: updatedPerms,
      message: 'تم تحديث صلاحيات مدير المخازن بنجاح'
    });
  } catch (err) {
    console.error('Error updating WM permissions:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
