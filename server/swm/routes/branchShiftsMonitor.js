const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');

const MONITOR_ROLES = ['super_admin', 'admin', 'warehouse_manager', 'manager'];

/**
 * Branch Shifts & Store Operations Monitor Routes
 * Accessible to super_admin, admin, warehouse_manager, and manager
 */

// 1. GET /api/swm/branch-shifts-monitor/kpis
router.get('/kpis', requireAuth, requireRole(MONITOR_ROLES), async (req, res) => {
  try {
    const [branchesCount] = await query(`SELECT COUNT(*) AS total FROM branches WHERE status = 'active'`);

    // Count open branches: branch with active pos_shift OR open cash_register OR active login in last 16h
    const openBranchesRes = await query(`
      SELECT COUNT(DISTINCT b.id) AS total
      FROM branches b
      LEFT JOIN pos_shifts ps ON ps.branch_id = b.id AND ps.status = 'open'
      LEFT JOIN cash_registers cr ON cr.branch_id = b.id AND cr.status IN ('open', 'active')
      LEFT JOIN LATERAL (
        SELECT action_type, created_at
        FROM activity_logs al
        WHERE al.branch_id = b.id
          AND al.action_type IN ('LOGIN', 'BRANCH_LOGIN', 'BRANCH_STAFF_LOGIN', 'BRANCH_SUPERVISOR_LOGIN', 'ADMIN_WAREHOUSE_LOGIN', 'LOGOUT')
        ORDER BY al.id DESC
        LIMIT 1
      ) latest_log ON true
      WHERE b.status = 'active'
        AND (
          ps.id IS NOT NULL
          OR cr.id IS NOT NULL
          OR (latest_log.action_type IS NOT NULL AND latest_log.action_type != 'LOGOUT' AND latest_log.created_at >= NOW() - INTERVAL '16 hours')
        )
    `);

    // Live sales from swm_sales_invoices (current operational day / last 24 hours)
    const [todaySales] = await query(`
      SELECT COALESCE(SUM(final_amount), 0) AS total_sales,
             COUNT(*) AS invoices_count
      FROM swm_sales_invoices
      WHERE invoice_date >= (CURRENT_DATE - INTERVAL '1 day')
         OR created_at >= (NOW() - INTERVAL '24 hours')
    `);

    // Today's login activity count (current operational day / last 24 hours)
    const [todayLogins] = await query(`
      SELECT COUNT(*) AS total
      FROM activity_logs
      WHERE action_type IN ('LOGIN', 'BRANCH_LOGIN', 'BRANCH_STAFF_LOGIN', 'BRANCH_SUPERVISOR_LOGIN', 'ADMIN_WAREHOUSE_LOGIN')
        AND created_at >= (NOW() - INTERVAL '24 hours')
    `);

    return res.json({
      success: true,
      data: {
        totalBranches: parseInt(branchesCount?.total || 0, 10),
        activeShiftsCount: parseInt(openBranchesRes[0]?.total || 0, 10),
        todaySales: parseFloat(todaySales?.total_sales || 0),
        todayInvoices: parseInt(todaySales?.invoices_count || 0, 10),
        todayLoginsCount: parseInt(todayLogins?.total || 0, 10)
      }
    });
  } catch (err) {
    console.error('Operations KPIs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch operations KPIs' });
  }
});

// 2. GET /api/swm/branch-shifts-monitor/live-branches
router.get('/live-branches', requireAuth, requireRole(MONITOR_ROLES), async (req, res) => {
  try {
    const branches = await query(`
      SELECT b.id, b.branch_code, b.branch_name, b.branch_type, b.city, b.phone, b.working_hours, b.status,
             bs.cash_balance AS safe_cash_balance,
             bs.visa_balance AS safe_visa_balance,
             bs.transfer_balance AS safe_transfer_balance,
             ps.id AS active_shift_id,
             ps.shift_code AS active_shift_code,
             ps.opened_at AS active_shift_opened_at,
             ps.opening_float AS active_shift_float,
             ps.gross_sales_total AS active_shift_sales,
             u.full_name AS shift_cashier_name,
             u.username AS shift_cashier_username,
             cr.status AS register_status,
             latest_log.action_type AS last_action_type,
             latest_log.created_at AS last_action_time,
             latest_log.notes AS last_action_notes,
             latest_log.user_full_name AS last_action_user
      FROM branches b
      LEFT JOIN branch_safes bs ON bs.branch_id = b.id
      LEFT JOIN (
        SELECT DISTINCT ON (branch_id) * FROM pos_shifts WHERE status = 'open' ORDER BY branch_id, id DESC
      ) ps ON ps.branch_id = b.id
      LEFT JOIN users u ON u.id = ps.opened_by
      LEFT JOIN (
        SELECT DISTINCT ON (branch_id) branch_id, status FROM cash_registers ORDER BY branch_id, id DESC
      ) cr ON cr.branch_id = b.id
      LEFT JOIN LATERAL (
        SELECT al.action_type, al.created_at, al.notes,
               COALESCE(lu.full_name, lu.username, al.notes) AS user_full_name
        FROM activity_logs al
        LEFT JOIN users lu ON lu.id = al.user_id
        WHERE al.branch_id = b.id
          AND al.action_type IN ('LOGIN', 'BRANCH_LOGIN', 'BRANCH_STAFF_LOGIN', 'BRANCH_SUPERVISOR_LOGIN', 'ADMIN_WAREHOUSE_LOGIN', 'LOGOUT', 'POS_SESSION_OPEN', 'POS_SESSION_CLOSE')
        ORDER BY al.id DESC
        LIMIT 1
      ) latest_log ON true
      WHERE b.status = 'active'
      ORDER BY b.display_order ASC, b.id ASC
    `);

    const result = (branches.rows || branches).map(row => {
      // Determine if branch is currently Open/Online
      const hasRecentLogin = row.last_action_type &&
        row.last_action_type !== 'LOGOUT' &&
        row.last_action_time &&
        (Date.now() - new Date(row.last_action_time).getTime()) < 16 * 60 * 60 * 1000;

      const isOpen = !!row.active_shift_id ||
                     row.register_status === 'open' ||
                     row.register_status === 'active' ||
                     hasRecentLogin;

      // Determine cashier/operator name
      const cashierName = row.shift_cashier_name ||
                          row.shift_cashier_username ||
                          row.last_action_user ||
                          row.branch_name;

      return {
        id: row.id,
        branchCode: row.branch_code,
        branchName: row.branch_name,
        branchType: row.branch_type,
        city: row.city,
        phone: row.phone,
        workingHours: row.working_hours,
        isOpen: !!isOpen,
        hasActiveShift: !!row.active_shift_id,
        safeCash: parseFloat(row.safe_cash_balance || 0),
        safeVisa: parseFloat(row.safe_visa_balance || 0),
        safeTransfer: parseFloat(row.safe_transfer_balance || 0),
        lastActivity: {
          actionType: row.last_action_type,
          time: row.last_action_time,
          user: row.last_action_user,
          notes: row.last_action_notes
        },
        activeShift: row.active_shift_id ? {
          id: row.active_shift_id,
          shiftCode: row.active_shift_code,
          openedAt: row.active_shift_opened_at,
          openingFloat: parseFloat(row.active_shift_float || 0),
          currentSales: parseFloat(row.active_shift_sales || 0),
          cashierName: cashierName
        } : (isOpen ? {
          id: null,
          shiftCode: 'جلسة تسجيل دخول نشطة',
          openedAt: row.last_action_time,
          openingFloat: 0,
          currentSales: 0,
          cashierName: cashierName
        } : null)
      };
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('Live branches monitor error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch live branches status' });
  }
});

// 3. GET /api/swm/branch-shifts-monitor/sessions-log
router.get('/sessions-log', requireAuth, requireRole(MONITOR_ROLES), async (req, res) => {
  try {
    const { branch_id, user_id, action_type, start_date, end_date, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [
      `al.action_type IN ('LOGIN', 'BRANCH_LOGIN', 'BRANCH_STAFF_LOGIN', 'BRANCH_SUPERVISOR_LOGIN', 'ADMIN_WAREHOUSE_LOGIN', 'LOGOUT', 'SUPERVISOR_UNLOCK', 'POS_SESSION_OPEN', 'POS_SESSION_CLOSE', 'AUTO_POS_SESSION_CLOSE_1AM', 'EOD_SHIFT_CLOSE')`
    ];
    const params = [];
    let pIdx = 1;

    if (branch_id) {
      whereClauses.push(`al.branch_id = $${pIdx}`);
      params.push(parseInt(branch_id, 10));
      pIdx++;
    }

    if (user_id) {
      whereClauses.push(`al.user_id = $${pIdx}`);
      params.push(parseInt(user_id, 10));
      pIdx++;
    }

    if (action_type) {
      whereClauses.push(`al.action_type = $${pIdx}`);
      params.push(action_type);
      pIdx++;
    }

    if (start_date) {
      whereClauses.push(`al.created_at >= $${pIdx}`);
      params.push(`${start_date} 00:00:00`);
      pIdx++;
    }

    if (end_date) {
      whereClauses.push(`al.created_at <= $${pIdx}`);
      params.push(`${end_date} 23:59:59`);
      pIdx++;
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countSql = `SELECT COUNT(*) AS total FROM activity_logs al ${whereSql}`;
    const dataSql = `
      SELECT al.id, al.action_type, al.entity_type, al.entity_id,
             al.ip_address, al.user_agent, al.notes, al.created_at,
             al.user_id,
             COALESCE(u.full_name, b.branch_name, 'مسؤول الفرع') AS user_full_name,
             COALESCE(u.username, b.branch_code, 'حساب الفرع') AS username,
             COALESCE(u.role, CASE WHEN al.action_type LIKE '%ADMIN%' THEN 'admin' ELSE 'salesperson' END) AS user_role,
             al.branch_id, b.branch_name, b.branch_code
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      LEFT JOIN branches b ON b.id = al.branch_id
      ${whereSql}
      ORDER BY al.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const [[countRes], rows] = await Promise.all([
      query(countSql, params),
      query(dataSql, params)
    ]);

    const total = parseInt(countRes?.total || 0, 10);

    return res.json({
      success: true,
      data: rows.rows || rows,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Sessions log error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions log' });
  }
});

// 4. GET /api/swm/branch-shifts-monitor/shifts-history
router.get('/shifts-history', requireAuth, requireRole(MONITOR_ROLES), async (req, res) => {
  try {
    const { branch_id, status, start_date, end_date, page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [];
    const params = [];
    let pIdx = 1;

    if (branch_id) {
      whereClauses.push(`ps.branch_id = $${pIdx}`);
      params.push(parseInt(branch_id, 10));
      pIdx++;
    }

    if (status) {
      whereClauses.push(`ps.status = $${pIdx}`);
      params.push(status);
      pIdx++;
    }

    if (start_date) {
      whereClauses.push(`ps.opened_at >= $${pIdx}`);
      params.push(`${start_date} 00:00:00`);
      pIdx++;
    }

    if (end_date) {
      whereClauses.push(`ps.opened_at <= $${pIdx}`);
      params.push(`${end_date} 23:59:59`);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM pos_shifts ps ${whereSql}`;
    const dataSql = `
      SELECT ps.*,
             b.branch_name, b.branch_code,
             COALESCE(u_open.full_name, u_open.username, 'مسؤول الفرع / النظام') AS opened_by_name,
             COALESCE(u_close.full_name, u_close.username, CASE WHEN ps.status = 'closed' THEN 'إغلاق آلي للنظام' ELSE NULL END) AS closed_by_name
      FROM pos_shifts ps
      JOIN branches b ON b.id = ps.branch_id
      LEFT JOIN users u_open ON u_open.id = ps.opened_by
      LEFT JOIN users u_close ON u_close.id = ps.closed_by
      ${whereSql}
      ORDER BY ps.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const [[countRes], rows] = await Promise.all([
      query(countSql, params),
      query(dataSql, params)
    ]);

    const total = parseInt(countRes?.total || 0, 10);

    return res.json({
      success: true,
      data: rows.rows || rows,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Shifts history error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch shifts history' });
  }
});

module.exports = router;
