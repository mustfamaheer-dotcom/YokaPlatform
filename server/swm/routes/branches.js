const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * GET /api/swm/branches
 * List all active/configured branches with login_username, login_password_plain, and staff count
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const branches = await query(
      `SELECT b.id, b.branch_code, b.branch_name, b.branch_type,
              b.login_username, b.login_password_plain,
              b.address, b.city, b.phone, b.google_maps_url, b.show_in_store, b.display_order,
              b.working_hours, b.supervisor_id, b.status, b.created_at, b.updated_at,
              u.full_name AS supervisor_name,
              COUNT(DISTINCT u2.id) AS staff_count
       FROM branches b
       LEFT JOIN users u ON u.id = b.supervisor_id
       LEFT JOIN users u2 ON u2.branch_id = b.id
       GROUP BY b.id, u.full_name
       ORDER BY b.display_order ASC, b.id ASC`
    );
    return res.json({ success: true, data: branches });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Helper: auto-generate next unique branch code
 */
async function generateNextBranchCode(branchType = 'retail_branch') {
  let prefix = 'BR';
  if (branchType === 'main_warehouse') prefix = 'WH';
  else if (branchType === 'ecom_warehouse') prefix = 'ECOM';

  const rows = await query(`SELECT branch_code FROM branches`);
  let maxNum = 0;
  for (const r of rows) {
    const code = String(r.branch_code || '').trim().toUpperCase();
    const match = code.match(new RegExp(`^${prefix}-(\\d+)`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  if (maxNum === 0) {
    maxNum = rows.length;
  }

  let nextNum = maxNum + 1;
  let candidate = `${prefix}-${String(nextNum).padStart(3, '0')}`;

  const existingSet = new Set(rows.map(r => String(r.branch_code || '').trim().toUpperCase()));
  while (existingSet.has(candidate)) {
    nextNum++;
    candidate = `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }

  return candidate;
}

/**
 * GET /api/swm/branches/next-code
 * Return the next automatically generated branch code
 */
router.get('/next-code', requireAuth, async (req, res) => {
  try {
    const { branch_type = 'retail_branch' } = req.query;
    const nextCode = await generateNextBranchCode(branch_type);
    return res.json({ success: true, next_code: nextCode });
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
    const rows = await query(
      `SELECT id, branch_code, branch_name, branch_type, login_username, login_password_plain,
              address, city, phone, google_maps_url, show_in_store, display_order,
              supervisor_id, status, working_hours, created_at, updated_at
        FROM branches WHERE id = $1`,
      [id]
    );
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
 * Create a new branch / warehouse with login credentials
 */
router.post('/', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const {
      branch_code,
      branch_name,
      branch_type,
      address,
      city,
      phone,
      google_maps_url,
      show_in_store,
      display_order,
      working_hours,
      login_username,
      username,
      password
    } = req.body;

    if (!branch_name || !branch_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'اسم الفرع حقل مطلوب'
      });
    }

    let branchCodeClean = (branch_code || '').trim().toUpperCase();
    if (!branchCodeClean) {
      branchCodeClean = await generateNextBranchCode(branch_type || 'retail_branch');
    }
    const branchUserClean = (login_username || username || '').trim();
    const branchPasswordClean = (password || '').trim();

    // Check branch_code uniqueness
    const existingCode = await query(`SELECT id FROM branches WHERE branch_code = $1`, [branchCodeClean]);
    if (existingCode.length) {
      return res.status(409).json({ success: false, message: 'كود الفرع مستخدم بالفعل' });
    }

    // Check login_username uniqueness if provided
    if (branchUserClean) {
      const existingUser = await query(`SELECT id FROM branches WHERE login_username = $1`, [branchUserClean]);
      if (existingUser.length) {
        return res.status(409).json({ success: false, message: 'اسم مستخدم الفرع مستخدم بالفعل لفرع آخر' });
      }
    }

    let passwordHash = null;
    if (branchPasswordClean) {
      passwordHash = await bcrypt.hash(branchPasswordClean, 12);
    }

    const rows = await query(
      `INSERT INTO branches (
        branch_code, branch_name, branch_type, address, city, phone, google_maps_url,
        show_in_store, display_order, working_hours,
        login_username, login_password_hash, login_password_plain, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', NOW(), NOW())
      RETURNING id, branch_code, branch_name, login_username, login_password_plain`,
      [
        branchCodeClean,
        branch_name.trim(),
        branch_type || 'retail_branch',
        address || null,
        city || null,
        phone || null,
        google_maps_url || null,
        show_in_store !== undefined ? Boolean(show_in_store) : (branch_type === 'retail_branch'),
        parseInt(display_order, 10) || 0,
        working_hours ? (typeof working_hours === 'object' ? JSON.stringify(working_hours) : String(working_hours)) : null,
        branchUserClean || null,
        passwordHash,
        branchPasswordClean || null
      ]
    );

    const newBranch = rows[0];

    // Auto-provision infrastructure for retail branches
    const effectiveBranchType = branch_type || 'retail_branch';
    if (effectiveBranchType === 'retail_branch') {
      try {
        // 1. Create a main cash register for the new branch
        const registerCode = `REG-${branchCodeClean}-01`;
        await query(
          `INSERT INTO cash_registers (register_code, branch_id, register_name, is_main, current_balance, opening_balance, status, created_at, updated_at)
           VALUES ($1, $2, $3, true, 0, 0, 'open', NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [registerCode, newBranch.id, `درج نقدية ${branch_name.trim()}`]
        );

        // 2. Create a branch safe with zero balances
        await query(
          `INSERT INTO branch_safes (branch_id, safe_name, cash_balance, visa_balance, transfer_balance)
           VALUES ($1, $2, 0, 0, 0)
           ON CONFLICT DO NOTHING`,
          [newBranch.id, `خزينة ${branch_name.trim()}`]
        );
      } catch (provisionErr) {
        console.error(`[Branch Creation] Auto-provision warning for branch #${newBranch.id}:`, provisionErr.message);
        // Non-blocking: branch is created even if provisioning partially fails
      }
    }

    logActivity({
      userId: req.user.id,
      branchId: newBranch.id,
      actionType: 'CREATE_BRANCH',
      entityType: 'branches',
      entityId: newBranch.id,
      newValue: { branch_code: branchCodeClean, branch_name, branch_type: effectiveBranchType, login_username: branchUserClean },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Branch ${branch_name} (${effectiveBranchType}) created with login username: ${branchUserClean || 'None'}`
    });

    return res.status(201).json({ success: true, data: newBranch, message: 'تم إنشاء الفرع وبيانات تسجيل الدخول بنجاح' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/branches/:id
 * Update branch details and login credentials
 */
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [old] = await query(`SELECT * FROM branches WHERE id = $1`, [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'الفرع غير موجود' });
    }

    const {
      branch_name,
      branch_type,
      address,
      city,
      phone,
      google_maps_url,
      show_in_store,
      display_order,
      working_hours,
      supervisor_id,
      status,
      login_username,
      username,
      password
    } = req.body;

    const newUsername = login_username !== undefined ? login_username : (username !== undefined ? username : old.login_username);

    // Validate login_username uniqueness if changed
    if (newUsername && newUsername.trim() && newUsername.trim() !== old.login_username) {
      const existingUser = await query(
        `SELECT id FROM branches WHERE login_username = $1 AND id != $2`,
        [newUsername.trim(), id]
      );
      if (existingUser.length) {
        return res.status(409).json({ success: false, message: 'اسم مستخدم الفرع مستخدم بالفعل لفرع آخر' });
      }
    }

    let newHash = old.login_password_hash;
    let newPlain = old.login_password_plain;
    if (password && password.trim()) {
      newHash = await bcrypt.hash(password.trim(), 12);
      newPlain = password.trim();
    }

    await query(
      `UPDATE branches
       SET branch_name = COALESCE($1, branch_name),
           branch_type = COALESCE($2, branch_type),
           address = $3,
           city = $4,
           phone = $5,
           google_maps_url = $6,
           show_in_store = CASE WHEN $7::boolean IS NOT NULL THEN $7::boolean ELSE show_in_store END,
           display_order = CASE WHEN $8::integer IS NOT NULL THEN $8::integer ELSE display_order END,
           working_hours = CASE WHEN $9::text IS NOT NULL THEN $9::text ELSE working_hours END,
           supervisor_id = $10,
           status = COALESCE($11, status),
           login_username = $12,
           login_password_hash = $13,
           login_password_plain = $14,
           updated_at = NOW()
       WHERE id = $15`,
      [
        branch_name || null,
        branch_type || null,
        address !== undefined ? (address || null) : old.address,
        city !== undefined ? (city || null) : old.city,
        phone !== undefined ? (phone || null) : old.phone,
        google_maps_url !== undefined ? (google_maps_url || null) : old.google_maps_url,
        show_in_store !== undefined ? Boolean(show_in_store) : null,
        display_order !== undefined ? parseInt(display_order, 10) : null,
        working_hours !== undefined ? (typeof working_hours === 'object' ? JSON.stringify(working_hours) : String(working_hours || '')) : null,
        supervisor_id !== undefined ? (supervisor_id ? parseInt(supervisor_id, 10) : null) : old.supervisor_id,
        status || null,
        newUsername ? newUsername.trim() : null,
        newHash,
        newPlain,
        id
      ]
    );

    logActivity({
      userId: req.user.id,
      branchId: parseInt(id, 10),
      actionType: 'UPDATE_BRANCH',
      entityType: 'branches',
      entityId: id,
      oldValue: { login_username: old.login_username, status: old.status },
      newValue: { login_username: newUsername, status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Branch ${id} details and credentials updated`
    });

    return res.json({ success: true, message: 'تم تحديث بيانات الفرع وبيانات تسجيل الدخول بنجاح' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/swm/branches/:id/toggle-store
 * Quick toggle for storefront visibility
 */
router.patch('/:id/toggle-store', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { show_in_store } = req.body;
    await query(
      `UPDATE branches SET show_in_store = $1, updated_at = NOW() WHERE id = $2`,
      [Boolean(show_in_store), id]
    );
    return res.json({ success: true, message: 'تم تحديث حالة عرض الفرع في المتجر' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
