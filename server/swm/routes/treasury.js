const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireRole, requireBranchScope, requireWarehousePermission } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');
const {
  parseBreakdownToChannels,
  getMainWarehouseSafe,
  addToMainTreasury,
  deductFromMainTreasury
} = require('../services/treasuryService');

// Ensure aux tables exist and are properly seeded
async function initTreasuryAuxTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS owner_transactions (
        id SERIAL PRIMARY KEY,
        transaction_type VARCHAR(20) NOT NULL,
        amount NUMERIC(14, 4) NOT NULL,
        channel VARCHAR(20) NOT NULL,
        notes TEXT,
        created_by INT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS withdrawal_reasons (
        id SERIAL PRIMARY KEY,
        title VARCHAR(150) NOT NULL UNIQUE,
        category VARCHAR(50) DEFAULT 'operational',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payroll_payouts (
        id SERIAL PRIMARY KEY,
        employee_id INT NOT NULL,
        employee_name VARCHAR(150) NOT NULL,
        branch_id INT,
        payout_month VARCHAR(20) NOT NULL,
        base_salary NUMERIC(14, 4) NOT NULL DEFAULT 0,
        advances_deducted NUMERIC(14, 4) NOT NULL DEFAULT 0,
        deductions NUMERIC(14, 4) NOT NULL DEFAULT 0,
        deduction_reason TEXT,
        bonus NUMERIC(14, 4) NOT NULL DEFAULT 0,
        bonus_reason TEXT,
        net_salary NUMERIC(14, 4) NOT NULL,
        channel VARCHAR(20) NOT NULL DEFAULT 'cash',
        paid_by INT,
        paid_at TIMESTAMPTZ DEFAULT NOW(),
        notes TEXT,
        expense_id INT,
        deduct_source VARCHAR(50) DEFAULT 'main_treasury'
      );

      ALTER TABLE payroll_payouts ADD COLUMN IF NOT EXISTS deduct_source VARCHAR(50) DEFAULT 'main_treasury';
      ALTER TABLE treasury_transactions ALTER COLUMN register_id DROP NOT NULL;
    `);

    // Seed default withdrawal reasons if none exist
    const [{ count }] = await query(`SELECT COUNT(*) AS count FROM withdrawal_reasons`);
    if (parseInt(count, 10) === 0) {
      const defaultReasons = [
        ['مسحوبات شخصية / صاحب الحساب', 'owner_drawing'],
        ['إيجار مقر أو مستودع', 'utility_bill'],
        ['فواتير كهرباء ومياه وإنترنت', 'utility_bill'],
        ['صيانة وإصلاحات مرافق وأجهزة', 'operational'],
        ['بوفيه وضيافة ومستلزمات تشغيل', 'operational'],
        ['انتقالات ومصاريف شحن وتوصيل', 'operational'],
        ['دعاية وإعلانات وتسويق', 'operational'],
        ['أدوات ومهمات مكتبية ونظافة', 'operational'],
        ['سلفة موظف مؤقتة', 'sales_withdrawal'],
        ['مصروفات إدارية ونثرية طارئة', 'other']
      ];
      for (const [title, cat] of defaultReasons) {
        await query(
          `INSERT INTO withdrawal_reasons (title, category) VALUES ($1, $2) ON CONFLICT (title) DO NOTHING`,
          [title, cat]
        );
      }
    }
  } catch (err) {
    console.error('Error initializing treasury aux tables:', err);
  }
}
initTreasuryAuxTables();

/**
 * Helper: get or create a branch's cash register
 */
async function getOrCreateRegister(branchId) {
  let [reg] = await query(
    `SELECT * FROM cash_registers WHERE branch_id = $1 ORDER BY is_main DESC, id ASC LIMIT 1`,
    [branchId]
  );
  if (!reg) {
    const regCode = `REG-B${branchId}-01`;
    const [created] = await query(
      `INSERT INTO cash_registers (register_code, branch_id, register_name, is_main, current_balance, opening_balance, status, created_at, updated_at)
       VALUES ($1, $2, $3, true, 0, 0, 'closed', NOW(), NOW()) RETURNING *`,
      [regCode, branchId, `Main Register Branch ${branchId}`]
    );
    reg = created;
  }
  return reg;
}

/**
 * Helper: get main warehouse register (branch_type = main_warehouse)
 */
async function getMainWarehouseRegister() {
  const [mainBranch] = await query(
    `SELECT id FROM branches WHERE branch_type = 'main_warehouse' ORDER BY id ASC LIMIT 1`
  );
  if (!mainBranch) throw new Error('Main warehouse branch not found');
  return getOrCreateRegister(mainBranch.id);
}

/**
 * Helper: generate transfer reference
 */
function genTransferRef() {
  const now = new Date();
  const d = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRF-${d}-${rand}`;
}

// ────────────────────────────────────────────────────
//  GET /api/swm/treasury/registers
//  Returns cash registers: all (admin) or own branch (supervisor/branch)
// ────────────────────────────────────────────────────
router.get('/registers', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'cashier', 'salesperson', 'warehouse_manager']), async (req, res) => {
  try {
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role) || req.user.isMainWarehouse;

    let sql = `
      SELECT cr.*, b.branch_name, b.branch_code, b.branch_type,
             COALESCE(
               (SELECT SUM(ct.amount) FROM cash_transfers ct
                WHERE ct.from_register_id = cr.id AND ct.status = 'completed'),
             0) AS total_transferred_out,
             COALESCE(
               (SELECT COUNT(*) FROM cash_transfers ct
                WHERE ct.from_register_id = cr.id AND ct.status = 'pending'),
             0) AS pending_requests
      FROM cash_registers cr
      JOIN branches b ON b.id = cr.branch_id
      WHERE 1=1
    `;
    const params = [];

    if (!isAdmin) {
      sql += ` AND cr.branch_id = $1`;
      params.push(req.user.branchId);
    }

    sql += ` ORDER BY b.branch_type ASC, cr.id ASC`;
    let rows = await query(sql, params);

    if (!isAdmin && rows.length === 0 && req.user.branchId) {
      await getOrCreateRegister(req.user.branchId);
      rows = await query(sql, params);
    }

    return res.json({
      success: true,
      registers: rows,
      data: rows
    });
  } catch (err) {
    console.error('Treasury registers error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  GET /api/swm/treasury/branch-safe
//  Returns the branch safe accounts (Cash, Visa, Transfer) and recent transfer entries
// ────────────────────────────────────────────────────
router.get('/branch-safe', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'cashier', 'salesperson', 'warehouse_manager']), async (req, res) => {
  try {
    const branchId = req.query.branch_id || req.user.branchId;
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required' });
    }

    let [safe] = await query(`SELECT * FROM branch_safes WHERE branch_id = $1`, [branchId]);
    if (!safe) {
      const [branch] = await query(`SELECT branch_name FROM branches WHERE id = $1`, [branchId]);
      const [created] = await query(
        `INSERT INTO branch_safes (branch_id, safe_name, cash_balance, visa_balance, transfer_balance)
         VALUES ($1, $2, 0, 0, 0) RETURNING *`,
        [branchId, `خزينة ${branch?.branch_name || branchId}`]
      );
      safe = created;
    }

    const cash = parseFloat(safe.cash_balance || 0);
    const visa = parseFloat(safe.visa_balance || 0);
    const transfer = parseFloat(safe.transfer_balance || 0);
    const total = Math.round((cash + visa + transfer) * 100) / 100;

    const recentTransactions = await query(
      `SELECT tt.*, u.full_name AS created_by_name
       FROM treasury_transactions tt
       LEFT JOIN users u ON u.id = tt.created_by
       WHERE tt.branch_id = $1
       ORDER BY tt.created_at DESC LIMIT 20`,
      [branchId]
    );

    return res.json({
      success: true,
      data: {
        safe: {
          id: safe.id,
          branch_id: safe.branch_id,
          safe_name: safe.safe_name,
          cash_balance: cash,
          visa_balance: visa,
          transfer_balance: transfer,
          total_balance: total
        },
        recent_transactions: recentTransactions
      }
    });
  } catch (err) {
    console.error('Treasury branch safe error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  GET /api/swm/treasury/kpis
//  Admin-only aggregated KPIs
// ────────────────────────────────────────────────────
router.get('/kpis', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const [totals] = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS total_received,
        COALESCE(SUM(CASE WHEN status = 'pending'   THEN amount ELSE 0 END), 0) AS total_pending_amount,
        COUNT(CASE WHEN status = 'pending'   THEN 1 END)                        AS pending_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)                        AS completed_count,
        COUNT(DISTINCT CASE WHEN status = 'completed' THEN from_branch_id END)  AS active_sending_branches
      FROM cash_transfers
    `);

    const { mainBranch, safe: mainSafe, reg: mainReg } = await getMainWarehouseSafe();

    // Owner account aggregates
    const [ownerStats] = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0) AS total_deposited,
        COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0) AS total_withdrawn,
        COUNT(CASE WHEN transaction_type = 'deposit' THEN 1 END) AS deposit_count,
        COUNT(CASE WHEN transaction_type = 'withdrawal' THEN 1 END) AS withdrawal_count
      FROM owner_transactions
    `);

    const ownerDeposited = parseFloat(ownerStats?.total_deposited || 0);
    const ownerWithdrawn = parseFloat(ownerStats?.total_withdrawn || 0);
    const ownerBalance = Math.round((ownerDeposited - ownerWithdrawn) * 100) / 100;

    const safeCash = parseFloat(mainSafe?.cash_balance || 0);
    const safeVisa = parseFloat(mainSafe?.visa_balance || 0);
    const safeTrf = parseFloat(mainSafe?.transfer_balance || 0);
    const safeTotal = Math.round((safeCash + safeVisa + safeTrf) * 100) / 100;

    // Per-branch summary
    const branchSummary = await query(`
      SELECT
        b.id AS branch_id,
        b.branch_name,
        b.branch_code,
        b.branch_type,
        cr.current_balance,
        cr.status AS register_status,
        cr.last_transfer_at,
        COALESCE(SUM(CASE WHEN ct.status = 'completed' THEN ct.amount ELSE 0 END), 0) AS total_sent,
        COUNT(CASE WHEN ct.status = 'pending' THEN 1 END)                             AS pending_count,
        MAX(CASE WHEN ct.status = 'completed' THEN ct.confirmed_at END)               AS last_completed_transfer
      FROM branches b
      LEFT JOIN cash_registers cr ON cr.branch_id = b.id AND cr.is_main = true
      LEFT JOIN cash_transfers  ct ON ct.from_branch_id = b.id
      WHERE b.branch_type = 'retail_branch'
      GROUP BY b.id, b.branch_name, b.branch_code, b.branch_type,
               cr.current_balance, cr.status, cr.last_transfer_at
      ORDER BY b.id
    `);

    return res.json({
      success: true,
      data: {
        main_register_balance: safeTotal,
        main_safe: {
          id: mainSafe.id,
          cash_balance: safeCash,
          visa_balance: safeVisa,
          transfer_balance: safeTrf,
          total_balance: safeTotal
        },
        owner_account: {
          total_deposited: ownerDeposited,
          total_withdrawn: ownerWithdrawn,
          current_balance: ownerBalance,
          deposit_count: parseInt(ownerStats?.deposit_count || 0, 10),
          withdrawal_count: parseInt(ownerStats?.withdrawal_count || 0, 10)
        },
        total_received:         parseFloat(totals.total_received || 0),
        total_pending_amount:   parseFloat(totals.total_pending_amount || 0),
        pending_count:          parseInt(totals.pending_count || 0, 10),
        completed_count:        parseInt(totals.completed_count || 0, 10),
        active_sending_branches: parseInt(totals.active_sending_branches || 0, 10),
        branch_summary: branchSummary.map(b => ({
          ...b,
          current_balance: parseFloat(b.current_balance || 0),
          total_sent:      parseFloat(b.total_sent || 0),
          pending_count:   parseInt(b.pending_count || 0, 10)
        }))
      }
    });
  } catch (err) {
    console.error('Treasury KPIs error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  GET /api/swm/treasury/transfers & GET /api/v1/cash-transfers
//  List transfers — admin sees all, branch sees own
// ────────────────────────────────────────────────────
const handleGetTransfers = async (req, res) => {
  try {
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role) || req.user.isMainWarehouse;
    const { status, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let where = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (!isAdmin) {
      where += ` AND ct.from_branch_id = $${idx++}`;
      params.push(req.user.branchId);
    }
    if (status && status !== 'all') {
      where += ` AND ct.status = $${idx++}`;
      params.push(status);
    }

    const countSql = `SELECT COUNT(*) AS total FROM cash_transfers ct ${where}`;
    const [countRow] = await query(countSql, params);
    const total = parseInt(countRow.total || 0, 10);

    const dataSql = `
      SELECT ct.*,
             fb.branch_name AS from_branch_name, fb.branch_code AS from_branch_code,
             tb.branch_name AS to_branch_name,
             ru.full_name   AS requested_by_name, ru.username AS requested_by_username,
             cu.full_name   AS confirmed_by_name
      FROM cash_transfers ct
      JOIN branches fb  ON fb.id  = ct.from_branch_id
      JOIN branches tb  ON tb.id  = ct.to_branch_id
      JOIN users    ru  ON ru.id  = ct.requested_by
      LEFT JOIN users cu ON cu.id = ct.confirmed_by
      ${where}
      ORDER BY ct.requested_at DESC
      LIMIT ${parseInt(limit, 10)} OFFSET ${offset}
    `;
    const rows = await query(dataSql, params);

    return res.json({
      success: true,
      data: rows,
      meta: { total, page: parseInt(page, 10), limit: parseInt(limit, 10) }
    });
  } catch (err) {
    console.error('Treasury transfers list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.get('/transfers', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'cashier', 'salesperson']), handleGetTransfers);
router.get('/cash-transfers', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'cashier', 'salesperson']), handleGetTransfers);

// ────────────────────────────────────────────────────
//  POST /api/swm/treasury/transfers
//  Branch supervisor requests a cash transfer to main
// ────────────────────────────────────────────────────
router.post('/transfers', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'cashier', 'salesperson']), async (req, res) => {
  try {
    const branchId = req.user.branchId || req.body.from_branch_id;
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'تعذّر تحديد الفرع المُرسِل. تحقق من بيانات الجلسة.' });
    }

    const { amount, transfer_method = 'manual_cash', reference_no, notes } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ success: false, message: 'المبلغ يجب أن يكون رقماً موجباً أكبر من صفر' });
    }

    const fromRegister = await getOrCreateRegister(branchId);
    let [branchSafe] = await query(`SELECT * FROM branch_safes WHERE branch_id = $1`, [branchId]);
    if (!branchSafe) {
      const [bInfo] = await query(`SELECT branch_name FROM branches WHERE id = $1`, [branchId]);
      const [createdSafe] = await query(
        `INSERT INTO branch_safes (branch_id, safe_name, cash_balance, visa_balance, transfer_balance)
         VALUES ($1, $2, 0, 0, 0) RETURNING *`,
        [branchId, `خزينة ${bInfo?.branch_name || branchId}`]
      );
      branchSafe = createdSafe;
    }

    const availableInSafe = parseFloat(branchSafe.cash_balance || 0);
    const availableInRegister = parseFloat(fromRegister.current_balance || 0);
    const available = Math.max(availableInSafe, availableInRegister);

    if (amt > available) {
      return res.status(400).json({
        success: false,
        message: `الرصيد غير كافٍ في خزينة الفرع. الرصيد المتاح: ${available.toFixed(2)} ج.م`
      });
    }

    const mainRegister = await getMainWarehouseRegister();
    if (fromRegister.id === mainRegister.id) {
      return res.status(400).json({ success: false, message: 'لا يمكن التحويل من الخزينة الرئيسية إلى نفسها' });
    }

    const [mainBranch] = await query(`SELECT id FROM branches WHERE branch_type = 'main_warehouse' LIMIT 1`);
    const transferRef = genTransferRef();

    const result = await transaction(async (client) => {
      // Deduct from branch safe
      await client.query(
        `UPDATE branch_safes SET cash_balance = GREATEST(0, cash_balance - $1), updated_at = NOW() WHERE id = $2`,
        [amt, branchSafe.id]
      );

      // Deduct from branch register
      const [updatedFrom] = (await client.query(
        `UPDATE cash_registers SET current_balance = GREATEST(0, current_balance - $1), updated_at = NOW() WHERE id = $2 RETURNING *`,
        [amt, fromRegister.id]
      )).rows;

      // Create transfer record
      const [transfer] = (await client.query(
        `INSERT INTO cash_transfers
           (transfer_ref, from_register_id, to_register_id, from_branch_id, to_branch_id,
            amount, transfer_method, reference_no, notes, requested_by, status, requested_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',NOW(),NOW(),NOW())
         RETURNING *`,
        [
          transferRef,
          fromRegister.id, mainRegister.id,
          parseInt(branchId, 10), mainBranch.id,
          amt, transfer_method,
          reference_no || null,
          notes || null,
          req.user.id
        ]
      )).rows;

      // Create audit entry in treasury_transactions
      const entryNum = `TRF-${Date.now()}`;
      await client.query(
        `INSERT INTO treasury_transactions (
           entry_number, branch_id, register_id, safe_id,
           source_account, destination_account, payment_method, amount,
           previous_safe_balance, new_safe_balance, created_by, notes, created_at
         ) VALUES ($1, $2, $3, $4, 'branch_safe_cash', 'main_warehouse_safe', 'cash', $5, $6, $7, $8, $9, NOW())`,
        [
          entryNum, branchId, fromRegister.id, branchSafe.id,
          amt, availableInSafe, Math.max(0, availableInSafe - amt), req.user.id,
          `تسليم نقدية من الفرع للخزينة الرئيسية (${transferRef}): ${notes || ''}`
        ]
      );

      return { transfer, updatedFrom };
    });

    logActivity({
      userId: req.user.id,
      branchId: parseInt(branchId, 10),
      actionType: 'CASH_TRANSFER_REQUEST',
      entityType: 'cash_transfers',
      entityId: result.transfer.id,
      newValue: { transfer_ref: transferRef, amount: amt, transfer_method },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `طلب تحويل نقدي ${amt} ج.م من فرع ${branchId} للخزينة الرئيسية (${transferRef})`
    });

    return res.status(201).json({
      success: true,
      data: result.transfer,
      message: `تم إرسال طلب تحويل ${amt} ج.م بنجاح. في انتظار تأكيد المدير.`
    });
  } catch (err) {
    console.error('Cash transfer request error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  POST /api/v1/cash-transfers & POST /api/swm/treasury/handover-to-main
//  100% MANUAL Handover: supervisor executes db.transaction to:
//  1. Deduct specified breakdown (cash, visa, transfers) from branch_safes
//  2. Deduct total amount from branch cash_registers
//  3. Add total amount to HQ main safe cash_registers
//  4. Record the transaction in cash_transfers (with payment_breakdown JSONB) and treasury_transactions
// ────────────────────────────────────────────────────
const handleManualCashTransfer = async (req, res) => {
  try {
    const branchId = req.body.from_branch_id || req.user.branch_id || req.user.branchId;
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'تعذّر تحديد فرع المشرف.' });
    }

    const fromRegister = await getOrCreateRegister(branchId);
    let [branchSafe] = await query(`SELECT * FROM branch_safes WHERE branch_id = $1`, [branchId]);
    if (!branchSafe) {
      const [bInfo] = await query(`SELECT branch_name FROM branches WHERE id = $1`, [branchId]);
      const [createdSafe] = await query(
        `INSERT INTO branch_safes (branch_id, safe_name, cash_balance, visa_balance, transfer_balance)
         VALUES ($1, $2, 0, 0, 0) RETURNING *`,
        [branchId, `خزينة ${bInfo?.branch_name || branchId}`]
      );
      branchSafe = createdSafe;
    }

    const availableCash = parseFloat(branchSafe.cash_balance || 0);
    const availableVisa = parseFloat(branchSafe.visa_balance || 0);
    const availableTransfers = parseFloat(branchSafe.transfer_balance || 0);

    // Extract breakdown amounts
    let cashAmt = 0;
    let visaAmt = 0;
    let transferAmt = 0;

    const b = req.body.payment_breakdown || req.body.breakdown;
    if (b && typeof b === 'object') {
      cashAmt = b.cash !== undefined && b.cash !== '' ? parseFloat(b.cash) : 0;
      visaAmt = b.visa !== undefined && b.visa !== '' ? parseFloat(b.visa) : 0;
      transferAmt = b.transfers !== undefined && b.transfers !== ''
        ? parseFloat(b.transfers)
        : (b.transfer !== undefined && b.transfer !== '' ? parseFloat(b.transfer) : 0);
    } else if (req.body.cash !== undefined || req.body.visa !== undefined || req.body.transfers !== undefined) {
      cashAmt = req.body.cash !== undefined && req.body.cash !== '' ? parseFloat(req.body.cash) : 0;
      visaAmt = req.body.visa !== undefined && req.body.visa !== '' ? parseFloat(req.body.visa) : 0;
      transferAmt = req.body.transfers !== undefined && req.body.transfers !== ''
        ? parseFloat(req.body.transfers)
        : (req.body.transfer !== undefined && req.body.transfer !== '' ? parseFloat(req.body.transfer) : 0);
    } else if (req.body.amount !== undefined && req.body.amount !== '') {
      // Fallback: entire amount attributed to cash
      cashAmt = parseFloat(req.body.amount);
    } else {
      // Default: settle all available balances
      cashAmt = availableCash;
      visaAmt = availableVisa;
      transferAmt = availableTransfers;
    }

    if (isNaN(cashAmt) || cashAmt < 0) cashAmt = 0;
    if (isNaN(visaAmt) || visaAmt < 0) visaAmt = 0;
    if (isNaN(transferAmt) || transferAmt < 0) transferAmt = 0;

    const totalAmt = Number((cashAmt + visaAmt + transferAmt).toFixed(2));

    if (totalAmt <= 0) {
      return res.status(400).json({
        success: false,
        message: 'إجمالي المبلغ المطلوب تسليمه يجب أن يكون أكبر من 0 ج.م'
      });
    }

    // Validate amounts against branch available balances (with 0.01 tolerance)
    if (cashAmt > availableCash + 0.01) {
      return res.status(400).json({
        success: false,
        message: `مبلغ الكاش المطلوب (${cashAmt.toLocaleString()} ج.م) يتجاوز رصيد الكاش المتاح بالفرع (${availableCash.toLocaleString()} ج.م)`
      });
    }
    if (visaAmt > availableVisa + 0.01) {
      return res.status(400).json({
        success: false,
        message: `مبلغ الفيزا المطلوب (${visaAmt.toLocaleString()} ج.م) يتجاوز رصيد الفيزا المتاح بالفرع (${availableVisa.toLocaleString()} ج.م)`
      });
    }
    if (transferAmt > availableTransfers + 0.01) {
      return res.status(400).json({
        success: false,
        message: `مبلغ التحويلات المطلوب (${transferAmt.toLocaleString()} ج.م) يتجاوز رصيد التحويلات المتاح بالفرع (${availableTransfers.toLocaleString()} ج.م)`
      });
    }

    const mainRegister = await getMainWarehouseRegister();
    const [mainBranch] = await query(`SELECT id FROM branches WHERE branch_type = 'main_warehouse' LIMIT 1`);
    const transferRef = genTransferRef();

    const breakdownObj = {
      cash: cashAmt,
      visa: visaAmt,
      transfers: transferAmt
    };
    const breakdownJson = JSON.stringify(breakdownObj);
    const breakdownSummary = `[كاش: ${cashAmt.toLocaleString()} ج.م | فيزا: ${visaAmt.toLocaleString()} ج.م | تحويلات: ${transferAmt.toLocaleString()} ج.م]`;
    const fullNotes = req.body.notes ? `${req.body.notes} - ${breakdownSummary}` : breakdownSummary;

    const result = await transaction(async (client) => {
      // 1. Deduct breakdown from branch safe balances
      await client.query(
        `UPDATE branch_safes 
         SET cash_balance = GREATEST(0, cash_balance - $1),
             visa_balance = GREATEST(0, visa_balance - $2),
             transfer_balance = GREATEST(0, transfer_balance - $3),
             updated_at = NOW() 
         WHERE id = $4`,
        [cashAmt, visaAmt, transferAmt, branchSafe.id]
      );

      // 2. Deduct totalAmt from branch cash_registers record
      await client.query(
        `UPDATE cash_registers 
         SET current_balance = GREATEST(0, current_balance - $1), 
             last_transfer_at = NOW(), 
             updated_at = NOW() 
         WHERE id = $2`,
        [totalAmt, fromRegister.id]
      );

      // 3. Add breakdown and totalAmt to HQ main safe and registers
      await client.query(
        `UPDATE cash_registers 
         SET current_balance = current_balance + $1, 
             updated_at = NOW() 
         WHERE id = $2`,
        [totalAmt, mainRegister.id]
      );

      await client.query(
        `UPDATE branch_safes
         SET cash_balance = cash_balance + $1,
             visa_balance = visa_balance + $2,
             transfer_balance = transfer_balance + $3,
             updated_at = NOW()
         WHERE branch_id = $4`,
        [cashAmt, visaAmt, transferAmt, mainBranch.id]
      );

      // 4. Create completed transfer record in cash_transfers table with payment_breakdown JSON
      const [transfer] = (await client.query(
        `INSERT INTO cash_transfers
           (transfer_ref, from_register_id, to_register_id, from_branch_id, to_branch_id,
            amount, transfer_method, reference_no, notes, requested_by, confirmed_by,
            status, payment_breakdown, requested_at, confirmed_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,'completed',$11,NOW(),NOW(),NOW(),NOW())
         RETURNING *`,
        [
          transferRef,
          fromRegister.id, mainRegister.id,
          parseInt(branchId, 10), mainBranch.id,
          totalAmt, req.body.transfer_method || 'multi_method',
          req.body.reference_no || null,
          fullNotes,
          req.user.id,
          breakdownJson
        ]
      )).rows;

      // 5. Audit entry in treasury_transactions
      const entryNum = `TRF-MANUAL-${Date.now()}`;
      const totalPrev = availableCash + availableVisa + availableTransfers;
      await client.query(
        `INSERT INTO treasury_transactions (
           entry_number, branch_id, register_id, safe_id,
           source_account, destination_account, payment_method, amount,
           previous_safe_balance, new_safe_balance, created_by, notes, created_at
         ) VALUES ($1, $2, $3, $4, 'branch_safe_multi', 'main_warehouse_safe', 'multi_method', $5, $6, $7, $8, $9, NOW())`,
        [
          entryNum, branchId, fromRegister.id, branchSafe.id,
          totalAmt, totalPrev, Math.max(0, totalPrev - totalAmt), req.user.id,
          `تسليم خزن يدوي شامل للفرع الرئيسي (${transferRef}): ${breakdownSummary}`
        ]
      );

      return { transfer, totalAmt, breakdown: breakdownObj };
    });

    logActivity({
      userId: req.user.id,
      branchId: parseInt(branchId, 10),
      actionType: 'CASH_HANDOVER_TO_MAIN',
      entityType: 'cash_transfers',
      entityId: result.transfer.id,
      newValue: { transfer_ref: transferRef, amount: totalAmt, payment_breakdown: result.breakdown },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `تسليم خزن يدوي ${totalAmt} ج.م للفرع الرئيسي ${breakdownSummary}`
    });

    return res.status(200).json({
      success: true,
      message: `تم تسليم إجمالي ${result.totalAmt.toLocaleString()} ج.م بنجاح ${breakdownSummary} وإيداعها في الخزينة الرئيسية`,
      data: result.transfer
    });
  } catch (err) {
    console.error('Handover to main safe error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/cash-transfers', requireAuth, requireRole(['super_admin', 'admin', 'supervisor']), handleManualCashTransfer);
router.post('/handover-to-main', requireAuth, requireRole(['super_admin', 'admin', 'supervisor']), handleManualCashTransfer);

// ────────────────────────────────────────────────────
//  PUT /api/swm/treasury/transfers/:id/confirm
//  Admin confirms receipt — adds amount to main register
// ────────────────────────────────────────────────────
router.put('/transfers/:id/confirm', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const [transfer] = await query(`SELECT * FROM cash_transfers WHERE id = $1`, [id]);
    if (!transfer) return res.status(404).json({ success: false, message: 'طلب التحويل غير موجود' });
    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `لا يمكن تأكيد طلب بحالة "${transfer.status}". فقط الطلبات المعلقة يمكن تأكيدها.`
      });
    }

    const amt = parseFloat(transfer.amount);

    let trfBreakdown = null;
    try {
      if (transfer.payment_breakdown) {
        trfBreakdown = typeof transfer.payment_breakdown === 'string'
          ? JSON.parse(transfer.payment_breakdown)
          : transfer.payment_breakdown;
      }
    } catch (e) {
      trfBreakdown = null;
    }

    const trfChannels = parseBreakdownToChannels({
      amount: amt,
      paymentMethod: transfer.transfer_method,
      paymentBreakdown: trfBreakdown
    });

    const result = await transaction(async (client) => {
      // 1. Add to main warehouse register
      const [mainReg] = (await client.query(
        `UPDATE cash_registers SET current_balance = current_balance + $1, last_transfer_at = NOW(), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [amt, transfer.to_register_id]
      )).rows;

      // 2. Add to main warehouse safe channels
      await client.query(
        `UPDATE branch_safes
         SET cash_balance = cash_balance + $1,
             visa_balance = visa_balance + $2,
             transfer_balance = transfer_balance + $3,
             updated_at = NOW()
         WHERE branch_id = $4`,
        [trfChannels.cash, trfChannels.visa, trfChannels.transfer, transfer.to_branch_id]
      );

      // 3. Mark transfer as completed
      const [updated] = (await client.query(
        `UPDATE cash_transfers
         SET status = 'completed', confirmed_by = $1, confirmed_at = NOW(), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [req.user.id, id]
      )).rows;

      return { updated, mainReg };
    });

    logActivity({
      userId: req.user.id,
      branchId: transfer.to_branch_id,
      actionType: 'CASH_TRANSFER_CONFIRMED',
      entityType: 'cash_transfers',
      entityId: id,
      newValue: {
        transfer_ref: transfer.transfer_ref,
        amount: amt,
        from_branch_id: transfer.from_branch_id,
        confirmed_by: req.user.id
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `تأكيد استلام ${amt} ج.م (${transfer.transfer_ref}) للخزينة الرئيسية`
    });

    return res.json({
      success: true,
      data: result.updated,
      message: `تم تأكيد استلام ${amt} ج.م وإضافتها للخزينة الرئيسية بنجاح`
    });
  } catch (err) {
    console.error('Cash transfer confirm error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  PUT /api/swm/treasury/transfers/:id/cancel
//  Cancel a pending transfer — refunds amount to source register
// ────────────────────────────────────────────────────
router.put('/transfers/:id/cancel', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'cashier', 'salesperson']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [transfer] = await query(`SELECT * FROM cash_transfers WHERE id = $1`, [id]);
    if (!transfer) return res.status(404).json({ success: false, message: 'طلب التحويل غير موجود' });
    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `لا يمكن إلغاء طلب بحالة "${transfer.status}"`
      });
    }

    // Only admin or the requester can cancel
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role) || req.user.isMainWarehouse;
    if (!isAdmin && parseInt(req.user.id, 10) !== parseInt(transfer.requested_by, 10)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بإلغاء هذا الطلب' });
    }

    const amt = parseFloat(transfer.amount);

    const result = await transaction(async (client) => {
      // Refund amount back to source register
      await client.query(
        `UPDATE cash_registers SET current_balance = current_balance + $1, updated_at = NOW() WHERE id = $2`,
        [amt, transfer.from_register_id]
      );

      // Refund amount back to source branch safe
      await client.query(
        `UPDATE branch_safes SET cash_balance = cash_balance + $1, updated_at = NOW() WHERE branch_id = $2`,
        [amt, transfer.from_branch_id]
      );

      const [updated] = (await client.query(
        `UPDATE cash_transfers SET status = 'cancelled', notes = CONCAT(COALESCE(notes,''), $1::text), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [reason ? `\n[إلغاء: ${reason}]` : '\n[تم الإلغاء]', id]
      )).rows;

      return updated;
    });

    logActivity({
      userId: req.user.id,
      branchId: transfer.from_branch_id,
      actionType: 'CASH_TRANSFER_CANCELLED',
      entityType: 'cash_transfers',
      entityId: id,
      newValue: { transfer_ref: transfer.transfer_ref, amount: amt, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `إلغاء طلب تحويل ${amt} ج.م (${transfer.transfer_ref})${reason ? ': ' + reason : ''}`
    });

    return res.json({
      success: true,
      data: result,
      message: `تم إلغاء طلب التحويل وإعادة ${amt} ج.م إلى خزنة الفرع`
    });
  } catch (err) {
    console.error('Cash transfer cancel error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  GET /api/swm/treasury/owner-account
//  Returns owner's current balance, stats, and transaction history
// ────────────────────────────────────────────────────
router.get('/owner-account', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const [stats] = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0) AS total_deposited,
        COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0) AS total_withdrawn,
        COUNT(CASE WHEN transaction_type = 'deposit' THEN 1 END) AS deposit_count,
        COUNT(CASE WHEN transaction_type = 'withdrawal' THEN 1 END) AS withdrawal_count
      FROM owner_transactions
    `);

    const totalDeposited = parseFloat(stats?.total_deposited || 0);
    const totalWithdrawn = parseFloat(stats?.total_withdrawn || 0);
    const currentBalance = Math.round((totalDeposited - totalWithdrawn) * 100) / 100;

    const transactions = await query(`
      SELECT ot.*, u.full_name AS created_by_name, u.username AS created_by_username
      FROM owner_transactions ot
      LEFT JOIN users u ON u.id = ot.created_by
      ORDER BY ot.created_at DESC
      LIMIT 100
    `);

    return res.json({
      success: true,
      data: {
        summary: {
          current_balance: currentBalance,
          total_deposited: totalDeposited,
          total_withdrawn: totalWithdrawn,
          deposit_count: parseInt(stats?.deposit_count || 0, 10),
          withdrawal_count: parseInt(stats?.withdrawal_count || 0, 10)
        },
        transactions
      }
    });
  } catch (err) {
    console.error('Owner account error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  POST /api/swm/treasury/owner-transaction
//  Owner deposit (إيداع / تمويل) or withdrawal (مسحوبات / أرباح)
// ────────────────────────────────────────────────────
router.post('/owner-transaction', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { transaction_type, amount, channel = 'cash', notes } = req.body;

    if (!['deposit', 'withdrawal'].includes(transaction_type)) {
      return res.status(400).json({ success: false, message: 'نوع المعاملة يجب أن يكون إيداع (deposit) أو سحب (withdrawal)' });
    }

    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: 'المبلغ يجب أن يكون أكبر من صفر' });
    }

    const normChannel = ['cash', 'visa', 'transfer'].includes(channel) ? channel : 'cash';

    const result = await transaction(async (client) => {
      // 1. Process treasury inflow or outflow with strict solvency
      if (transaction_type === 'deposit') {
        await addToMainTreasury(client, {
          amount: amt,
          paymentMethod: normChannel,
          paymentBreakdown: { [normChannel]: amt },
          sourceAccount: 'owner_equity',
          reason: 'إيداع رأس مال / تمويل من صاحب الحساب',
          refNumber: `OWN-DEP-${Date.now().toString().slice(-6)}`,
          userId: req.user.id
        });
      } else {
        // withdrawal: deducts from main treasury and validates solvency
        await deductFromMainTreasury(client, {
          amount: amt,
          paymentMethod: normChannel,
          paymentBreakdown: { [normChannel]: amt },
          destinationAccount: 'owner_drawings',
          reason: 'مسحوبات شخصية / أرباح صاحب الحساب',
          refNumber: `OWN-WTH-${Date.now().toString().slice(-6)}`,
          userId: req.user.id
        });
      }

      // 2. Record in owner_transactions
      const [record] = (await client.query(
        `INSERT INTO owner_transactions (transaction_type, amount, channel, notes, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [transaction_type, amt, normChannel, notes || null, req.user.id]
      )).rows;

      return record;
    });

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId || 1,
      actionType: transaction_type === 'deposit' ? 'OWNER_DEPOSIT' : 'OWNER_WITHDRAWAL',
      entityType: 'owner_transactions',
      entityId: result.id,
      newValue: { amount: amt, channel: normChannel, transaction_type, notes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `${transaction_type === 'deposit' ? 'إيداع تمويل' : 'سحب مسحوبات'} بمبلغ ${amt} ج.م عبر قناة ${normChannel}`
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: transaction_type === 'deposit'
        ? `تم إيداع مبلغ ${amt.toLocaleString()} ج.م في الخزينة الرئيسية وقيده بحساب صاحب الحساب بنجاح`
        : `تم سحب مبلغ ${amt.toLocaleString()} ج.م من الخزينة الرئيسية وقيده كمسحوبات لصاحب الحساب بنجاح`
    });
  } catch (err) {
    console.error('Owner transaction error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  POST /api/swm/treasury/channel-transfer
//  Transfer funds between internal treasury channels (cash, visa, transfer)
// ────────────────────────────────────────────────────
router.post('/channel-transfer', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { from_channel, to_channel, amount, notes } = req.body;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال مبلغ صحيح للتحويل' });
    }
    const validChannels = ['cash', 'visa', 'transfer'];
    if (!validChannels.includes(from_channel) || !validChannels.includes(to_channel)) {
      return res.status(400).json({ success: false, message: 'قناة مالية غير صحيحة' });
    }
    if (from_channel === to_channel) {
      return res.status(400).json({ success: false, message: 'لا يمكن التحويل لنفس القناة المالية' });
    }

    const channelNames = {
      cash: 'الخزينة النقدية (كاش)',
      visa: 'الحساب البنكي (فيزا)',
      transfer: 'التحويلات والمحافظ (إنستاباي / كاش)'
    };

    const result = await transaction(async (client) => {
      const { mainBranch, reg } = await getMainWarehouseSafe(client);

      const { rows: [safe] } = await client.query(
        `SELECT * FROM branch_safes WHERE branch_id = $1 FOR UPDATE`,
        [mainBranch.id]
      );
      if (!safe) throw new Error('خزينة الفرع الرئيسي غير موجودة');

      const fromCol = `${from_channel}_balance`;
      const toCol = `${to_channel}_balance`;
      const currentFromBal = parseFloat(safe[fromCol] || 0);
      const currentToBal = parseFloat(safe[toCol] || 0);

      if (parsedAmount > currentFromBal + 0.01) {
        throw new Error(`الرصيد المتاح في ${channelNames[from_channel]} (${currentFromBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م) لا يكفي لإتمام التحويل`);
      }

      const newFromBal = Math.round((currentFromBal - parsedAmount) * 100) / 100;
      const newToBal = Math.round((currentToBal + parsedAmount) * 100) / 100;

      await client.query(
        `UPDATE branch_safes SET ${fromCol} = $1, ${toCol} = $2, updated_at = NOW() WHERE id = $3`,
        [newFromBal, newToBal, safe.id]
      );

      const prevTotal = parseFloat(safe.cash_balance || 0) + parseFloat(safe.visa_balance || 0) + parseFloat(safe.transfer_balance || 0);
      const entryNum = `XFER-CHAN-${Date.now().toString().slice(-8)}`;
      const transferNotes = `تحويل داخلي بين القنوات: من [${channelNames[from_channel]}] إلى [${channelNames[to_channel]}]${notes ? ` - البيان: ${notes.trim()}` : ''}`;

      const { rows: [txRecord] } = await client.query(
        `INSERT INTO treasury_transactions (
           entry_number, branch_id, register_id, safe_id,
           source_account, destination_account, payment_method, amount,
           previous_safe_balance, new_safe_balance, created_by, notes, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'channel_transfer', $7, $8, $9, $10, $11, NOW())
         RETURNING *`,
        [
          entryNum,
          mainBranch.id,
          reg?.id || null,
          safe.id,
          `main_safe_${from_channel}`,
          `main_safe_${to_channel}`,
          parsedAmount,
          prevTotal,
          prevTotal,
          req.user.id,
          transferNotes
        ]
      );

      return { txRecord, newFromBal, newToBal };
    });

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId || 1,
      actionType: 'CHANNEL_TRANSFER',
      entityType: 'treasury_transactions',
      entityId: result.txRecord.id,
      newValue: { from_channel, to_channel, amount: parsedAmount, notes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `تحويل داخلي من ${from_channel} إلى ${to_channel} بمبلغ ${parsedAmount} ج.م`
    });

    return res.status(200).json({
      success: true,
      data: result.txRecord,
      message: `تم تحويل مبلغ ${parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م بنجاح من ${channelNames[from_channel]} إلى ${channelNames[to_channel]}`
    });
  } catch (err) {
    console.error('Channel transfer error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  GET /api/swm/treasury/main-safe-ledger
//  Returns audit trail of movements in the main warehouse safe with filters & search
// ────────────────────────────────────────────────────
router.get('/main-safe-ledger', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { mainBranch } = await getMainWarehouseSafe();
    const { search, type, channel, start_date, end_date, limit = 200 } = req.query;

    let sql = `
      SELECT tt.*, u.full_name AS created_by_name, u.username AS created_by_username
      FROM treasury_transactions tt
      LEFT JOIN users u ON u.id = tt.created_by
      WHERE (tt.branch_id = ? OR tt.destination_account = 'main_warehouse_safe' OR tt.source_account = 'main_warehouse_safe' OR tt.payment_method = 'channel_transfer')
    `;
    const params = [mainBranch.id];

    if (search && search.trim()) {
      sql += ` AND (tt.entry_number ILIKE ? OR tt.notes ILIKE ? OR u.full_name ILIKE ? OR u.username ILIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (type === 'inflow') {
      sql += ` AND (tt.destination_account = 'main_warehouse_safe' AND tt.payment_method != 'channel_transfer')`;
    } else if (type === 'outflow') {
      sql += ` AND (tt.destination_account != 'main_warehouse_safe' AND tt.payment_method != 'channel_transfer')`;
    } else if (type === 'transfer') {
      sql += ` AND (tt.payment_method = 'channel_transfer' OR tt.source_account LIKE 'main_safe_%')`;
    }

    if (channel && channel !== 'all') {
      sql += ` AND (tt.payment_method = ? OR tt.notes ILIKE ? OR tt.source_account ILIKE ? OR tt.destination_account ILIKE ?)`;
      params.push(channel, `%${channel}%`, `%${channel}%`, `%${channel}%`);
    }

    if (start_date && end_date) {
      sql += ` AND DATE(tt.created_at) >= ? AND DATE(tt.created_at) <= ?`;
      params.push(start_date, end_date);
    }

    sql += ` ORDER BY tt.created_at DESC LIMIT ?`;
    params.push(parseInt(limit, 10) || 200);

    const rows = await query(sql, params);
    return res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('Main safe ledger error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  GET /api/swm/treasury/analytics
//  Visual analytics: channel distribution, expense category breakdown & daily trends
// ────────────────────────────────────────────────────
router.get('/analytics', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { safe } = await getMainWarehouseSafe();

    // 1. Channel Distribution
    const cash = parseFloat(safe.cash_balance || 0);
    const visa = parseFloat(safe.visa_balance || 0);
    const transfer = parseFloat(safe.transfer_balance || 0);
    const total = Math.max(0, cash + visa + transfer);

    const channelDist = [
      { name: 'كاش (نقدي)', key: 'cash', value: cash, percent: total > 0 ? Math.round((cash / total) * 100) : 0, color: '#16a34a' },
      { name: 'حساب بنكي / فيزا', key: 'visa', value: visa, percent: total > 0 ? Math.round((visa / total) * 100) : 0, color: '#0284c7' },
      { name: 'محافظ / تحويلات', key: 'transfer', value: transfer, percent: total > 0 ? Math.round((transfer / total) * 100) : 0, color: '#8b5cf6' }
    ];

    // 2. Expense Category breakdown (last 30 days)
    const expenseRows = await query(`
      SELECT 
        COALESCE(category, 'other') AS category,
        COALESCE(subcategory, category, 'مصروفات أخرى') AS subcategory,
        COUNT(*) AS tx_count,
        SUM(amount) AS total_amount
      FROM expenses
      WHERE status = 'approved' AND expense_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY category, subcategory
      ORDER BY total_amount DESC
      LIMIT 10
    `);

    // 3. Daily Cash Flow Trend (last 14 days)
    const dailyTrend = await query(`
      SELECT 
        TO_CHAR(tt.created_at, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(CASE WHEN tt.destination_account = 'main_warehouse_safe' AND tt.payment_method != 'channel_transfer' THEN tt.amount ELSE 0 END), 0) AS inflows,
        COALESCE(SUM(CASE WHEN tt.destination_account != 'main_warehouse_safe' AND tt.payment_method != 'channel_transfer' THEN tt.amount ELSE 0 END), 0) AS outflows
      FROM treasury_transactions tt
      WHERE tt.created_at >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY TO_CHAR(tt.created_at, 'YYYY-MM-DD')
      ORDER BY day ASC
    `);

    return res.json({
      success: true,
      data: {
        channelDistribution: channelDist,
        expenseBreakdown: expenseRows || [],
        dailyTrend: dailyTrend || []
      }
    });
  } catch (err) {
    console.error('Treasury analytics error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  WITHDRAWAL REASONS & QUICK WITHDRAWAL
// ────────────────────────────────────────────────────

/**
 * GET /api/swm/treasury/withdrawal-reasons
 * List all active withdrawal reasons
 */
router.get('/withdrawal-reasons', requireAuth, async (req, res) => {
  try {
    const reasons = await query(`
      SELECT * FROM withdrawal_reasons
      WHERE is_active = true
      ORDER BY id ASC
    `);
    return res.json({ success: true, data: reasons });
  } catch (err) {
    console.error('Fetch withdrawal reasons error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/treasury/withdrawal-reasons
 * Create a new withdrawal reason / category
 */
router.post('/withdrawal-reasons', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { title, category = 'operational' } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'يرجى كتابة سبب أو بند الصرف' });
    }
    const cleanTitle = title.trim();
    const [created] = await query(`
      INSERT INTO withdrawal_reasons (title, category, is_active)
      VALUES ($1, $2, true)
      ON CONFLICT (title) DO UPDATE SET is_active = true
      RETURNING *
    `, [cleanTitle, category]);

    // Also sync to pos_allowed_expense_recipients in store_settings for all branches
    try {
      const rows = await query(`SELECT value FROM store_settings WHERE key = 'pos_allowed_expense_recipients'`);
      let categories = [];
      if (rows.length > 0 && rows[0].value) {
        categories = JSON.parse(rows[0].value);
      }
      if (Array.isArray(categories) && !categories.includes(cleanTitle)) {
        categories.push(cleanTitle);
        await query(
          `INSERT INTO store_settings (key, value, updated_at) VALUES ('pos_allowed_expense_recipients', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [JSON.stringify(categories)]
        );
      }
    } catch (e) {}

    return res.status(201).json({
      success: true,
      data: created,
      message: 'تم إضافة سبب الصرف بنجاح وتعميمه لكافة الفروع'
    });
  } catch (err) {
    console.error('Create withdrawal reason error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/treasury/quick-withdrawal
 * Disburse cash/funds from main treasury for an expense/reason.
 * Deducts from Main Treasury (solvency checked) and creates an expense record
 * so it immediately reflects in Administrative Journal (اليومية الإدارية).
 */
router.post('/quick-withdrawal', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const {
      amount,
      channel = 'cash',
      reason,
      category = 'operational',
      recipient_name,
      notes
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال مبلغ صحيح وموجب للمسحوبات' });
    }

    const normChannel = ['cash', 'visa', 'transfer'].includes(channel) ? channel : 'cash';
    const reasonText = (reason || 'مسحوبات نثرية').trim();

    // Map to expenses category
    let expCategory = 'utility_bill';
    if (category === 'owner_drawing' || reasonText.includes('صاحب الحساب') || reasonText.includes('مسحوبات شخصية')) {
      expCategory = 'other';
    } else if (category === 'sales_withdrawal' || reasonText.includes('سلفة') || reasonText.includes('بائع') || reasonText.includes('موظف')) {
      expCategory = 'sales_withdrawal';
    } else if (category === 'payroll' || reasonText.includes('راتب')) {
      expCategory = 'payroll';
    } else if (category === 'operational' || category === 'other') {
      expCategory = 'other';
    }

    const fullDescription = [
      reasonText,
      recipient_name ? `المستلم: ${recipient_name.trim()}` : null,
      notes ? notes.trim() : null
    ].filter(Boolean).join(' — ');

    const result = await transaction(async (client) => {
      const { mainBranch } = await getMainWarehouseSafe(client);

      // 1. Deduct from Main Treasury (strict solvency check)
      const deductionRes = await deductFromMainTreasury(client, {
        amount: parsedAmount,
        paymentMethod: normChannel,
        paymentBreakdown: { [normChannel]: parsedAmount },
        destinationAccount: 'quick_withdrawal',
        reason: reasonText,
        refNumber: `WTH-${Date.now().toString().slice(-6)}`,
        userId: req.user.id
      });

      // 2. Insert into expenses for Administrative Journal (اليومية الإدارية)
      const expRef = `EXP-WTH-${Date.now().toString().slice(-6)}`;
      const [expenseRecord] = (await client.query(
        `INSERT INTO expenses (
          expense_ref, branch_id, category, subcategory, amount,
          description, expense_date, recorded_by, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, 'approved', NOW(), NOW())
        RETURNING *`,
        [
          expRef,
          mainBranch.id,
          expCategory,
          reasonText,
          parsedAmount,
          fullDescription,
          req.user.id
        ]
      )).rows;

      // 3. If owner drawings, also log to owner_transactions
      if (category === 'owner_drawing' || reasonText.includes('صاحب الحساب') || reasonText.includes('مسحوبات شخصية')) {
        await client.query(
          `INSERT INTO owner_transactions (transaction_type, amount, channel, notes, created_by, created_at)
           VALUES ('withdrawal', $1, $2, $3, $4, NOW())`,
          [parsedAmount, normChannel, fullDescription, req.user.id]
        );
      }

      return { deductionRes, expenseRecord };
    });

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId || 1,
      actionType: 'QUICK_WITHDRAWAL',
      entityType: 'expenses',
      entityId: result.expenseRecord.id,
      newValue: { amount: parsedAmount, channel: normChannel, reason: reasonText, notes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `صرف مسحوبات من الخزينة الرئيسية بمبلغ ${parsedAmount} ج.م [${reasonText}] عبر قناة ${normChannel}`
    });

    return res.status(201).json({
      success: true,
      data: result.expenseRecord,
      message: `تم صرف مبلغ ${parsedAmount.toLocaleString()} ج.م وخصمه من الخزينة الرئيسية وقيده باليومية الإدارية بنجاح`
    });
  } catch (err) {
    console.error('Quick withdrawal error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  EMPLOYEE PAYROLL & SALARY PAYOUT
// ────────────────────────────────────────────────────

/**
 * GET /api/swm/treasury/employee-payroll-summary/:employeeId
 * Returns employee info, base salary, advances taken this month from expenses,
 * and previous payouts for this month.
 */
router.get('/employee-payroll-summary/:employeeId', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'warehouse_manager']), requireWarehousePermission('payroll'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, start_date, end_date } = req.query;

    let startDate, endDate, targetMonth;
    if (start_date && end_date) {
      startDate = start_date;
      endDate = end_date;
      targetMonth = month || start_date.slice(0, 7);
    } else {
      const now = new Date();
      targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [yearStr, monthStr] = targetMonth.split('-');
      startDate = `${yearStr}-${monthStr}-01`;
      const endOfMonthDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
      endDate = `${yearStr}-${monthStr}-${String(endOfMonthDate).padStart(2, '0')}`;
    }

    // 1. Fetch employee
    const [employee] = await query(`
      SELECT u.id, u.username, u.full_name, u.phone, u.national_id, u.role, u.branch_id,
             COALESCE(u.salary, 0) AS base_salary,
             b.branch_name, b.branch_code
      FROM users u
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE u.id = $1
    `, [employeeId]);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    const baseSalary = parseFloat(employee.base_salary || 0);

    // 2. Fetch advances / withdrawals taken this month
    const advances = await query(`
      SELECT e.id, e.expense_ref, e.amount, e.description, e.subcategory, e.expense_date, e.category
      FROM expenses e
      WHERE e.status = 'approved'
        AND DATE(e.expense_date) >= $1
        AND DATE(e.expense_date) <= $2
        AND COALESCE(e.subcategory, '') != 'salary_payout'
        AND (
          e.recorded_by = $3
          OR (e.description ILIKE $4 AND e.category IN ('sales_withdrawal', 'payroll', 'other'))
        )
      ORDER BY e.expense_date DESC
    `, [startDate, endDate, employee.id, `%${employee.full_name}%`]);

    const advancesTotal = advances.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

    // 3. Fetch payouts recorded for this month
    const previousPayouts = await query(`
      SELECT pp.*, u.full_name AS paid_by_name
      FROM payroll_payouts pp
      LEFT JOIN users u ON u.id = pp.paid_by
      WHERE pp.employee_id = $1 AND pp.payout_month = $2
      ORDER BY pp.paid_at DESC
    `, [employee.id, targetMonth]);

    return res.json({
      success: true,
      data: {
        employee,
        payout_month: targetMonth,
        base_salary: baseSalary,
        advances_total: Math.round(advancesTotal * 100) / 100,
        advances_list: advances,
        previous_payouts: previousPayouts,
        already_paid: previousPayouts.length > 0
      }
    });
  } catch (err) {
    console.error('Employee payroll summary error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/treasury/pay-salary
 * Disburse employee salary:
 * 1. Deducts net_salary from Main Treasury (solvency checked!).
 * 2. Creates record in expenses under category 'payroll', subcategory 'salary_payout'
 *    so it appears immediately in Administrative Journal (اليومية الإدارية).
 * 3. Records voucher in payroll_payouts table.
 */
router.post('/pay-salary', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'warehouse_manager']), requireWarehousePermission('payroll'), async (req, res) => {
  try {
    const {
      employee_id,
      payout_month,
      base_salary,
      advances_deducted = 0,
      deductions = 0,
      deduction_reason,
      bonus = 0,
      bonus_reason,
      channel = 'cash',
      deduct_source = 'main_treasury',
      notes
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد الموظف' });
    }

    const [employee] = await query(`
      SELECT u.id, u.full_name, u.branch_id, u.salary, b.branch_name
      FROM users u
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE u.id = $1
    `, [employee_id]);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }

    const baseSal = parseFloat(base_salary ?? employee.salary ?? 0);
    const advDeducted = parseFloat(advances_deducted || 0);
    const ded = parseFloat(deductions || 0);
    const bns = parseFloat(bonus || 0);

    const netSalary = Math.round((baseSal - advDeducted - ded + bns) * 100) / 100;
    if (netSalary <= 0) {
      return res.status(400).json({
        success: false,
        message: `صافي الراتب المستحق (${netSalary} ج.م) يجب أن يكون أكبر من الصفر لإتمام عملية القبض والصرف`
      });
    }

    const normChannel = ['cash', 'visa', 'transfer'].includes(channel) ? channel : 'cash';
    const month = payout_month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const isBranchSafe = deduct_source === 'branch_safe';

    const result = await transaction(async (client) => {
      const { mainBranch } = await getMainWarehouseSafe(client);

      if (isBranchSafe) {
        if (!employee.branch_id) {
          throw new Error('الموظف غير مرتبط بفرع تجزئة لصرف راتبه من خزينة الفرع. يرجى اختيار الخزينة الرئيسية.');
        }

        let { rows: [branchSafe] } = await client.query(
          `SELECT * FROM branch_safes WHERE branch_id = $1 FOR UPDATE`,
          [employee.branch_id]
        );
        if (!branchSafe) {
          const { rows: [newSafe] } = await client.query(
            `INSERT INTO branch_safes (branch_id, safe_name, cash_balance, visa_balance, transfer_balance)
             VALUES ($1, $2, 0, 0, 0) RETURNING *`,
            [employee.branch_id, `خزينة ${employee.branch_name || 'الفرع'}`]
          );
          branchSafe = newSafe;
        }

        const chanCol = `${normChannel}_balance`;
        const prevBal = parseFloat(branchSafe[chanCol] || 0);
        if (netSalary > prevBal + 0.01) {
          throw new Error(
            `رصيد ${normChannel === 'cash' ? 'الكاش' : normChannel === 'visa' ? 'الفيزا' : 'التحويل'} بخزينة فرع (${employee.branch_name || 'الفرع'}) غير كافٍ. المتاح: ${prevBal.toLocaleString()} ج.م والمطلوب: ${netSalary.toLocaleString()} ج.م`
          );
        }

        const newBal = Math.max(0, Math.round((prevBal - netSalary) * 100) / 100);
        await client.query(
          `UPDATE branch_safes SET ${chanCol} = $1, updated_at = NOW() WHERE id = $2`,
          [newBal, branchSafe.id]
        );

        // Update register balance for branch
        await client.query(
          `UPDATE cash_registers SET current_balance = GREATEST(0, current_balance - $1), updated_at = NOW() WHERE branch_id = $2`,
          [netSalary, employee.branch_id]
        );

        // Record audit entry in treasury_transactions
        const entryNum = `OUTFLOW-BR-${Date.now().toString().slice(-8)}`;
        await client.query(
          `INSERT INTO treasury_transactions (
             entry_number, branch_id, safe_id, source_account, destination_account,
             payment_method, amount, previous_safe_balance, new_safe_balance, created_by, notes, created_at
           ) VALUES ($1, $2, $3, 'branch_safe', 'payroll', $4, $5, $6, $7, $8, $9, NOW())`,
          [
            entryNum,
            employee.branch_id,
            branchSafe.id,
            normChannel,
            netSalary,
            prevBal,
            newBal,
            req.user.id,
            `صرف راتب شهر ${month} للموظف: ${employee.full_name} خصماً من خزينة فرع (${employee.branch_name})`
          ]
        );
      } else {
        // 1. Deduct net salary from Main Treasury (verifies sufficient balance in channel)
        await deductFromMainTreasury(client, {
          amount: netSalary,
          paymentMethod: normChannel,
          paymentBreakdown: { [normChannel]: netSalary },
          destinationAccount: 'payroll',
          reason: `صرف راتب شهر ${month} للموظف: ${employee.full_name}`,
          refNumber: `PAY-${employee.id}-${month.replace('-', '')}`,
          userId: req.user.id
        });
      }

      // 2. Insert into expenses for Administrative Journal (اليومية الإدارية)
      const expRef = `EXP-PAY-${Date.now().toString().slice(-6)}`;
      const sourceLabel = isBranchSafe ? `خزينة فرع (${employee.branch_name})` : 'الخزينة الرئيسية';
      const expDesc = `المستلم: ${employee.full_name} — صرف راتب شهر ${month} من [${sourceLabel}] (أساسي: ${baseSal.toLocaleString()} ج.م - سلف: ${advDeducted.toLocaleString()} ج.م - خصم: ${ded.toLocaleString()} ج.م${bns > 0 ? ` + حوافز: ${bns.toLocaleString()} ج.م` : ''})${notes ? ` | ${notes}` : ''}`;

      const [expenseRecord] = (await client.query(
        `INSERT INTO expenses (
          expense_ref, branch_id, category, subcategory, amount,
          description, expense_date, recorded_by, status, created_at, updated_at
        )
        VALUES ($1, $2, 'payroll', 'salary_payout', $3, $4, CURRENT_DATE, $5, 'approved', NOW(), NOW())
        RETURNING *`,
        [
          expRef,
          employee.branch_id || mainBranch.id,
          netSalary,
          expDesc,
          req.user.id
        ]
      )).rows;

      // 3. Insert into payroll_payouts table
      const [payoutRecord] = (await client.query(
        `INSERT INTO payroll_payouts (
          employee_id, employee_name, branch_id, payout_month,
          base_salary, advances_deducted, deductions, deduction_reason,
          bonus, bonus_reason, net_salary, channel, paid_by, notes, expense_id, deduct_source, paid_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
        RETURNING *`,
        [
          employee.id,
          employee.full_name,
          employee.branch_id || null,
          month,
          baseSal,
          advDeducted,
          ded,
          deduction_reason || null,
          bns,
          bonus_reason || null,
          netSalary,
          normChannel,
          req.user.id,
          notes || null,
          expenseRecord.id,
          isBranchSafe ? 'branch_safe' : 'main_treasury'
        ]
      )).rows;

      return { expenseRecord, payoutRecord };
    });

    logActivity({
      userId: req.user.id,
      branchId: employee.branch_id || req.user.branchId || 1,
      actionType: 'PAYROLL_DISBURSED',
      entityType: 'payroll_payouts',
      entityId: result.payoutRecord.id,
      newValue: {
        employee_id: employee.id,
        employee_name: employee.full_name,
        month,
        net_salary: netSalary,
        channel: normChannel
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `صرف راتب الموظف ${employee.full_name} لشهر ${month} بمبلغ صافي ${netSalary} ج.م عبر ${normChannel}`
    });

    return res.status(201).json({
      success: true,
      data: result.payoutRecord,
      message: `تم صرف راتب الموظف ${employee.full_name} بنجاح بمبلغ صافي ${netSalary.toLocaleString()} ج.م، وخصمه من الخزينة وقيده باليومية الإدارية`
    });
  } catch (err) {
    console.error('Pay salary error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/treasury/payroll-history
 * Returns recent payroll payouts
 */
router.get('/payroll-history', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'warehouse_manager']), requireWarehousePermission('payroll'), async (req, res) => {
  try {
    const { month, start_date, end_date, limit = 100 } = req.query;
    let sql = `
      SELECT pp.*, b.branch_name, b.branch_code, u.full_name AS paid_by_name
      FROM payroll_payouts pp
      LEFT JOIN branches b ON b.id = pp.branch_id
      LEFT JOIN users u ON u.id = pp.paid_by
      WHERE 1=1
    `;
    const params = [];
    if (start_date && end_date) {
      sql += ` AND DATE(pp.paid_at) >= ? AND DATE(pp.paid_at) <= ?`;
      params.push(start_date, end_date);
    } else if (month && month !== 'all') {
      sql += ` AND pp.payout_month = ?`;
      params.push(month);
    }
    sql += ` ORDER BY pp.paid_at DESC LIMIT ?`;
    params.push(parseInt(limit, 10) || 100);

    const rows = await query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Payroll history error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────
//  BULK PAYROLL PREVIEW & BULK PAYOUT
// ────────────────────────────────────────────────────

/**
 * GET /api/swm/treasury/bulk-payroll-preview
 * Returns list of all active employees with computed base salary, advances taken,
 * and already paid status for the given month.
 */
router.get('/bulk-payroll-preview', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'warehouse_manager']), requireWarehousePermission('payroll'), async (req, res) => {
  try {
    const { month } = req.query;
    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = targetMonth.split('-');
    const startDate = `${yearStr}-${monthStr}-01`;
    const endOfMonthDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
    const endDate = `${yearStr}-${monthStr}-${String(endOfMonthDate).padStart(2, '0')}`;

    const employees = await query(`
      SELECT u.id, u.username, u.full_name, u.phone, u.role, u.branch_id,
             COALESCE(u.salary, 0) AS base_salary,
             b.branch_name, b.branch_code
      FROM users u
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE u.status = 'active'
      ORDER BY b.branch_name NULLS LAST, u.full_name ASC
    `);

    // Fetch advances taken this month
    const advances = await query(`
      SELECT e.recorded_by, e.description, e.amount
      FROM expenses e
      WHERE e.status = 'approved'
        AND DATE(e.expense_date) >= $1 AND DATE(e.expense_date) <= $2
        AND COALESCE(e.subcategory, '') != 'salary_payout'
    `, [startDate, endDate]);

    // Fetch previous payouts for this month
    const payouts = await query(`
      SELECT pp.employee_id, pp.net_salary, pp.paid_at
      FROM payroll_payouts pp
      WHERE pp.payout_month = $1
    `, [targetMonth]);

    const advancesMap = {};
    for (const a of advances) {
      if (a.recorded_by) {
        advancesMap[a.recorded_by] = (advancesMap[a.recorded_by] || 0) + parseFloat(a.amount || 0);
      }
    }

    const paidMap = {};
    for (const p of payouts) {
      paidMap[p.employee_id] = p;
    }

    const list = employees.map(emp => {
      const baseSalary = parseFloat(emp.base_salary || 0);
      const advancesTotal = advancesMap[emp.id] || 0;
      const alreadyPaid = !!paidMap[emp.id];
      const netSalary = Math.max(0, Math.round((baseSalary - advancesTotal) * 100) / 100);
      return {
        employee_id: emp.id,
        username: emp.username,
        full_name: emp.full_name,
        branch_id: emp.branch_id,
        branch_name: emp.branch_name || 'الفرع الرئيسي',
        role: emp.role,
        base_salary: baseSalary,
        advances_total: Math.round(advancesTotal * 100) / 100,
        already_paid: alreadyPaid,
        net_salary: netSalary
      };
    });

    return res.json({
      success: true,
      data: {
        payout_month: targetMonth,
        employees: list
      }
    });
  } catch (err) {
    console.error('Bulk payroll preview error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/treasury/bulk-pay-salary
 * Disburses salaries for multiple selected employees in a single atomic transaction
 */
router.post('/bulk-pay-salary', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'warehouse_manager']), requireWarehousePermission('payroll'), async (req, res) => {
  try {
    const { payout_month, channel = 'cash', employees = [] } = req.body;
    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد موظف واحد على الأقل للصرف' });
    }

    const normChannel = ['cash', 'visa', 'transfer'].includes(channel) ? channel : 'cash';
    const month = payout_month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    let totalDisbursed = 0;
    const validatedList = [];

    for (const item of employees) {
      const empId = parseInt(item.employee_id, 10);
      const net = parseFloat(item.net_salary || 0);
      if (empId && net > 0) {
        totalDisbursed += net;
        validatedList.push({
          employee_id: empId,
          base_salary: parseFloat(item.base_salary || 0),
          advances_deducted: parseFloat(item.advances_deducted || 0),
          deductions: parseFloat(item.deductions || 0),
          deduction_reason: item.deduction_reason || null,
          bonus: parseFloat(item.bonus || 0),
          bonus_reason: item.bonus_reason || null,
          net_salary: net,
          employee_name: item.employee_name || 'موظف',
          branch_id: item.branch_id || null,
          notes: item.notes || null
        });
      }
    }

    totalDisbursed = Math.round(totalDisbursed * 100) / 100;
    if (totalDisbursed <= 0 || validatedList.length === 0) {
      return res.status(400).json({ success: false, message: 'لا يوجد صافي رواتب مستحقة للصرف للموظفين المحددين' });
    }

    const result = await transaction(async (client) => {
      const { mainBranch } = await getMainWarehouseSafe(client);

      // 1. Deduct total amount from Main Treasury
      await deductFromMainTreasury(client, {
        amount: totalDisbursed,
        paymentMethod: normChannel,
        paymentBreakdown: { [normChannel]: totalDisbursed },
        destinationAccount: 'bulk_payroll_payout',
        reason: `صرف مسير رواتب مجمع لشهر ${month} لعدد (${validatedList.length}) موظف`,
        refNumber: `BULK-PAY-${Date.now().toString().slice(-6)}`,
        userId: req.user.id
      });

      // 2. Insert records for each employee
      for (const emp of validatedList) {
        const expRef = `EXP-PAY-${Date.now().toString().slice(-6)}-${emp.employee_id}`;
        const desc = `صرف راتب شهر ${month} - الموظف: ${emp.employee_name} [أساسي: ${emp.base_salary} - سلف: ${emp.advances_deducted} - خصم: ${emp.deductions} + حوافز: ${emp.bonus}]`;

        const { rows: [expenseRec] } = await client.query(
          `INSERT INTO expenses (
             expense_ref, branch_id, category, subcategory, amount,
             description, expense_date, recorded_by, status, created_at, updated_at
           ) VALUES ($1, $2, 'payroll', 'salary_payout', $3, $4, CURRENT_DATE, $5, 'approved', NOW(), NOW())
           RETURNING *`,
          [expRef, emp.branch_id || mainBranch.id, emp.net_salary, desc, req.user.id]
        );

        await client.query(
          `INSERT INTO payroll_payouts (
             employee_id, employee_name, branch_id, payout_month,
             base_salary, advances_deducted, deductions, deduction_reason,
             bonus, bonus_reason, net_salary, channel, paid_by, notes, expense_id, deduct_source, paid_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'main_treasury', NOW())`,
          [
            emp.employee_id,
            emp.employee_name,
            emp.branch_id,
            month,
            emp.base_salary,
            emp.advances_deducted,
            emp.deductions,
            emp.deduction_reason,
            emp.bonus,
            emp.bonus_reason,
            emp.net_salary,
            normChannel,
            req.user.id,
            emp.notes,
            expenseRec.id
          ]
        );
      }

      return { count: validatedList.length, total: totalDisbursed };
    });

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId || 1,
      actionType: 'BULK_PAYROLL_PAYOUT',
      entityType: 'payroll_payouts',
      entityId: 0,
      newValue: { month, count: result.count, total: result.total, channel: normChannel },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `صرف مسير رواتب مجمع لشهر ${month} لعدد ${result.count} موظف بإجمالي ${result.total} ج.م عبر ${normChannel}`
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: `تم صرف مسير الرواتب بنجاح لعدد (${result.count}) موظف بإجمالي مبلغ ${result.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م من الخزينة`
    });
  } catch (err) {
    console.error('Bulk payroll error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;


