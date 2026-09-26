const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireBranchScope } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * Helper to get or create branch register
 */
async function getBranchRegister(branchId) {
  let [register] = await query(
    `SELECT * FROM cash_registers WHERE branch_id = $1 ORDER BY is_main DESC, id ASC LIMIT 1`,
    [branchId]
  );
  return register;
}

/**
 * GET /api/swm/expenses/analytics
 * Comprehensive visual analytics, trend data, and decision-making insights
 */
router.get('/analytics', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const { days = 14 } = req.query;
    const intervalDays = Math.max(1, Math.min(90, parseInt(days, 10)));

    // 1. Category breakdown in period
    const catRows = await query(
      `SELECT e.category,
              e.subcategory,
              COALESCE(SUM(e.amount), 0) AS total_amount,
              COUNT(e.id) AS count
       FROM expenses e
       WHERE e.branch_id = $1
         AND e.expense_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
         AND e.status = 'approved'
       GROUP BY e.category, e.subcategory
       ORDER BY total_amount DESC`,
      [branchId, intervalDays]
    );

    let periodTotal = 0;
    const categoryTotals = {};
    for (const r of catRows) {
      const amt = parseFloat(r.total_amount || 0);
      if (r.category !== 'refunded_expense') {
        periodTotal += amt;
      }
      const key = r.category || 'other';
      categoryTotals[key] = (categoryTotals[key] || 0) + amt;
    }

    const CATEGORY_META = {
      sales_withdrawal: { label: 'سحب بائعين (صرف نقدية)', color: '#ea580c' },
      utility_bill: { label: 'دفع فواتير ومرافق تشغيلية', color: '#2563eb' },
      refunded_expense: { label: 'مصروف مرتد للدرج', color: '#16a34a' },
      shipping: { label: 'مصاريف شحن وتوصيل', color: '#0284c7' },
      packaging: { label: 'خامات ومواد تغليف', color: '#8b5cf6' },
      buffet: { label: 'بوفيه ونثريات وضيافة', color: '#f59e0b' },
      other: { label: 'مصروفات أخرى وتشغيل', color: '#64748b' }
    };

    const categoryBreakdown = Object.entries(categoryTotals).map(([cat, total]) => {
      const meta = CATEGORY_META[cat] || { label: cat, color: '#3b82f6' };
      const pct = periodTotal > 0 ? ((total / periodTotal) * 100) : 0;
      return {
        category: cat,
        label: meta.label,
        color: meta.color,
        amount: total,
        percentage: parseFloat(pct.toFixed(1))
      };
    }).sort((a, b) => b.amount - a.amount);

    // 2. Daily spending trend (last N days)
    const trendRows = await query(
      `SELECT TO_CHAR(DATE(e.expense_date), 'YYYY-MM-DD') AS day_date,
              TO_CHAR(DATE(e.expense_date), 'DD/MM') AS day_label,
              COALESCE(SUM(CASE WHEN e.category = 'refunded_expense' THEN 0 ELSE e.amount END), 0) AS total_amount,
              COALESCE(SUM(CASE WHEN e.category = 'sales_withdrawal' THEN e.amount ELSE 0 END), 0) AS withdrawal_amount,
              COALESCE(SUM(CASE WHEN e.category = 'utility_bill' THEN e.amount ELSE 0 END), 0) AS bills_amount,
              COUNT(e.id) AS count
       FROM expenses e
       WHERE e.branch_id = $1
         AND e.expense_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
         AND e.status = 'approved'
       GROUP BY DATE(e.expense_date)
       ORDER BY DATE(e.expense_date) ASC`,
      [branchId, intervalDays]
    );

    const dailyTrend = trendRows.map(r => ({
      date: r.day_date,
      label: r.day_label,
      total: parseFloat(r.total_amount || 0),
      withdrawals: parseFloat(r.withdrawal_amount || 0),
      bills: parseFloat(r.bills_amount || 0),
      count: parseInt(r.count || 0, 10)
    }));

    // 3. Staff spending breakdown
    const staffRows = await query(
      `SELECT e.recorded_by,
              COALESCE(u.full_name, u.username, 'الفرع') AS staff_name,
              COALESCE(SUM(e.amount), 0) AS total_amount,
              COUNT(e.id) AS count
       FROM expenses e
       LEFT JOIN users u ON u.id = e.recorded_by
       WHERE e.branch_id = $1
         AND e.expense_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
         AND e.status = 'approved'
       GROUP BY e.recorded_by, u.full_name, u.username
       ORDER BY total_amount DESC
       LIMIT 6`,
      [branchId, intervalDays]
    );

    const staffBreakdown = staffRows.map(r => ({
      userId: r.recorded_by,
      name: r.staff_name,
      amount: parseFloat(r.total_amount || 0),
      count: parseInt(r.count || 0, 10)
    }));

    // 4. Decision insights & KPIs
    const topCat = categoryBreakdown[0] || null;
    const activeDaysCount = dailyTrend.filter(d => d.total > 0).length || 1;
    const avgDailySpend = periodTotal / Math.max(1, activeDaysCount);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTrend = dailyTrend.find(d => d.date === todayStr);
    const todaySpend = todayTrend ? todayTrend.total : 0;

    const isHighSpendToday = todaySpend > (avgDailySpend * 1.5) && todaySpend > 500;

    return res.json({
      success: true,
      data: {
        period_days: intervalDays,
        total_period_expenses: periodTotal,
        average_daily_spend: parseFloat(avgDailySpend.toFixed(2)),
        today_spend: todaySpend,
        is_high_spend_today: isHighSpendToday,
        top_category: topCat,
        category_breakdown: categoryBreakdown,
        daily_trend: dailyTrend,
        staff_breakdown: staffBreakdown
      }
    });
  } catch (err) {
    console.error('Expenses analytics error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/expenses
 * List branch expenses with filters
 */
router.get('/', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const { category, subcategory, date, salesperson_id, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = ['e.branch_id = $1'];
    const params = [branchId];
    let pIdx = 2;

    if (category) {
      whereClauses.push(`e.category = $${pIdx++}`);
      params.push(category);
    }
    if (subcategory) {
      whereClauses.push(`e.subcategory = $${pIdx++}`);
      params.push(subcategory);
    }
    if (date) {
      whereClauses.push(`DATE(e.expense_date) = $${pIdx++}`);
      params.push(date);
    } else {
      // Default: today
      whereClauses.push(`DATE(e.expense_date) = CURRENT_DATE`);
    }
    if (salesperson_id) {
      whereClauses.push(`e.recorded_by = $${pIdx++}`);
      params.push(parseInt(salesperson_id, 10));
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // Get count
    const [countRes] = await query(`SELECT COUNT(e.id) AS total FROM expenses e ${whereSql}`, params);
    const total = parseInt(countRes?.total || 0, 10);

    // Get expenses list
    const sql = `
      SELECT e.*,
             u.full_name AS recorded_by_name,
             u.username AS recorded_by_username
      FROM expenses e
      LEFT JOIN users u ON u.id = e.recorded_by
      ${whereSql}
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const expenses = await query(sql, params);

    // Calculate daily metrics
    const [metrics] = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN category IN ('sales_withdrawal', 'utility_bill') THEN amount ELSE 0 END), 0) AS total_out,
         COALESCE(SUM(CASE WHEN category = 'refunded_expense' THEN amount ELSE 0 END), 0) AS total_refunded,
         COALESCE(SUM(CASE WHEN category = 'sales_withdrawal' THEN amount ELSE 0 END), 0) AS total_withdrawals,
         COALESCE(SUM(CASE WHEN category = 'utility_bill' THEN amount ELSE 0 END), 0) AS total_bills,
         COUNT(id) AS count
       FROM expenses e
       ${whereSql}`,
      params
    );

    const totalOut = parseFloat(metrics?.total_out || 0);
    const totalRefunded = parseFloat(metrics?.total_refunded || 0);

    return res.json({
      success: true,
      data: expenses,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      summary: {
        total_out: totalOut,
        total_refunded: totalRefunded,
        net_expense: totalOut - totalRefunded,
        total_withdrawals: parseFloat(metrics?.total_withdrawals || 0),
        total_bills: parseFloat(metrics?.total_bills || 0),
        count: parseInt(metrics?.count || 0, 10)
      }
    });
  } catch (err) {
    console.error('Expenses list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/expenses
 * Create a new expense movement with drawer synchronization
 */
router.post('/', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const {
      category, // 'sales_withdrawal', 'utility_bill', 'refunded_expense'
      subcategory, // 'water', 'electricity', 'rent', 'cleaning', 'shipping', 'other'
      amount,
      description,
      recipient_name,
      salesperson_id
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال مبلغ صحيح وموجب للمصروف'
      });
    }

    const CATEGORY_MAP = {
      'صرف نقدية': 'sales_withdrawal',
      'سحب البائعين': 'sales_withdrawal',
      'sales_withdrawal': 'sales_withdrawal',
      'دفع فواتير': 'utility_bill',
      'فواتير': 'utility_bill',
      'utility_bill': 'utility_bill',
      'مصروف مرتد': 'refunded_expense',
      'مرتد': 'refunded_expense',
      'refunded_expense': 'refunded_expense'
    };

    const finalCategory = CATEGORY_MAP[category] || category;
    const ALLOWED_CATEGORIES = ['sales_withdrawal', 'utility_bill', 'refunded_expense'];
    if (!ALLOWED_CATEGORIES.includes(finalCategory)) {
      return res.status(400).json({
        success: false,
        message: 'بند المصروف غير صالح. الخيارات المتاحة: صرف نقدية، دفع فواتير، مصروف مرتد'
      });
    }

    // Determine effective user ID for recorded_by (foreign key to users)
    let effectiveUserId = salesperson_id ? parseInt(salesperson_id, 10) : null;
    if (!effectiveUserId) {
      if (!req.user.isBranchAccount) {
        effectiveUserId = req.user.id;
      } else {
        const [branchStaff] = await query(
          `SELECT id FROM users WHERE branch_id = $1 AND status = 'active' ORDER BY id ASC LIMIT 1`,
          [branchId]
        );
        if (branchStaff) {
          effectiveUserId = branchStaff.id;
        } else {
          const [adminUser] = await query(`SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`);
          effectiveUserId = adminUser ? adminUser.id : 1;
        }
      }
    }

    // Check register
    let register = await getBranchRegister(branchId);
    if (!register) {
      const regCode = `REG-B${branchId}-01`;
      const [created] = await query(
        `INSERT INTO cash_registers (
          register_code, branch_id, register_name, is_main, current_balance,
          opening_balance, status, created_at, updated_at
        ) VALUES ($1, $2, $3, true, 0, 0, 'open', NOW(), NOW())
        RETURNING *`,
        [regCode, branchId, `Main Register Branch ${branchId}`]
      );
      register = created;
    } else if (register.status !== 'open') {
      await query(
        `UPDATE cash_registers SET status = 'open', updated_at = NOW() WHERE id = $1`,
        [register.id]
      );
      register.status = 'open';
    }

    const currentBal = parseFloat(register.current_balance || 0);

    const fullDescription = [
      recipient_name ? `المستلم: ${recipient_name}` : '',
      description
    ].filter(Boolean).join(' - ');

    // Generate unique reference EXP-YYMM-XXXXX
    const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
    const [{ count }] = await query(`SELECT COUNT(id) AS count FROM expenses`);
    const expRef = `EXP-${yymm}-${String(parseInt(count, 10) + 1).padStart(5, '0')}`;

    // Execute atomic transaction
    const result = await transaction(async (client) => {
      // 1. Insert into expenses
      const [newExp] = (await client.query(
        `INSERT INTO expenses (
          expense_ref, branch_id, category, subcategory, amount,
          description, expense_date, recorded_by, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, 'approved', NOW(), NOW())
        RETURNING *`,
        [
          expRef,
          branchId,
          finalCategory,
          subcategory || null,
          parsedAmount,
          fullDescription || null,
          effectiveUserId
        ]
      )).rows;

      // 2. Synchronize cash drawer balance
      // If withdrawal/utility bill: deduct cash
      // If refunded expense: add cash back
      const newDrawerBalance = ['sales_withdrawal', 'utility_bill'].includes(finalCategory)
        ? Math.max(0, currentBal - parsedAmount)
        : currentBal + parsedAmount;

      await client.query(
        `UPDATE cash_registers
         SET current_balance = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [newDrawerBalance, register.id]
      );

      return { expense: newExp, newBalance: newDrawerBalance };
    });

    logActivity({
      userId: effectiveUserId,
      branchId,
      actionType: 'EXPENSE_RECORDED',
      entityType: 'expenses',
      entityId: result.expense.id,
      newValue: {
        expense_ref: expRef,
        category,
        subcategory,
        amount: parsedAmount,
        drawer_balance_after: result.newBalance
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Expense #${expRef} of ${parsedAmount} EGP recorded (${category})`
    });

    return res.status(201).json({
      success: true,
      data: result.expense,
      drawer_balance: result.newBalance,
      message: 'تم تسجيل المصروف وتحديث رصيد الخزينة بنجاح'
    });
  } catch (err) {
    console.error('Create expense error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
