const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireBranchScope, requireRole, requireWarehousePermission } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');
const { executeEodShiftClosure } = require('../services/shiftClosingService');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

router.use((req, res, next) => {
  if (!req.user && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (e) {}
  }
  if (req.user && req.user.role === 'warehouse_manager') {
    return res.status(403).json({
      success: false,
      message: 'غير مسموح لحساب مدير المخازن بالوصول إلى نقاط البيع والعمليات اليومية'
    });
  }
  next();
});

/**
 * Helper to get or create default cash register for branch
 */
async function getOrCreateBranchRegister(branchId) {
  let [register] = await query(
    `SELECT * FROM cash_registers WHERE branch_id = $1 ORDER BY is_main DESC, id ASC LIMIT 1`,
    [branchId]
  );

  if (!register) {
    const regCode = `REG-B${branchId}-01`;
    const [created] = await query(
      `INSERT INTO cash_registers (
        register_code, branch_id, register_name, is_main, current_balance,
        opening_balance, status, created_at, updated_at
      ) VALUES ($1, $2, $3, true, 0, 0, 'closed', NOW(), NOW())
      RETURNING *`,
      [regCode, branchId, `Main Register Branch ${branchId}`]
    );
    register = created;
  }

  return register;
}

/**
 * Single Source of Truth helper:
 * Resolves the exact payment method breakdown for an invoice or return,
 * strictly guaranteeing that: cash + card + transfer === finalAmount
 */
function resolveInvoicePaymentBreakdown(inv) {
  const finalAmt = Math.max(0, Math.round(parseFloat(inv.final_amount || 0) * 100) / 100);
  if (finalAmt === 0) {
    return { cash: 0, card: 0, transfer: 0 };
  }

  let bd = inv.payment_breakdown;
  if (typeof bd === 'string') {
    try { bd = JSON.parse(bd); } catch (e) { bd = {}; }
  }

  let rawCash = Math.max(0, parseFloat(bd?.cash || 0));
  let rawCard = Math.max(0, parseFloat(bd?.card || 0));
  let rawTransfer = Math.max(0, parseFloat(bd?.transfer || 0));
  let rawSum = Math.round((rawCash + rawCard + rawTransfer) * 100) / 100;

  // If no breakdown recorded or sum is 0, default to cash
  if (rawSum === 0) {
    return { cash: finalAmt, card: 0, transfer: 0 };
  }

  // If exact match already, return rounded
  if (Math.abs(rawSum - finalAmt) < 0.001) {
    const rCash = Math.round(rawCash * 100) / 100;
    const rCard = Math.round(rawCard * 100) / 100;
    const rTransfer = Math.round((finalAmt - rCash - rCard) * 100) / 100;
    return { cash: rCash, card: rCard, transfer: rTransfer };
  }

  // Non-cash electronic payments (Card, Transfer) are fixed swiped/transferred amounts.
  // If card + transfer <= finalAmt, the remainder is cash.
  if (Math.round((rawCard + rawTransfer) * 100) / 100 <= finalAmt) {
    const rCard = Math.round(rawCard * 100) / 100;
    const rTransfer = Math.round(rawTransfer * 100) / 100;
    const rCash = Math.max(0, Math.round((finalAmt - rCard - rTransfer) * 100) / 100);
    return { cash: rCash, card: rCard, transfer: rTransfer };
  }

  // Otherwise, scale proportionally across the tendered methods so they strictly equal finalAmt
  const scale = finalAmt / rawSum;
  const scaledCard = Math.round(rawCard * scale * 100) / 100;
  const scaledTransfer = Math.round(rawTransfer * scale * 100) / 100;
  const allocatedCash = Math.max(0, Math.round((finalAmt - scaledCard - scaledTransfer) * 100) / 100);

  return { cash: allocatedCash, card: scaledCard, transfer: scaledTransfer };
}

/**
 * GET /api/swm/pos/session/current
 * Return active session state and today's cash metrics for cashier
 */
router.get('/session/current', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const register = await getOrCreateBranchRegister(branchId);

    // Auto-close check if session spans past 1:00 AM cutoff
    if (register.status === 'open') {
      const now = new Date();
      const lastUpdated = new Date(register.updated_at || register.created_at);
      const today1Am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0, 0);
      if (lastUpdated < today1Am && now >= today1Am) {
        await query(
          `UPDATE cash_registers SET status = 'closed', last_transfer_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [register.id]
        );
        register.status = 'closed';
      }
    }

    // Get today's total sales and transaction count
    const [metrics] = await query(
      `SELECT COUNT(id) AS sales_count,
              COALESCE(SUM(final_amount), 0) AS total_sales_amount
       FROM swm_sales_invoices
       WHERE branch_id = $1
         AND DATE(invoice_date) = CURRENT_DATE
         AND status = 'completed'`,
      [branchId]
    );

    return res.json({
      success: true,
      data: {
        register,
        is_open: register.status === 'open',
        current_balance: parseFloat(register.current_balance) || 0,
        opening_balance: parseFloat(register.opening_balance) || 0,
        today_sales_count: parseInt(metrics?.sales_count || 0, 10),
        today_sales_total: parseFloat(metrics?.total_sales_amount || 0)
      }
    });
  } catch (err) {
    console.error('POS current session error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/pos/seller-dashboard
 * Returns ONLY the essential transactional cards for the Seller's App:
 * 1. Daily Sales Total (simplistic)
 * 2. Total Daily Returns
 * 3. Cash Drawer Balance (simple)
 */
router.get('/seller-dashboard', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const register = await getOrCreateBranchRegister(branchId);

    // 1. Daily Sales Total
    const [salesRow] = await query(
      `SELECT COUNT(id) AS sales_count,
              COALESCE(SUM(final_amount), 0) AS daily_sales_total
       FROM swm_sales_invoices
       WHERE branch_id = $1
         AND DATE(invoice_date) = CURRENT_DATE
         AND status = 'completed'`,
      [branchId]
    );

    // 2. Total Daily Returns
    const [returnsRow] = await query(
      `SELECT COUNT(id) AS returns_count,
              COALESCE(SUM(final_amount), 0) AS total_daily_returns
       FROM swm_sales_invoices
       WHERE branch_id = $1
         AND DATE(invoice_date) = CURRENT_DATE
         AND status = 'returned'`,
      [branchId]
    );

    // 3. Cash Drawer Balance
    const cashDrawerBalance = parseFloat(register.current_balance || 0);

    return res.json({
      success: true,
      data: {
        daily_sales_total: parseFloat(salesRow?.daily_sales_total || 0),
        sales_count: parseInt(salesRow?.sales_count || 0, 10),
        total_daily_returns: parseFloat(returnsRow?.total_daily_returns || 0),
        returns_count: parseInt(returnsRow?.returns_count || 0, 10),
        cash_drawer_balance: cashDrawerBalance,
        register_status: register.status || 'closed',
        register_code: register.register_code,
        branch_id: branchId
      }
    });
  } catch (err) {
    console.error('POS seller-dashboard error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/pos/session/open
 * Open cash drawer with initial cash
 */
router.post('/session/open', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const { opening_balance = 0, notes } = req.body;
    const initialCash = Math.max(0, parseFloat(opening_balance) || 0);

    const register = await getOrCreateBranchRegister(branchId);

    if (register.status === 'open') {
      return res.status(400).json({
        success: false,
        message: 'A cash session is already open on this register'
      });
    }

    const [updated] = await query(
      `UPDATE cash_registers
       SET status = 'open',
           opening_balance = $1,
           current_balance = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [initialCash, register.id]
    );

    logActivity({
      userId: req.user.id,
      branchId,
      actionType: 'POS_SESSION_OPEN',
      entityType: 'cash_registers',
      entityId: register.id,
      newValue: { opening_balance: initialCash, notes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `POS Session opened with cash ${initialCash} EGP by user ${req.user.id}`
    });

    return res.json({
      success: true,
      data: updated,
      message: 'Cash drawer session opened successfully'
    });
  } catch (err) {
    console.error('POS open session error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/pos/shift/current
 * Return active shift, live calculated snapshot, and branch safe balances
 */
router.get('/shift/current', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const register = await getOrCreateBranchRegister(branchId);

    // Fetch active shift
    let [activeShift] = await query(
      `SELECT * FROM pos_shifts 
       WHERE branch_id = $1 AND register_id = $2 AND status = 'open' 
       ORDER BY id DESC LIMIT 1`,
      [branchId, register.id]
    );

    // Fetch branch safe
    let [branchSafe] = await query(
      `SELECT * FROM branch_safes WHERE branch_id = $1`,
      [branchId]
    );

    if (!branchSafe) {
      const [branch] = await query(`SELECT branch_name FROM branches WHERE id = $1`, [branchId]);
      const [created] = await query(
        `INSERT INTO branch_safes (branch_id, safe_name, cash_balance, visa_balance, transfer_balance)
         VALUES ($1, $2, 0, 0, 0) RETURNING *`,
        [branchId, `خزينة ${branch?.branch_name || branchId}`]
      );
      branchSafe = created;
    }

    const shiftStartTime = activeShift?.opened_at || register.updated_at || new Date(new Date().setHours(0,0,0,0));

    // Live aggregated sales
    const salesInvoices = await query(
      `SELECT * FROM swm_sales_invoices 
       WHERE branch_id = $1 AND status = 'completed'
         AND (shift_id = $2 OR (shift_id IS NULL AND invoice_date >= $3))`,
      [branchId, activeShift?.id || 0, shiftStartTime]
    );

    const returnInvoices = await query(
      `SELECT * FROM swm_sales_invoices 
       WHERE branch_id = $1 AND status = 'returned'
         AND (shift_id = $2 OR (shift_id IS NULL AND invoice_date >= $3))`,
      [branchId, activeShift?.id || 0, shiftStartTime]
    );

    const expenses = await query(
      `SELECT * FROM expenses 
       WHERE branch_id = $1 AND status = 'approved'
         AND (shift_id = $2 OR (shift_id IS NULL AND expense_date >= $3))`,
      [branchId, activeShift?.id || 0, shiftStartTime]
    );

    let grossCash = 0, grossVisa = 0, grossTrf = 0, grossTotal = 0;
    for (const inv of salesInvoices) {
      const amt = parseFloat(inv.final_amount || 0);
      const bd = resolveInvoicePaymentBreakdown(inv);
      grossCash += bd.cash;
      grossVisa += bd.card;
      grossTrf += bd.transfer;
      grossTotal += amt;
    }

    let retCash = 0, retVisa = 0, retTrf = 0, retTotal = 0;
    for (const ret of returnInvoices) {
      const amt = parseFloat(ret.final_amount || 0);
      const bd = resolveInvoicePaymentBreakdown(ret);
      retCash += bd.cash;
      retVisa += bd.card;
      retTrf += bd.transfer;
      retTotal += amt;
    }

    let expCash = 0, expVisa = 0, expTrf = 0;
    for (const exp of expenses) {
      const amt = parseFloat(exp.amount || 0);
      const isRef = exp.category === 'refunded_expense';
      const m = (exp.payment_method || 'cash').toLowerCase();
      const mult = isRef ? -1 : 1;
      if (m === 'card' || m === 'visa') expVisa += (amt * mult);
      else if (m === 'transfer') expTrf += (amt * mult);
      else expCash += (amt * mult);
    }

    const netCash = Math.round((grossCash - retCash - expCash) * 100) / 100;
    const netVisa = Math.round((grossVisa - retVisa - expVisa) * 100) / 100;
    const netTrf = Math.round((grossTrf - retTrf - expTrf) * 100) / 100;
    const netRevenue = Math.round((netCash + netVisa + netTrf) * 100) / 100;

    const openingFloat = parseFloat(activeShift?.opening_float || register.opening_balance || 0);
    const expectedDrawerCash = Math.round((openingFloat + netCash) * 100) / 100;

    return res.json({
      success: true,
      data: {
        active_shift: activeShift || {
          shift_code: `PENDING-OPEN`,
          status: register.status,
          opening_float: openingFloat
        },
        register,
        branch_safe: {
          id: branchSafe.id,
          safe_name: branchSafe.safe_name,
          cash_balance: parseFloat(branchSafe.cash_balance || 0),
          visa_balance: parseFloat(branchSafe.visa_balance || 0),
          transfer_balance: parseFloat(branchSafe.transfer_balance || 0),
          total_balance: Math.round((parseFloat(branchSafe.cash_balance || 0) + parseFloat(branchSafe.visa_balance || 0) + parseFloat(branchSafe.transfer_balance || 0)) * 100) / 100
        },
        live_snapshot: {
          opening_float: openingFloat,
          gross_sales: { cash: grossCash, visa: grossVisa, transfer: grossTrf, total: grossTotal },
          returns: { cash: retCash, visa: retVisa, transfer: retTrf, total: retTotal },
          expenses: { cash: expCash, visa: expVisa, transfer: expTrf, total: expCash + expVisa + expTrf },
          net_revenue: { net_cash: netCash, net_visa: netVisa, net_transfer: netTrf, total: netRevenue },
          expected_drawer_cash: expectedDrawerCash
        }
      }
    });
  } catch (err) {
    console.error('POS current shift error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/pos/shift/close
 * POST /api/swm/pos/session/close
 * End-of-Day (EOD) Shift Closure & Fund Transfer to Main Branch Safe
 * Wrapped in strict ACID Database Transaction with row-level locks
 */
const handleShiftCloseEndpoint = async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const { actual_cash, next_opening_float, notes } = req.body;

    const result = await executeEodShiftClosure({
      branchId,
      closedBy: req.user?.id || null,
      actualCashCounted: actual_cash !== undefined && !isNaN(parseFloat(actual_cash)) ? parseFloat(actual_cash) : undefined,
      nextOpeningFloat: next_opening_float !== undefined && !isNaN(parseFloat(next_opening_float)) ? parseFloat(next_opening_float) : undefined,
      closureType: 'manual',
      notes: notes || 'Manual EOD Shift Closure & Fund Transfer'
    });

    logActivity({
      userId: req.user.id,
      branchId,
      actionType: 'EOD_SHIFT_CLOSE',
      entityType: 'pos_shifts',
      entityId: result.closed_shift.id,
      newValue: {
        closed_shift_code: result.closed_shift.shift_code,
        net_revenue: result.snapshot.net_revenue,
        transferred_to_safe: result.snapshot.transferred_to_safe,
        branch_safe: result.branch_safe,
        new_shift_code: result.new_shift.shift_code
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `إغلاق يدوي للوردية وتصفير الدرج وترحيل صافي الإيرادات (${result.snapshot.transferred_to_safe.total} ج.م) لخزينة الفرع`
    });

    return res.json({
      success: true,
      message: 'تم إغلاق الوردية وتصفير الدرج وترحيل صافي الإيرادات لخزينة الفرع بنجاح',
      data: {
        ...result,
        register: result.updated_register,
        expected_cash: result.snapshot.drawer_reconciliation.expected_cash,
        actual_cash: result.snapshot.drawer_reconciliation.actual_cash_counted,
        discrepancy: result.snapshot.drawer_reconciliation.discrepancy
      }
    });
  } catch (err) {
    console.error('POS shift close error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/shift/close', requireAuth, requireBranchScope, handleShiftCloseEndpoint);
router.post('/session/close', requireAuth, requireBranchScope, handleShiftCloseEndpoint);

/**
 * POST /api/swm/pos/session/auto-close
 * Manually trigger or verify automated 1:00 AM shift closing across open branches
 */
router.post('/session/auto-close', requireAuth, requireRole(['super_admin', 'admin', 'supervisor']), async (req, res) => {
  try {
    const { autoCloseDailyShifts } = require('../cron/shiftClosingJob');
    const result = await autoCloseDailyShifts();
    return res.json({
      success: true,
      message: `تم فحص وإغلاق الورديات التلقائي وترحيل الأرصدة بنجاح. عدد الورديات المغلقة: ${result?.closedCount || 0}`,
      data: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/pos/session/cash-in-out
 * Petty cash movements (Cash Drop, Petty Expense, Change Add)
 */
router.post('/session/cash-in-out', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const { type, amount, reason } = req.body;

    if (!['cash_in', 'cash_out'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be cash_in or cash_out' });
    }

    const movAmount = parseFloat(amount);
    if (!movAmount || movAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason for cash movement is required' });
    }

    const register = await getOrCreateBranchRegister(branchId);

    if (register.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Register must be open to perform cash movements' });
    }

    const currentBal = parseFloat(register.current_balance) || 0;
    if (type === 'cash_out' && movAmount > currentBal) {
      return res.status(400).json({
        success: false,
        message: `Insufficient cash in drawer. Current balance: ${currentBal} EGP`
      });
    }

    const newBal = type === 'cash_in' ? currentBal + movAmount : currentBal - movAmount;

    const [updated] = await query(
      `UPDATE cash_registers
       SET current_balance = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newBal, register.id]
    );

    logActivity({
      userId: req.user.id,
      branchId,
      actionType: 'POS_CASH_MOVEMENT',
      entityType: 'cash_registers',
      entityId: register.id,
      newValue: { type, amount: movAmount, balance_after: newBal, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `${type === 'cash_in' ? 'Cash In' : 'Cash Out'} of ${movAmount} EGP: ${reason}`
    });

    return res.json({
      success: true,
      data: updated,
      new_balance: newBal,
      message: `${type === 'cash_in' ? 'Cash Added' : 'Cash Withdrawn'} successfully`
    });
  } catch (err) {
    console.error('POS cash movement error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/pos/search
 * High-speed catalog & barcode search for cashier terminal
 */
router.get('/search', requireAuth, requireBranchScope, async (req, res) => {
  try {
    let branchId = req.scopedBranchId;
    if (!branchId || branchId === 'all' || isNaN(parseInt(branchId, 10))) {
      branchId = 1;
    } else {
      branchId = parseInt(branchId, 10);
    }
    const { query: searchQuery, category_id } = req.query;

    const whereClauses = [`p.status = 'active'`];
    const params = [branchId];
    let pIdx = 2;

    if (category_id && category_id !== 'all') {
      whereClauses.push(`p.category_id = $${pIdx++}`);
      params.push(parseInt(category_id, 10));
    }

    if (searchQuery && searchQuery.trim()) {
      const clean = searchQuery.trim();
      whereClauses.push(`(
        p.barcode = $${pIdx}
        OR pv.variant_sku = $${pIdx}
        OR p.product_code ILIKE $${pIdx + 1}
        OR p.product_name ILIKE $${pIdx + 1}
        OR p.brand ILIKE $${pIdx + 1}
        OR pv.variant_sku ILIKE $${pIdx + 1}
      )`);
      params.push(clean, `%${clean}%`);
      pIdx += 2;
    }

    const sql = `
      SELECT p.id AS product_id,
             p.product_code,
             p.barcode AS product_barcode,
             p.product_name,
             p.brand,
             p.category_id,
             c.category_name,
             p.selling_price,
             p.sale_price,
             p.cost_price,
             pv.id AS variant_id,
             pv.variant_sku,
             pv.color,
             pv.size,
             pv.price_modifier,
             COALESCE(ib_var.available_qty, ib_base.available_qty, 0) AS available_qty
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.status = 'active'
      LEFT JOIN inventory_balances ib_var ON ib_var.product_id = p.id
                                         AND ib_var.variant_id = pv.id
                                         AND ib_var.branch_id = $1
      LEFT JOIN inventory_balances ib_base ON ib_base.product_id = p.id
                                          AND ib_base.variant_id IS NULL
                                          AND ib_base.branch_id = $1
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY p.id DESC, pv.id ASC
      LIMIT 60
    `;

    const results = await query(sql, params);

    const formatted = results.map(row => {
      const basePrice = parseFloat(row.sale_price || row.selling_price) || 0;
      const modifier = parseFloat(row.price_modifier || 0);
      const finalPrice = Math.max(0, basePrice + modifier);

      return {
        product_id: row.product_id,
        variant_id: row.variant_id || null,
        product_code: row.product_code,
        barcode: row.variant_sku || row.product_barcode,
        product_name: row.product_name,
        category_id: row.category_id,
        category_name: row.category_name,
        color: row.color,
        size: row.size,
        display_name: row.variant_sku
          ? `${row.product_name} (${row.color || ''} / ${row.size || ''})`
          : row.product_name,
        unit_price: finalPrice,
        cost_price: parseFloat(row.cost_price) || 0,
        available_qty: parseInt(row.available_qty, 10)
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('POS product search error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/pos/sale
 * Execute atomic retail sale with stock deduction and receipt generation
 */
router.post('/sale', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const {
      customer_name = 'Walk-in Customer',
      customer_phone,
      customer_address,
      salesperson_id,
      discount_amount = 0,
      tax_amount = 0,
      payment_method = 'cash', // 'cash', 'card', 'transfer', 'multi', 'split'
      payment_breakdown = { cash: 0, card: 0, transfer: 0 },
      notes,
      items
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Sale items are required' });
    }

    // Check cash register if cash is part of the sale
    const register = await getOrCreateBranchRegister(branchId);
    let cashPortion = 0;
    if (payment_method === 'cash') {
      cashPortion = null; // full amount
    } else if (payment_method === 'card' || payment_method === 'transfer') {
      cashPortion = 0;
    } else {
      cashPortion = parseFloat(payment_breakdown?.cash || 0);
    }

    // Auto-open cash register if it's closed so cashier is never blocked
    if (payment_method === 'cash' || cashPortion > 0) {
      if (register.status !== 'open') {
        await query(
          `UPDATE cash_registers
           SET status = 'open',
               opening_balance = COALESCE(opening_balance, 0),
               current_balance = COALESCE(current_balance, 0),
               updated_at = NOW()
           WHERE id = $1`,
          [register.id]
        );
        register.status = 'open';
      }
    }

    // Generate unique invoice number: INV-YYMM-XXXXX
    const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
    const [{ count }] = await query(`SELECT COUNT(id) AS count FROM swm_sales_invoices`);
    const invNumber = `INV-${yymm}-${String(parseInt(count, 10) + 1).padStart(5, '0')}`;

    // Execute atomic sale transaction
    const saleResult = await transaction(async (client) => {
      let subtotal = 0;
      const preparedItems = [];

      // 1. Lock and validate stock for each item using FOR UPDATE
      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        if (!qty || qty <= 0) {
          throw new Error(`Invalid quantity for item ${item.product_name || item.product_id}`);
        }

        let balanceRow;
        if (item.variant_id) {
          const res = await client.query(
            `SELECT * FROM inventory_balances
             WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3
             FOR UPDATE`,
            [branchId, item.product_id, item.variant_id]
          );
          if (res.rows.length > 0 && parseInt(res.rows[0].available_qty, 10) >= qty) {
            balanceRow = res.rows[0];
          } else {
            // Fallback to base product inventory if variant-specific balance is unseeded or insufficient
            const baseRes = await client.query(
              `SELECT * FROM inventory_balances
               WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL
               FOR UPDATE`,
              [branchId, item.product_id]
            );
            if (baseRes.rows.length > 0 && parseInt(baseRes.rows[0].available_qty, 10) >= qty) {
              balanceRow = baseRes.rows[0];
            } else {
              balanceRow = res.rows[0] || baseRes.rows[0];
            }
          }
        } else {
          const res = await client.query(
            `SELECT * FROM inventory_balances
             WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL
             FOR UPDATE`,
            [branchId, item.product_id]
          );
          balanceRow = res.rows[0];
        }

        const currentStock = balanceRow ? parseInt(balanceRow.available_qty, 10) : 0;
        if (currentStock < qty) {
          throw new Error(
            `Insufficient stock for "${item.product_name || 'Item'}". In stock: ${currentStock}, Requested: ${qty}`
          );
        }

        // Fetch fresh product info for cost_price and names
        const [prod] = (await client.query(
          `SELECT id, product_code, product_name, cost_price FROM products WHERE id = $1`,
          [item.product_id]
        )).rows;

        const unitPrice = parseFloat(item.unit_price);
        const discPct = parseFloat(item.discount_pct || 0);
        const discAmt = parseFloat(item.discount_amount || (unitPrice * qty * (discPct / 100)));
        const finalUnitPrice = (unitPrice * qty - discAmt) / qty;
        const lineTotal = (qty * unitPrice) - discAmt;

        subtotal += lineTotal;

        preparedItems.push({
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: qty,
          unit_price: unitPrice,
          discount_pct: discPct,
          discount_amount: discAmt,
          final_unit_price: finalUnitPrice,
          line_total: lineTotal,
          cost_at_sale: parseFloat(prod?.cost_price || 0),
          product_name: item.product_name || prod?.product_name,
          product_code: prod?.product_code,
          balance_id: balanceRow.id,
          stock_before: currentStock,
          stock_after: currentStock - qty
        });
      }

      // Calculate final financial totals
      const discTotal = parseFloat(discount_amount) || 0;
      const taxTotal = parseFloat(tax_amount) || 0;
      const finalAmount = Math.max(0, subtotal - discTotal + taxTotal);

      // Structure payment breakdown normalized strictly to finalAmount
      let finalBreakdown;
      if (payment_method === 'cash') {
        finalBreakdown = { cash: finalAmount, card: 0, transfer: 0 };
      } else if (payment_method === 'card') {
        finalBreakdown = { cash: 0, card: finalAmount, transfer: 0 };
      } else if (payment_method === 'transfer') {
        finalBreakdown = { cash: 0, card: 0, transfer: finalAmount };
      } else {
        finalBreakdown = resolveInvoicePaymentBreakdown({
          final_amount: finalAmount,
          payment_breakdown
        });
      }

      // Resolve valid salesperson / user ID for relational constraints
      let effectiveUserId = salesperson_id ? parseInt(salesperson_id, 10) : null;
      if (!effectiveUserId) {
        if (!req.user.isBranchAccount) {
          effectiveUserId = req.user.id;
        } else {
          // If branch account, find active user in this branch or fallback to admin
          const userRows = (await client.query(
            `SELECT id FROM users WHERE branch_id = $1 AND status = 'active' ORDER BY id ASC LIMIT 1`,
            [branchId]
          )).rows;
          if (userRows.length > 0) {
            effectiveUserId = userRows[0].id;
          } else {
            const adminRows = (await client.query(
              `SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`
            )).rows;
            effectiveUserId = adminRows.length > 0 ? adminRows[0].id : 1;
          }
        }
      }

      // 2. Insert into swm_sales_invoices
      const [invoice] = (await client.query(
        `INSERT INTO swm_sales_invoices (
          invoice_number, branch_id, salesperson_id, customer_name,
          customer_phone, customer_address, invoice_date, subtotal, discount_amount,
          tax_amount, final_amount, payment_breakdown, payment_status,
          notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, 'paid', $12, 'completed', NOW(), NOW())
        RETURNING *`,
        [
          invNumber,
          branchId,
          effectiveUserId,
          customer_name || 'Walk-in Customer',
          customer_phone || null,
          customer_address || null,
          subtotal,
          discTotal,
          taxTotal,
          finalAmount,
          JSON.stringify(finalBreakdown),
          notes || null
        ]
      )).rows;

      // 3. Insert invoice items, deduct inventory balance, and write inventory_movements
      const savedItems = [];
      for (const pItem of preparedItems) {
        const [savedItem] = (await client.query(
          `INSERT INTO swm_sales_invoice_items (
            invoice_id, product_id, variant_id, quantity, unit_price,
            discount_pct, discount_amount, final_unit_price, line_total,
            cost_at_sale, product_name, product_code
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *`,
          [
            invoice.id,
            pItem.product_id,
            pItem.variant_id,
            pItem.quantity,
            pItem.unit_price,
            pItem.discount_pct,
            pItem.discount_amount,
            pItem.final_unit_price,
            pItem.line_total,
            pItem.cost_at_sale,
            pItem.product_name,
            pItem.product_code
          ]
        )).rows;
        savedItems.push(savedItem);

        // Deduct from inventory_balances
        await client.query(
          `UPDATE inventory_balances
           SET available_qty = available_qty - $1,
               sold_qty = sold_qty + $1,
               last_movement_at = NOW(),
               last_updated = NOW()
           WHERE id = $2`,
          [pItem.quantity, pItem.balance_id]
        );

        // Insert audit log into inventory_movements
        await client.query(
          `INSERT INTO inventory_movements (
            branch_id, product_id, variant_id, movement_type, quantity_change,
            quantity_before, quantity_after, reference_type, reference_id,
            notes, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, 'sale_out', $4, $5, $6, 'swm_sales_invoices', $7, $8, $9, NOW(), NOW())`,
          [
            branchId,
            pItem.product_id,
            pItem.variant_id,
            -pItem.quantity,
            pItem.stock_before,
            pItem.stock_after,
            invoice.id,
            `POS Sale #${invNumber}`,
            effectiveUserId
          ]
        );
      }

      // 4. Update cash register drawer if cash was collected
      const cashReceived = parseFloat(finalBreakdown?.cash || 0);
      if (cashReceived > 0) {
        await client.query(
          `UPDATE cash_registers
           SET current_balance = current_balance + $1,
               updated_at = NOW()
           WHERE id = $2`,
          [cashReceived, register.id]
        );
      }

      return { invoice, items: savedItems, cashReceived };
    });

    logActivity({
      userId: req.user.id,
      branchId,
      actionType: 'POS_SALE',
      entityType: 'swm_sales_invoices',
      entityId: saleResult.invoice.id,
      newValue: {
        invoice_number: invNumber,
        final_amount: saleResult.invoice.final_amount,
        items_count: items.length
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `POS Sale #${invNumber} completed for ${saleResult.invoice.final_amount} EGP`
    });

    return res.status(201).json({
      success: true,
      data: saleResult.invoice,
      items: saleResult.items,
      message: 'Sale completed successfully'
    });
  } catch (err) {
    console.error('POS sale error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/pos/return
 * Execute retail return/refund transaction with stock restock and cash drawer deduction
 */
router.post('/return', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const {
      customer_name = 'عميل مرتجع',
      customer_phone,
      customer_address,
      salesperson_id,
      payment_method = 'cash',
      payment_breakdown = { cash: 0, card: 0, transfer: 0 },
      notes,
      items
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'أصناف المرتجع مطلوبة' });
    }

    const register = await getOrCreateBranchRegister(branchId);

    // Generate unique return number: RET-YYMM-XXXXX
    const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
    const [{ count }] = await query(`SELECT COUNT(id) AS count FROM swm_sales_invoices WHERE status = 'returned'`);
    const retNumber = `RET-${yymm}-${String(parseInt(count, 10) + 1).padStart(5, '0')}`;

    const returnResult = await transaction(async (client) => {
      let subtotal = 0;
      const preparedItems = [];

      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        if (!qty || qty <= 0) {
          throw new Error(`الكمية المرتجعة غير صالحة للصنف ${item.product_name || item.product_id}`);
        }

        // Find existing inventory balance for this product / variant in branch
        let balanceRow;
        if (item.variant_id) {
          const res = await client.query(
            `SELECT * FROM inventory_balances WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3 FOR UPDATE`,
            [branchId, item.product_id, item.variant_id]
          );
          if (res.rows.length > 0) {
            balanceRow = res.rows[0];
          }
        } else {
          const res = await client.query(
            `SELECT * FROM inventory_balances WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL FOR UPDATE`,
            [branchId, item.product_id]
          );
          if (res.rows.length > 0) {
            balanceRow = res.rows[0];
          }
        }

        const [prod] = (await client.query(
          `SELECT id, product_code, product_name, cost_price FROM products WHERE id = $1`,
          [item.product_id]
        )).rows;

        const unitPrice = parseFloat(item.unit_price) || 0;
        const lineTotal = qty * unitPrice;
        subtotal += lineTotal;

        const currentStock = balanceRow ? parseInt(balanceRow.available_qty, 10) : 0;

        preparedItems.push({
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: qty,
          unit_price: unitPrice,
          final_unit_price: unitPrice,
          line_total: lineTotal,
          cost_at_sale: parseFloat(prod?.cost_price || 0),
          product_name: item.product_name || prod?.product_name,
          product_code: prod?.product_code,
          balance_id: balanceRow?.id,
          stock_before: currentStock,
          stock_after: currentStock + qty
        });
      }

      const finalAmount = subtotal;

      let finalBreakdown;
      if (payment_method === 'cash') {
        finalBreakdown = { cash: finalAmount, card: 0, transfer: 0 };
      } else if (payment_method === 'card') {
        finalBreakdown = { cash: 0, card: finalAmount, transfer: 0 };
      } else if (payment_method === 'transfer') {
        finalBreakdown = { cash: 0, card: 0, transfer: finalAmount };
      } else {
        finalBreakdown = resolveInvoicePaymentBreakdown({
          final_amount: finalAmount,
          payment_breakdown
        });
      }

      const cashRefund = parseFloat(finalBreakdown?.cash || 0);

      // Verify cash in drawer if cash refund
      if (cashRefund > 0) {
        const curBal = parseFloat(register.current_balance || 0);
        if (cashRefund > curBal) {
          throw new Error(`رصيد الدرج الحالي (${curBal} ج.م) لا يكفي لرد المبلغ نقدًا (${cashRefund} ج.م)`);
        }
      }

      let effectiveUserId = salesperson_id ? parseInt(salesperson_id, 10) : null;
      if (!effectiveUserId) {
        if (!req.user.isBranchAccount) {
          effectiveUserId = req.user.id;
        } else {
          const userRows = (await client.query(
            `SELECT id FROM users WHERE branch_id = $1 AND status = 'active' ORDER BY id ASC LIMIT 1`,
            [branchId]
          )).rows;
          effectiveUserId = userRows.length > 0 ? userRows[0].id : (req.user.id || 1);
        }
      }

      // Insert return invoice with status 'returned'
      const [invoice] = (await client.query(
        `INSERT INTO swm_sales_invoices (
          invoice_number, branch_id, salesperson_id, customer_name,
          customer_phone, customer_address, invoice_date, subtotal, discount_amount,
          tax_amount, final_amount, payment_breakdown, payment_status,
          notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, 0, 0, $8, $9, 'paid', $10, 'returned', NOW(), NOW())
        RETURNING *`,
        [
          retNumber,
          branchId,
          effectiveUserId,
          customer_name || 'عميل مرتجع',
          customer_phone || null,
          customer_address || null,
          subtotal,
          finalAmount,
          JSON.stringify(finalBreakdown),
          notes || 'فاتورة مرتجع مبيعات'
        ]
      )).rows;

      // Restock inventory and record movements
      const savedItems = [];
      for (const pItem of preparedItems) {
        const [savedItem] = (await client.query(
          `INSERT INTO swm_sales_invoice_items (
            invoice_id, product_id, variant_id, quantity, unit_price,
            discount_pct, discount_amount, final_unit_price, line_total,
            cost_at_sale, product_name, product_code
          ) VALUES ($1, $2, $3, $4, $5, 0, 0, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            invoice.id,
            pItem.product_id,
            pItem.variant_id,
            pItem.quantity,
            pItem.unit_price,
            pItem.final_unit_price,
            pItem.line_total,
            pItem.cost_at_sale,
            pItem.product_name,
            pItem.product_code
          ]
        )).rows;
        savedItems.push(savedItem);

        // Restock inventory: increment available_qty and returned_qty, and create record if none exists
        if (pItem.balance_id) {
          await client.query(
            `UPDATE inventory_balances
             SET available_qty = available_qty + $1,
                 returned_qty = COALESCE(returned_qty, 0) + $1,
                 sold_qty = GREATEST(0, COALESCE(sold_qty, 0) - $1),
                 last_movement_at = NOW(),
                 last_updated = NOW()
             WHERE id = $2`,
            [pItem.quantity, pItem.balance_id]
          );
        } else {
          // Re-check in case another item in the same invoice created it
          const checkSql = pItem.variant_id
            ? `SELECT id FROM inventory_balances WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3 FOR UPDATE`
            : `SELECT id FROM inventory_balances WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL FOR UPDATE`;
          const checkParams = pItem.variant_id
            ? [branchId, pItem.product_id, pItem.variant_id]
            : [branchId, pItem.product_id];
          const checkRes = await client.query(checkSql, checkParams);

          if (checkRes.rows.length > 0) {
            pItem.balance_id = checkRes.rows[0].id;
            await client.query(
              `UPDATE inventory_balances
               SET available_qty = available_qty + $1,
                   returned_qty = COALESCE(returned_qty, 0) + $1,
                   sold_qty = GREATEST(0, COALESCE(sold_qty, 0) - $1),
                   last_movement_at = NOW(),
                   last_updated = NOW()
               WHERE id = $2`,
              [pItem.quantity, pItem.balance_id]
            );
          } else {
            const insRes = await client.query(
              `INSERT INTO inventory_balances (
                branch_id, product_id, variant_id, available_qty, reserved_qty,
                on_order_qty, sold_qty, returned_qty, last_movement_at, last_updated
              ) VALUES ($1, $2, $3, $4, 0, 0, 0, $4, NOW(), NOW())
              RETURNING id`,
              [branchId, pItem.product_id, pItem.variant_id || null, pItem.quantity]
            );
            pItem.balance_id = insRes.rows[0]?.id;
          }
        }

        await client.query(
          `INSERT INTO inventory_movements (
            branch_id, product_id, variant_id, movement_type, quantity_change,
            quantity_before, quantity_after, reference_type, reference_id,
            notes, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, 'return_in', $4, $5, $6, 'swm_sales_invoices', $7, $8, $9, NOW(), NOW())`,
          [
            branchId,
            pItem.product_id,
            pItem.variant_id,
            pItem.quantity,
            pItem.stock_before,
            pItem.stock_after,
            invoice.id,
            `POS Return #${retNumber}`,
            effectiveUserId
          ]
        );
      }

      // Deduct cash from drawer if cash refunded
      if (cashRefund > 0) {
        await client.query(
          `UPDATE cash_registers
           SET current_balance = GREATEST(0, current_balance - $1),
               updated_at = NOW()
           WHERE id = $2`,
          [cashRefund, register.id]
        );
      }

      return { invoice, items: savedItems, cashRefund };
    });

    logActivity({
      userId: req.user.id,
      branchId,
      actionType: 'POS_RETURN',
      entityType: 'swm_sales_invoices',
      entityId: returnResult.invoice.id,
      newValue: {
        invoice_number: retNumber,
        refund_amount: returnResult.invoice.final_amount,
        items_count: items.length
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `POS Return #${retNumber} processed for refund of ${returnResult.invoice.final_amount} EGP`
    });

    return res.status(201).json({
      success: true,
      data: returnResult.invoice,
      items: returnResult.items,
      message: 'تم إتمام المرتجع وإعادة الأصناف للمخزون وخصم النقدية بنجاح'
    });
  } catch (err) {
    console.error('POS return error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/pos/settings
 * Supervisor settings for POS validation and expense recipients
 */
router.get('/settings', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const rows = await query(
      `SELECT key, value FROM store_settings WHERE key LIKE 'pos_%'`
    );
    const settingsMap = {};
    (rows.rows || rows).forEach(r => {
      settingsMap[r.key] = r.value;
    });

    return res.json({
      success: true,
      data: {
        require_customer_name: settingsMap['pos_require_customer_name'] === 'true',
        require_customer_phone: settingsMap['pos_require_customer_phone'] === 'true',
        allowed_expense_recipients: settingsMap['pos_allowed_expense_recipients']
          ? JSON.parse(settingsMap['pos_allowed_expense_recipients'])
          : ['بائعين الفرع', 'مصاريف إدارية وتشغيل', 'مرافق وفواتير', 'نثريات وضيافة', 'نظافة ومهمات', 'أخرى']
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/pos/settings
 * Update supervisor settings
 */
router.put('/settings', requireAuth, requireRole(['super_admin', 'admin', 'supervisor']), async (req, res) => {
  try {
    const { require_customer_name, require_customer_phone, allowed_expense_recipients } = req.body;

    if (require_customer_name !== undefined) {
      await query(
        `INSERT INTO store_settings (key, value, updated_at) VALUES ('pos_require_customer_name', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [String(require_customer_name)]
      );
    }
    if (require_customer_phone !== undefined) {
      await query(
        `INSERT INTO store_settings (key, value, updated_at) VALUES ('pos_require_customer_phone', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [String(require_customer_phone)]
      );
    }
    if (allowed_expense_recipients !== undefined) {
      await query(
        `INSERT INTO store_settings (key, value, updated_at) VALUES ('pos_allowed_expense_recipients', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(allowed_expense_recipients)]
      );
    }

    return res.json({ success: true, message: 'تم حفظ إعدادات الـ POS بنجاح' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/pos/expense-categories
 * Get expense categories synchronized across all branches
 */
router.get('/expense-categories', requireAuth, async (req, res) => {
  try {
    const rows = await query(`SELECT value FROM store_settings WHERE key = 'pos_allowed_expense_recipients'`);
    let categories = [
      'سلفة موظف / بائع (Employee Advance)',
      'مصروف عام (General Expense)',
      'صيانة وتجهيزات (Maintenance)',
      'فواتير ومرافق (كهرباء / مياه / إنترنت)',
      'ضيافة ونثريات وبوفيه (Hospitality)',
      'شحن ونقل بضاعة عاجلة (Shipping)',
      'نظافة ومهمات',
      'مصروفات تشغيلية أخرى (Other)'
    ];
    if (rows.length > 0 && rows[0].value) {
      try {
        const parsed = JSON.parse(rows[0].value);
        if (Array.isArray(parsed) && parsed.length > 0) categories = parsed;
      } catch (e) {}
    }
    return res.json({ success: true, data: categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/pos/expense-categories
 * Add an expense category across all branches
 */
router.post('/expense-categories', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { category } = req.body;
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال اسم تصنيف المصروف' });
    }
    const cleanCat = category.trim();

    const rows = await query(`SELECT value FROM store_settings WHERE key = 'pos_allowed_expense_recipients'`);
    let categories = [];
    if (rows.length > 0 && rows[0].value) {
      try {
        categories = JSON.parse(rows[0].value);
      } catch (e) {}
    }
    if (!Array.isArray(categories) || categories.length === 0) {
      categories = [
        'سلفة موظف / بائع (Employee Advance)',
        'مصروف عام (General Expense)',
        'صيانة وتجهيزات (Maintenance)',
        'فواتير ومرافق (كهرباء / مياه / إنترنت)',
        'ضيافة ونثريات وبوفيه (Hospitality)',
        'شحن ونقل بضاعة عاجلة (Shipping)',
        'نظافة ومهمات',
        'مصروفات تشغيلية أخرى (Other)'
      ];
    }
    if (!categories.includes(cleanCat)) {
      categories.push(cleanCat);
    }
    await query(
      `INSERT INTO store_settings (key, value, updated_at) VALUES ('pos_allowed_expense_recipients', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(categories)]
    );

    // Also sync with withdrawal_reasons if table exists
    await query(
      `INSERT INTO withdrawal_reasons (title, category) VALUES ($1, 'operational') ON CONFLICT (title) DO NOTHING`,
      [cleanCat]
    ).catch(() => {});

    return res.json({ success: true, data: categories, message: `تم إضافة التصنيف "${cleanCat}" بنجاح وتعميمه على كافة الفروع` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/swm/pos/expense-categories
 * Remove an expense category across all branches
 */
router.delete('/expense-categories', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { category } = req.body;
    if (!category) return res.status(400).json({ success: false, message: 'يرجى تحديد التصنيف المراد حذفه' });

    const rows = await query(`SELECT value FROM store_settings WHERE key = 'pos_allowed_expense_recipients'`);
    let categories = [];
    if (rows.length > 0 && rows[0].value) {
      try {
        categories = JSON.parse(rows[0].value);
      } catch (e) {}
    }
    categories = categories.filter(c => c !== category);
    await query(
      `INSERT INTO store_settings (key, value, updated_at) VALUES ('pos_allowed_expense_recipients', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(categories)]
    );

    return res.json({ success: true, data: categories, message: `تم حذف التصنيف "${category}" من كافة الفروع` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/pos/invoices
 * List recent sales invoices for reprint or refund
 */
router.get('/invoices', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const { page = 1, limit = 20, search } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [`si.branch_id = $1`];
    const params = [branchId];
    let pIdx = 2;

    if (search && search.trim()) {
      whereClauses.push(`(si.invoice_number ILIKE $${pIdx} OR si.customer_name ILIKE $${pIdx} OR si.customer_phone ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countSql = `SELECT COUNT(si.id) AS total FROM swm_sales_invoices si ${whereSql}`;
    const [countResult] = await query(countSql, params);
    const total = parseInt(countResult?.total || 0, 10);

    const dataSql = `
      SELECT si.*,
             u.full_name AS cashier_name,
             COUNT(sii.id) AS items_count,
             COALESCE(SUM(sii.quantity), 0) AS total_units
      FROM swm_sales_invoices si
      LEFT JOIN users u ON u.id = si.salesperson_id
      LEFT JOIN swm_sales_invoice_items sii ON sii.invoice_id = si.id
      ${whereSql}
      GROUP BY si.id, u.full_name
      ORDER BY si.invoice_date DESC, si.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const invoices = await query(dataSql, params);

    return res.json({
      success: true,
      data: invoices,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('POS invoices list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/pos/invoices/:id
 * Retrieve single invoice with line items for reprint
 */
router.get('/invoices/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [invoice] = await query(
      `SELECT si.*,
              b.branch_name, b.address AS branch_address, b.phone AS branch_phone,
              u.full_name AS cashier_name
       FROM swm_sales_invoices si
       LEFT JOIN branches b ON b.id = si.branch_id
       LEFT JOIN users u ON u.id = si.salesperson_id
       WHERE si.id = $1`,
      [id]
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    const items = await query(
      `SELECT sii.*,
              p.barcode,
              pv.variant_sku, pv.color, pv.size
       FROM swm_sales_invoice_items sii
       LEFT JOIN products p ON p.id = sii.product_id
       LEFT JOIN product_variants pv ON pv.id = sii.variant_id
       WHERE sii.invoice_id = $1
       ORDER BY sii.id ASC`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...invoice,
        items
      }
    });
  } catch (err) {
    console.error('POS invoice detail error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/pos/shift/summary
 * Daily shift summary: timeline log of sales invoices and expenses, shift KPIs
 */
router.get('/shift/summary', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const { date, salesperson_id } = req.query;

    const targetDate = date ? date : new Date().toISOString().split('T')[0];

    // Build filter for sales & return invoices
    let invWhere = `DATE(si.invoice_date) = $1 AND si.status IN ('completed', 'returned')`;
    const invParams = [targetDate];

    if (branchId && branchId !== 'all') {
      invWhere += ` AND si.branch_id = $${invParams.length + 1}`;
      invParams.push(parseInt(branchId, 10));
    }

    if (salesperson_id) {
      invWhere += ` AND si.salesperson_id = $${invParams.length + 1}`;
      invParams.push(parseInt(salesperson_id, 10));
    }

    const allInvoices = await query(
      `SELECT si.*,
              u.full_name AS cashier_name,
              u.username AS cashier_username
       FROM swm_sales_invoices si
       LEFT JOIN users u ON u.id = si.salesperson_id
       WHERE ${invWhere}
       ORDER BY si.invoice_date DESC`,
      invParams
    );

    const salesInvoices = allInvoices.filter(i => i.status === 'completed');
    const returnInvoices = allInvoices.filter(i => i.status === 'returned');

    // Build filter for expenses
    let expWhere = `DATE(e.expense_date) = $1 AND e.status = 'approved'`;
    const expParams = [targetDate];

    if (branchId && branchId !== 'all') {
      expWhere += ` AND e.branch_id = $${expParams.length + 1}`;
      expParams.push(parseInt(branchId, 10));
    }

    if (salesperson_id) {
      expWhere += ` AND e.recorded_by = $${expParams.length + 1}`;
      expParams.push(parseInt(salesperson_id, 10));
    }

    const expenses = await query(
      `SELECT e.*,
              u.full_name AS created_by_name,
              u.username AS created_by_username
       FROM expenses e
       LEFT JOIN users u ON u.id = e.recorded_by
       WHERE ${expWhere}
       ORDER BY e.expense_date DESC, e.id DESC`,
      expParams
    );

    // Single Source of Truth: Calculate aggregated sales KPIs for completed POS invoices
    let posSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let transferSales = 0;

    for (const inv of salesInvoices) {
      const invFinalAmt = Math.max(0, parseFloat(inv.final_amount || 0));
      const bd = resolveInvoicePaymentBreakdown(inv);

      posSales += invFinalAmt;
      cashSales += bd.cash;
      cardSales += bd.card;
      transferSales += bd.transfer;
    }

    // Mathematical guarantee: Gross Sales === Cash Sales + Visa Sales + Transfer Sales
    posSales = Math.round(posSales * 100) / 100;
    cashSales = Math.round(cashSales * 100) / 100;
    cardSales = Math.round(cardSales * 100) / 100;
    transferSales = Math.round((posSales - cashSales - cardSales) * 100) / 100;

    // Single Source of Truth: Calculate aggregated returns KPIs
    let returnsTotal = 0;
    let cashReturns = 0;
    let cardReturns = 0;
    let transferReturns = 0;

    for (const ret of returnInvoices) {
      const retFinalAmt = Math.max(0, parseFloat(ret.final_amount || 0));
      const bd = resolveInvoicePaymentBreakdown(ret);

      returnsTotal += retFinalAmt;
      cashReturns += bd.cash;
      cardReturns += bd.card;
      transferReturns += bd.transfer;
    }

    // Mathematical guarantee: Returns Total === Cash Returns + Visa Returns + Transfer Returns
    returnsTotal = Math.round(returnsTotal * 100) / 100;
    cashReturns = Math.round(cashReturns * 100) / 100;
    cardReturns = Math.round(cardReturns * 100) / 100;
    transferReturns = Math.round((returnsTotal - cashReturns - cardReturns) * 100) / 100;

    // Calculate expenses KPIs categorized by payment source
    let totalExpenses = 0;
    let refundedExpenses = 0;
    let cashExpenses = 0;
    let refundedCashExpenses = 0;
    let cardExpenses = 0;
    let refundedCardExpenses = 0;
    let transferExpenses = 0;
    let refundedTransferExpenses = 0;

    for (const exp of expenses) {
      const amt = parseFloat(exp.amount || 0);
      const isRefunded = exp.category === 'refunded_expense';

      // Check payment source for expense (defaults to cash for branch drawer disbursements)
      const payMethod = (exp.payment_method || 'cash').toLowerCase();

      if (isRefunded) {
        refundedExpenses += amt;
        if (payMethod === 'card' || payMethod === 'visa') {
          refundedCardExpenses += amt;
        } else if (payMethod === 'transfer') {
          refundedTransferExpenses += amt;
        } else {
          refundedCashExpenses += amt;
        }
      } else {
        totalExpenses += amt;
        if (payMethod === 'card' || payMethod === 'visa') {
          cardExpenses += amt;
        } else if (payMethod === 'transfer') {
          transferExpenses += amt;
        } else {
          cashExpenses += amt;
        }
      }
    }

    const netExpenses = Math.round((totalExpenses - refundedExpenses) * 100) / 100;
    const netCashExpenses = Math.round((cashExpenses - refundedCashExpenses) * 100) / 100;
    const netCardExpenses = Math.round((cardExpenses - refundedCardExpenses) * 100) / 100;
    const netTransferExpenses = Math.round((transferExpenses - refundedTransferExpenses) * 100) / 100;

    // Accounting Formula 1:
    // Net Revenue = Total Gross Sales - Total Returns - Net Expenses & Withdrawals
    const netRevenue = Math.round((posSales - returnsTotal - netExpenses) * 100) / 100;

    // Accounting Formula 2 & Developer Note:
    // Dedicated Payment Method Deductions:
    // Net Cash = Cash Sales - Cash Returns - Net Cash Expenses
    // Net Visa = Card Sales - Card Returns - Net Card Expenses
    // Net Transfers = Transfer Sales - Transfer Returns - Net Transfer Expenses
    // Mathematical Identity: Net Cash + Net Visa + Net Transfers === Net Revenue
    const netCash = Math.round((cashSales - cashReturns - netCashExpenses) * 100) / 100;
    const netVisa = Math.round((cardSales - cardReturns - netCardExpenses) * 100) / 100;
    const netTransfers = Math.round((transferSales - transferReturns - netTransferExpenses) * 100) / 100;

    // Get register opening & current balance
    let register = { register_code: 'ALL', register_name: 'جميع الفروع', current_balance: 0 };
    let openingBalance = 0;
    if (branchId && branchId !== 'all') {
      register = await getOrCreateBranchRegister(parseInt(branchId, 10));
      openingBalance = Math.round(parseFloat(register.opening_balance || 0) * 100) / 100;
    }

    // Physical Drawer Cash = Opening Cash Float + Net Cash generated during shift
    const expectedDrawerCash = Math.round((openingBalance + netCash) * 100) / 100;

    const completedSalesCount = salesInvoices.length;
    const averageOrderValue = completedSalesCount > 0 ? (posSales / completedSalesCount) : 0;

    // Build unified detailed transactions list for the seller's daily report
    const allTransactions = [
      ...salesInvoices.map(inv => {
        const invBd = resolveInvoicePaymentBreakdown(inv);
        return {
          id: `sale_${inv.id}`,
          rawId: inv.id,
          type: 'sale',
          typeLabel: 'فاتورة بيع',
          typeColor: 'green',
          number: inv.invoice_number,
          time: inv.invoice_date,
          amount: parseFloat(inv.final_amount || 0),
          displayAmount: `+${parseFloat(inv.final_amount || 0).toFixed(2)} ج.م`,
          isPositive: true,
          customerOrRecipient: inv.customer_name || 'عميل نقدي',
          phone: inv.customer_phone || '-',
          salesperson: inv.cashier_name || inv.cashier_username || 'الفرع',
          paymentMethod: inv.payment_breakdown ? 'تفصيل متعدد' : 'كاش / نقدية',
          paymentBreakdown: invBd,
          notes: inv.notes,
          status: inv.status,
          details: inv
        };
      }),
      ...returnInvoices.map(ret => {
        const retBd = resolveInvoicePaymentBreakdown(ret);
        return {
          id: `return_${ret.id}`,
          rawId: ret.id,
          type: 'return',
          typeLabel: 'فاتورة مرتجع',
          typeColor: 'error',
          number: ret.invoice_number,
          time: ret.invoice_date,
          amount: -parseFloat(ret.final_amount || 0),
          displayAmount: `-${parseFloat(ret.final_amount || 0).toFixed(2)} ج.م`,
          isPositive: false,
          customerOrRecipient: ret.customer_name || 'عميل مرتجع',
          phone: ret.customer_phone || '-',
          salesperson: ret.cashier_name || ret.cashier_username || 'الفرع',
          paymentMethod: ret.payment_breakdown ? 'رد نقدي / وسيلة' : 'رد نقدية',
          paymentBreakdown: retBd,
          notes: ret.notes,
          status: ret.status,
          details: ret
        };
      }),
      ...expenses.map(exp => {
        const isRefunded = exp.category === 'refunded_expense';
        const amt = parseFloat(exp.amount || 0);
        return {
          id: `exp_${exp.id}`,
          rawId: exp.id,
          type: isRefunded ? 'refunded_expense' : 'expense',
          typeLabel: isRefunded ? 'مصروف مرتد للدرج' : (exp.category === 'utility_bill' ? 'دفع فواتير' : 'سحب مصروفات'),
          typeColor: isRefunded ? 'cyan' : 'orange',
          number: exp.expense_ref,
          time: exp.created_at || exp.expense_date,
          amount: isRefunded ? amt : -amt,
          displayAmount: `${isRefunded ? '+' : '-'}${amt.toFixed(2)} ج.م`,
          isPositive: isRefunded,
          customerOrRecipient: exp.recipient_name
            ? `${exp.recipient_name} • ${exp.subcategory || exp.description || 'سلفة / مصروف'}`
            : (exp.description || (isRefunded ? 'إعادة إلى الدرج' : 'مصروف فرع')),
          recipient_name: exp.recipient_name,
          category: exp.subcategory || exp.category,
          phone: '-',
          salesperson: exp.created_by_name || exp.created_by_username || 'الفرع',
          paymentMethod: exp.payment_method ? (exp.payment_method === 'card' ? 'فيزا' : (exp.payment_method === 'transfer' ? 'تحويل' : 'نقدًا من الدرج')) : 'نقدًا من الدرج',
          notes: exp.description,
          status: exp.status,
          details: exp
        };
      })
    ].sort((a, b) => new Date(b.time) - new Date(a.time));

    // Timeline format
    const timeline = allTransactions.map(t => ({
      type: t.type,
      id: t.rawId,
      number: t.number,
      time: t.time,
      amount: Math.abs(t.amount),
      customer_name: t.customerOrRecipient,
      customer_phone: t.phone,
      salesperson_name: t.salesperson,
      payment_breakdown: t.paymentBreakdown || t.paymentMethod,
      notes: t.notes,
      source: 'pos'
    }));

    return res.json({
      success: true,
      data: {
        date: targetDate,
        sales_count: completedSalesCount,
        pos_count: completedSalesCount,
        returns_count: returnInvoices.length,
        returns_total: returnsTotal,
        expenses_count: expenses.length,
        total_transactions: allTransactions.length,
        kpi: {
          total_sales: posSales,
          gross_sales: posSales,
          pos_sales: posSales,
          returns_total: returnsTotal,
          returns_count: returnInvoices.length,
          completed_count: completedSalesCount,
          average_order_value: averageOrderValue,

          // Gross Sales by Payment Method
          cash_sales: cashSales,
          card_sales: cardSales,
          transfer_sales: transferSales,

          // Returns by Payment Method
          cash_returns: cashReturns,
          card_returns: cardReturns,
          transfer_returns: transferReturns,

          // Expenses Breakdown by Source
          total_expenses: totalExpenses,
          refunded_expenses: refundedExpenses,
          net_expenses: netExpenses,
          cash_expenses: cashExpenses,
          net_cash_expenses: netCashExpenses,
          card_expenses: cardExpenses,
          net_card_expenses: netCardExpenses,
          transfer_expenses: transferExpenses,
          net_transfer_expenses: netTransferExpenses,

          // 1. Net Revenue: Total Gross Sales - Total Returns - Net Expenses
          net_revenue: netRevenue,

          // 2. Strict Payment Method Breakdown: Net Revenue = Net Cash + Net Visa + Net Transfers
          net_cash_revenue: netCash,
          net_card_revenue: netVisa,
          net_transfer_revenue: netTransfers,
          net_cash: netCash,
          net_visa: netVisa,
          net_transfers: netTransfers,

          // Cash Drawer Balance: Opening + Net Cash
          opening_balance: openingBalance,
          expected_drawer_cash: Math.max(0, expectedDrawerCash),
          raw_expected_drawer_cash: expectedDrawerCash,
          register_current_balance: parseFloat(register.current_balance || 0),

          // Drawer & Holdings Categorization
          net_cash_drawer: Math.max(0, expectedDrawerCash),
          net_card_total: netVisa,
          net_transfer_total: netTransfers,
          total_drawer_balance: Math.max(0, expectedDrawerCash) + Math.max(0, netVisa) + Math.max(0, netTransfers)
        },
        invoices: salesInvoices,
        returns: returnInvoices,
        expenses,
        all_transactions: allTransactions,
        timeline
      }
    });
  } catch (err) {
    console.error('Shift summary error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
