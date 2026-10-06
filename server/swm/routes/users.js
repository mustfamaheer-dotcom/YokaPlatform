const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../../shared/db');
const { requireAuth, requireRole, requireWarehousePermission } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

router.use(requireWarehousePermission('users'));

/**
 * GET /api/swm/users
 * Paginated staff list with branch name joins
 */
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'branch_account', 'salesperson', 'warehouse_manager']), async (req, res) => {
  try {
    const { role, branch_id, status, search, page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // If requester is a supervisor, salesperson, or retail branch account, restrict strictly to their own branch
    const isAdmin = ['super_admin', 'admin', 'warehouse_manager'].includes(req.user.role) || req.user.isMainWarehouse;
    const isSupervisor = req.user.role === 'supervisor';
    const isSalesperson = req.user.role === 'salesperson';
    const isRetailBranch = req.user.isBranchAccount && !isAdmin;

    const userBranchId = req.user.branchId || req.user.branch_id;
    const requestedBranchId = (branch_id && branch_id !== 'all' && branch_id !== 'unassigned') ? parseInt(branch_id, 10) : null;

    const effectiveBranchId = (!isAdmin && (isSupervisor || isSalesperson || isRetailBranch))
      ? userBranchId
      : requestedBranchId;

    let sql = `
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.national_id, u.role, u.branch_id,
             u.salary, u.hire_date, u.last_login, u.status, u.created_at, u.password_plain,
             b.branch_name, b.branch_code, b.branch_type
      FROM users u
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE 1=1
    `;
    const params = [];
    let pIdx = 1;

    if (role && role !== 'all') {
      sql += ` AND u.role = $${pIdx++}`;
      params.push(role);
    }
    if (isAdmin && branch_id === 'unassigned') {
      sql += ` AND u.branch_id IS NULL`;
    } else if (effectiveBranchId) {
      sql += ` AND u.branch_id = $${pIdx++}`;
      params.push(effectiveBranchId);
    }
    if (status && status !== 'all') {
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
router.get('/:id', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'warehouse_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.national_id, u.role,
              u.branch_id, u.salary, u.hire_date, u.last_login, u.status, u.created_at, u.password_plain,
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
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'warehouse_manager']), async (req, res) => {
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

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'اسم الموظف بالكامل حقل مطلوب'
      });
    }

    const effectiveRole = role || 'salesperson';
    const effectivePhone = phone ? phone.trim() : null;
    const effectivePassword = (password && password.trim()) ? password.trim() : '123456';

    let effectiveUsername = username ? username.trim() : '';
    if (!effectiveUsername) {
      if (effectivePhone) {
        effectiveUsername = effectivePhone.replace(/[^a-zA-Z0-9_]/g, '');
      } else {
        effectiveUsername = `emp_${Date.now().toString().slice(-6)}`;
      }
    }

    // Role elevation guard: only super_admin can create super_admin or admin accounts
    const ELEVATED_ROLES = ['super_admin', 'admin'];
    if (ELEVATED_ROLES.includes(effectiveRole) && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'فقط المدير العام (Super Admin) يملك صلاحية إنشاء حسابات إدارية جديدة.'
      });
    }

    // Ensure username uniqueness
    let finalUsername = effectiveUsername;
    let counter = 1;
    while (true) {
      const existing = await query(`SELECT id FROM users WHERE username = $1`, [finalUsername]);
      if (!existing.length) break;
      finalUsername = `${effectiveUsername}_${counter++}`;
    }

    const passwordHash = await bcrypt.hash(effectivePassword, 12);

    const rows = await query(
      `INSERT INTO users (
        username, email, password_hash, password_plain, full_name, phone, national_id,
        role, branch_id, salary, hire_date, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW(), NOW())
      RETURNING id, username, full_name, role, branch_id, salary, password_plain`,
      [
        finalUsername,
        email ? email.trim() : null,
        passwordHash,
        effectivePassword,
        full_name.trim(),
        effectivePhone,
        national_id || null,
        effectiveRole,
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

    return res.status(201).json({ success: true, data: newUser, message: 'تم إنشاء حساب الموظف بنجاح' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/users/:id
 * Update staff profile, branch, role, or active status
 */
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'warehouse_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const [old] = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'حساب المستخدم غير موجود' });
    }

    // Protection: only super_admin can modify another admin or super_admin
    if (['super_admin', 'admin'].includes(old.role) && req.user.role !== 'super_admin' && req.user.id !== old.id) {
      return res.status(403).json({
        success: false,
        message: 'لا تملك صلاحية تعديل بيانات حساب إداري.'
      });
    }

    const { full_name, phone, national_id, role, branch_id, salary, status, password } = req.body;

    let newHash = old.password_hash;
    let newPlain = old.password_plain;
    if (password && password.trim()) {
      newHash = await bcrypt.hash(password.trim(), 12);
      newPlain = password.trim();
    }

    const updatedRole = role !== undefined ? role : old.role;
    const updatedBranchId = branch_id !== undefined ? (branch_id ? parseInt(branch_id, 10) : null) : old.branch_id;
    const updatedFullName = full_name !== undefined ? full_name : old.full_name;
    const updatedPhone = phone !== undefined ? phone : old.phone;
    const updatedNationalId = national_id !== undefined ? national_id : old.national_id;
    const updatedSalary = salary !== undefined ? (salary ? parseFloat(salary) : null) : old.salary;
    const updatedStatus = status !== undefined ? status : old.status;

    await query(
      `UPDATE users
       SET full_name = $1,
           phone = $2,
           national_id = $3,
           role = $4,
           branch_id = $5,
           salary = $6,
           status = $7,
           password_hash = $8,
           password_plain = $9,
           updated_at = NOW()
       WHERE id = $10`,
      [
        updatedFullName,
        updatedPhone,
        updatedNationalId,
        updatedRole,
        updatedBranchId,
        updatedSalary,
        updatedStatus,
        newHash,
        newPlain,
        id
      ]
    );

    logActivity({
      userId: req.user.id,
      branchId: updatedBranchId,
      actionType: 'UPDATE_USER',
      entityType: 'users',
      entityId: id,
      oldValue: { role: old.role, branch_id: old.branch_id, status: old.status },
      newValue: { role: updatedRole, branch_id: updatedBranchId, status: updatedStatus },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.json({ success: true, message: 'تم تحديث بيانات المستخدم بنجاح' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
