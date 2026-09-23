const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * GET /api/swm/users
 * Paginated user list with branch name joins
 */
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'supervisor']), async (req, res) => {
  try {
    const { role, branch_id, status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let sql = `
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role, u.branch_id,
             u.salary, u.hire_date, u.last_login, u.status, u.created_at,
             b.branch_name, b.branch_code
      FROM users u
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE 1=1
    `;
    const params = [];
    let pIdx = 1;

    if (role) {
      sql += ` AND u.role = $${pIdx++}`;
      params.push(role);
    }
    if (branch_id) {
      sql += ` AND u.branch_id = $${pIdx++}`;
      params.push(branch_id);
    }
    if (status) {
      sql += ` AND u.status = $${pIdx++}`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (u.username ILIKE $${pIdx} OR u.full_name ILIKE $${pIdx} OR u.phone ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    sql += ` ORDER BY u.id DESC LIMIT ${parseInt(limit, 10)} OFFSET ${offset}`;

    const users = await query(sql, params);
    return res.json({ success: true, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/users/:id
 */
router.get('/:id', requireAuth, requireRole(['super_admin', 'admin', 'supervisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.national_id, u.role,
              u.branch_id, u.salary, u.hire_date, u.last_login, u.status, u.created_at,
              b.branch_name
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/users
 * Create user account with bcrypt password hashing
 */
router.post('/', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      full_name,
      phone,
      national_id,
      role,
      branch_id,
      salary,
      hire_date
    } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, full_name, and role are required'
      });
    }

    const existing = await query(
      `SELECT id FROM users WHERE username = $1 OR (email IS NOT NULL AND email = $2)`,
      [username.trim(), email ? email.trim() : null]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Username or email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const rows = await query(
      `INSERT INTO users (
        username, email, password_hash, full_name, phone, national_id,
        role, branch_id, salary, hire_date, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', NOW(), NOW())
      RETURNING id, username, full_name, role`,
      [
        username.trim(),
        email ? email.trim() : null,
        passwordHash,
        full_name.trim(),
        phone || null,
        national_id || null,
        role,
        branch_id ? parseInt(branch_id, 10) : null,
        salary ? parseFloat(salary) : null,
        hire_date || null
      ]
    );

    const newUser = rows[0];

    logActivity({
      userId: req.user.id,
      branchId: branch_id ? parseInt(branch_id, 10) : null,
      actionType: 'CREATE_USER',
      entityType: 'users',
      entityId: newUser.id,
      newValue: { username, role, branch_id, full_name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Staff user ${username} created with role ${role}`
    });

    return res.status(201).json({ success: true, data: newUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/users/:id
 * Update user profile or status
 */
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [old] = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { full_name, phone, role, branch_id, salary, status, password } = req.body;

    let newHash = old.password_hash;
    if (password && password.trim()) {
      newHash = await bcrypt.hash(password.trim(), 12);
    }

    await query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           role = COALESCE($3, role),
           branch_id = COALESCE($4, branch_id),
           salary = COALESCE($5, salary),
           status = COALESCE($6, status),
           password_hash = $7,
           updated_at = NOW()
       WHERE id = $8`,
      [
        full_name || null,
        phone || null,
        role || null,
        branch_id !== undefined ? branch_id : null,
        salary !== undefined ? salary : null,
        status || null,
        newHash,
        id
      ]
    );

    logActivity({
      userId: req.user.id,
      branchId: branch_id ? parseInt(branch_id, 10) : old.branch_id,
      actionType: 'UPDATE_USER',
      entityType: 'users',
      entityId: id,
      oldValue: { role: old.role, branch_id: old.branch_id, status: old.status },
      newValue: { role, branch_id, status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
