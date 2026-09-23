const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * GET /api/swm/branches
 * List all active/configured branches
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const branches = await query(
      `SELECT b.*,
              u.full_name AS supervisor_name,
              COUNT(DISTINCT u2.id) AS staff_count
       FROM branches b
       LEFT JOIN users u ON u.id = b.supervisor_id
       LEFT JOIN users u2 ON u2.branch_id = b.id
       GROUP BY b.id, u.full_name
       ORDER BY b.id ASC`
    );
    return res.json({ success: true, data: branches });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/branches/:id
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(`SELECT * FROM branches WHERE id = $1`, [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/branches
 * Create a new branch / warehouse
 */
router.post('/', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { branch_code, branch_name, branch_type, address, phone, working_hours } = req.body;
    if (!branch_code || !branch_name) {
      return res.status(400).json({
        success: false,
        message: 'Branch code and branch name are required'
      });
    }

    const existing = await query(`SELECT id FROM branches WHERE branch_code = $1`, [branch_code]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Branch code already in use' });
    }

    const rows = await query(
      `INSERT INTO branches (branch_code, branch_name, branch_type, address, phone, working_hours, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())
       RETURNING id, branch_code, branch_name`,
      [
        branch_code.trim().toUpperCase(),
        branch_name.trim(),
        branch_type || 'retail_branch',
        address || null,
        phone || null,
        working_hours ? JSON.stringify(working_hours) : null
      ]
    );

    const newBranch = rows[0];

    logActivity({
      userId: req.user.id,
      branchId: newBranch.id,
      actionType: 'CREATE_BRANCH',
      entityType: 'branches',
      entityId: newBranch.id,
      newValue: { branch_code, branch_name, branch_type },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Branch ${branch_name} created`
    });

    return res.status(201).json({ success: true, data: newBranch });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/branches/:id
 * Update branch details
 */
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [old] = await query(`SELECT * FROM branches WHERE id = $1`, [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const { branch_name, branch_type, address, phone, supervisor_id, status } = req.body;

    await query(
      `UPDATE branches
       SET branch_name = COALESCE($1, branch_name),
           branch_type = COALESCE($2, branch_type),
           address = COALESCE($3, address),
           phone = COALESCE($4, phone),
           supervisor_id = COALESCE($5, supervisor_id),
           status = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $7`,
      [
        branch_name || null,
        branch_type || null,
        address || null,
        phone || null,
        supervisor_id || null,
        status || null,
        id
      ]
    );

    logActivity({
      userId: req.user.id,
      branchId: parseInt(id, 10),
      actionType: 'UPDATE_BRANCH',
      entityType: 'branches',
      entityId: id,
      oldValue: old,
      newValue: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Branch ${id} details updated`
    });

    return res.json({ success: true, message: 'Branch updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
