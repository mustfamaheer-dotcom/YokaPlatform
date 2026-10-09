const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * Generate a sequential, professional customer code: CUS-00001
 */
async function generateCustomerCode() {
  const [row] = await query(`SELECT COUNT(id) AS count FROM customers`);
  const nextNum = (parseInt(row?.count || 0, 10) + 1);
  return `CUS-${String(nextNum).padStart(5, '0')}`;
}

/**
 * GET /api/swm/loyalty/suggest
 * Real-time fast customer suggestions by phone, name, or customer code
 */
router.get('/suggest', requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const rows = await query(
      `SELECT id, customer_code, full_name, phone, total_points, lifetime_points
       FROM customers
       WHERE (phone ILIKE $1 OR full_name ILIKE $1 OR customer_code ILIKE $1)
       ORDER BY total_points DESC, id DESC
       LIMIT 8`,
      [`%${q}%`]
    );

    return res.json({
      success: true,
      data: rows.map(r => ({
        id: r.id,
        customer_code: r.customer_code,
        full_name: r.full_name,
        phone: r.phone,
        total_points: parseInt(r.total_points || 0, 10),
        lifetime_points: parseInt(r.lifetime_points || 0, 10)
      }))
    });
  } catch (err) {
    console.error('Loyalty suggest error:', err);
    return res.status(500).json({ success: false, message: 'فشل جلب الاقتراحات' });
  }
});

/**
 * GET /api/swm/loyalty/stats
 * Summary KPIs of the loyalty system (supports optional branch_id filter)
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const rawBranch = req.query.branch_id;
    const branchId = rawBranch && rawBranch !== 'all' && !isNaN(parseInt(rawBranch, 10))
      ? parseInt(rawBranch, 10)
      : null;

    let custWhere = '';
    let txWhere = '';
    const custParams = [];
    const txParams = [];

    if (branchId) {
      custWhere = `WHERE (
        branch_id = $1 
        OR id IN (SELECT customer_id FROM swm_sales_invoices WHERE branch_id = $1)
        OR id IN (SELECT customer_id FROM points_transactions WHERE branch_id = $1)
      )`;
      custParams.push(branchId);

      txWhere = `WHERE branch_id = $1`;
      txParams.push(branchId);
    }

    const [counts] = await query(`
      SELECT 
        COUNT(id) AS total_customers,
        COALESCE(SUM(total_points), 0) AS total_points,
        COALESCE(SUM(lifetime_points), 0) AS total_lifetime_points
      FROM customers
      ${custWhere}
    `, custParams);

    const [txSummary] = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'redeem' THEN ABS(points) ELSE 0 END), 0) AS total_redeemed_points,
        COALESCE(SUM(CASE WHEN type = 'redeem' THEN monetary_value ELSE 0 END), 0) AS total_redeemed_amount
      FROM points_transactions
      ${txWhere}
    `, txParams);

    // Fetch point value from settings
    const [settingRow] = await query(`SELECT value FROM store_settings WHERE key = 'loyalty_point_value'`);
    const pointValue = parseFloat(settingRow?.value || 0.50);

    const totalPts = parseInt(counts?.total_points || 0, 10);
    const monetaryValue = Math.round(totalPts * pointValue * 100) / 100;

    return res.json({
      success: true,
      data: {
        total_customers: parseInt(counts?.total_customers || 0, 10),
        total_points: totalPts,
        total_lifetime_points: parseInt(counts?.total_lifetime_points || 0, 10),
        monetary_value: monetaryValue,
        total_redeemed_points: parseInt(txSummary?.total_redeemed_points || 0, 10),
        total_redeemed_amount: parseFloat(txSummary?.total_redeemed_amount || 0)
      }
    });
  } catch (err) {
    console.error('Loyalty stats error:', err);
    return res.status(500).json({ success: false, message: 'فشل جلب إحصائيات الولاء' });
  }
});

/**
 * GET /api/swm/loyalty/lookup
 * Fast lookup by customer phone number
 */
router.get('/lookup', requireAuth, async (req, res) => {
  try {
    const rawPhone = req.query.phone;
    if (!rawPhone || !rawPhone.trim()) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب' });
    }

    const cleanPhone = rawPhone.trim();
    const rows = await query(
      `SELECT id, customer_code, full_name, phone, total_points, lifetime_points, created_at
       FROM customers
       WHERE phone = $1
       LIMIT 1`,
      [cleanPhone]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: {
          found: false,
          customer: null
        }
      });
    }

    const customer = rows[0];
    return res.json({
      success: true,
      data: {
        found: true,
        customer: {
          id: customer.id,
          customer_code: customer.customer_code,
          full_name: customer.full_name,
          phone: customer.phone,
          total_points: parseInt(customer.total_points || 0, 10),
          lifetime_points: parseInt(customer.lifetime_points || 0, 10),
          created_at: customer.created_at
        }
      }
    });
  } catch (err) {
    console.error('Loyalty lookup error:', err);
    return res.status(500).json({ success: false, message: 'فشل البحث عن العميل' });
  }
});

/**
 * POST /api/swm/loyalty/customers
 * Register a new customer
 */
router.post('/customers', requireAuth, async (req, res) => {
  try {
    const { full_name, phone, branch_id } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: 'اسم العميل مطلوب' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'رقم هاتف العميل مطلوب' });
    }

    const cleanName = full_name.trim();
    const cleanPhone = phone.trim();
    const targetBranchId = branch_id && !isNaN(parseInt(branch_id, 10))
      ? parseInt(branch_id, 10)
      : (req.user?.branch_id || req.user?.branchId || null);

    // Check existing phone
    const existing = await query(`SELECT * FROM customers WHERE phone = $1 LIMIT 1`, [cleanPhone]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'رقم الهاتف مسجل بالفعل لعميل آخر',
        data: existing[0]
      });
    }

    const customerCode = await generateCustomerCode();

    const [newCustomer] = await query(
      `INSERT INTO customers (customer_code, full_name, phone, branch_id, total_points, lifetime_points, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 0, 0, NOW(), NOW())
       RETURNING *`,
      [customerCode, cleanName, cleanPhone, targetBranchId]
    );

    logActivity({
      userId: req.user?.id || 1,
      branchId: targetBranchId,
      actionType: 'CUSTOMER_CREATE',
      entityType: 'customers',
      entityId: newCustomer.id,
      newValue: {
        customer_code: newCustomer.customer_code,
        full_name: newCustomer.full_name,
        phone: newCustomer.phone,
        branch_id: targetBranchId
      },
      notes: `تسجيل عميل جديد ${newCustomer.full_name} (${newCustomer.customer_code})`
    });

    return res.status(201).json({
      success: true,
      data: newCustomer,
      message: 'تم تسجيل العميل بنجاح'
    });
  } catch (err) {
    console.error('Customer registration error:', err);
    return res.status(500).json({ success: false, message: 'فشل في تسجيل العميل' });
  }
});

/**
 * GET /api/swm/loyalty/customers
 * Paginated list of customers with branch filter, export mode, and purchase stats
 */
router.get('/customers', requireAuth, async (req, res) => {
  try {
    const isExport = req.query.export === 'true';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = isExport ? 10000 : Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = isExport ? 0 : (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';

    const rawBranch = req.query.branch_id;
    const branchId = rawBranch && rawBranch !== 'all' && !isNaN(parseInt(rawBranch, 10))
      ? parseInt(rawBranch, 10)
      : null;

    const whereConditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      const sIdx = params.length;
      whereConditions.push(`(c.full_name ILIKE $${sIdx} OR c.phone ILIKE $${sIdx} OR c.customer_code ILIKE $${sIdx})`);
    }

    if (branchId) {
      params.push(branchId);
      const bIdx = params.length;
      whereConditions.push(`(
        c.branch_id = $${bIdx}
        OR EXISTS (SELECT 1 FROM swm_sales_invoices si WHERE si.customer_id = c.id AND si.branch_id = $${bIdx})
        OR EXISTS (SELECT 1 FROM points_transactions pt WHERE pt.customer_id = c.id AND pt.branch_id = $${bIdx})
      )`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM customers c ${whereClause}`;
    const [countRow] = await query(countSql, params);
    const total = parseInt(countRow?.total || 0, 10);

    const dataSql = `
      SELECT 
        c.id, 
        c.customer_code, 
        c.full_name, 
        c.phone, 
        c.branch_id,
        b.branch_name,
        b.branch_code,
        c.total_points, 
        c.lifetime_points, 
        c.created_at,
        COALESCE(inv.total_orders, 0) AS total_orders,
        COALESCE(inv.total_spent, 0) AS total_spent,
        inv.last_order_date
      FROM customers c
      LEFT JOIN branches b ON b.id = c.branch_id
      LEFT JOIN (
        SELECT 
          customer_id, 
          COUNT(id) AS total_orders,
          SUM(final_amount) AS total_spent,
          MAX(created_at) AS last_order_date
        FROM swm_sales_invoices
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ) inv ON inv.customer_id = c.id
      ${whereClause}
      ORDER BY c.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const rows = await query(dataSql, [...params, limit, offset]);

    return res.json({
      success: true,
      data: {
        customers: rows,
        pagination: {
          page: isExport ? 1 : page,
          limit,
          total,
          totalPages: isExport ? 1 : Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    console.error('List customers error:', err);
    return res.status(500).json({ success: false, message: 'فشل جلب قائمة العملاء' });
  }
});

/**
 * GET /api/swm/loyalty/customers/:id
 * Customer details + history + invoices
 */
router.get('/customers/:id', requireAuth, async (req, res) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (!customerId || isNaN(customerId)) {
      return res.status(400).json({ success: false, message: 'معرف العميل غير صالح' });
    }

    const [customer] = await query(`
      SELECT c.*, b.branch_name, b.branch_code
      FROM customers c
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE c.id = $1
    `, [customerId]);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    const history = await query(
      `SELECT pt.*, b.branch_name, u.full_name AS created_by_name, si.invoice_number
       FROM points_transactions pt
       LEFT JOIN branches b ON b.id = pt.branch_id
       LEFT JOIN users u ON u.id = pt.created_by
       LEFT JOIN swm_sales_invoices si ON si.id = pt.invoice_id
       WHERE pt.customer_id = $1
       ORDER BY pt.id DESC
       LIMIT 50`,
      [customerId]
    );

    const invoices = await query(
      `SELECT si.id, si.invoice_number, si.branch_id, b.branch_name, si.final_amount, si.points_earned, si.points_redeemed, si.points_discount, si.created_at
       FROM swm_sales_invoices si
       LEFT JOIN branches b ON b.id = si.branch_id
       WHERE si.customer_id = $1
       ORDER BY si.id DESC
       LIMIT 20`,
      [customerId]
    );

    return res.json({
      success: true,
      data: {
        customer,
        history,
        invoices
      }
    });
  } catch (err) {
    console.error('Customer details error:', err);
    return res.status(500).json({ success: false, message: 'فشل جلب تفاصيل العميل' });
  }
});

/**
 * POST /api/swm/loyalty/adjust
 * Admin manual points adjustment
 */
router.post('/adjust', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { customer_id, points, notes } = req.body;
    const custId = parseInt(customer_id, 10);
    const pts = parseInt(points, 10);

    if (!custId || isNaN(custId)) {
      return res.status(400).json({ success: false, message: 'معرف العميل غير صالح' });
    }
    if (isNaN(pts) || pts === 0) {
      return res.status(400).json({ success: false, message: 'عدد النقاط يجب أن يكون غير صفري' });
    }

    const result = await transaction(async (client) => {
      const { rows: [customer] } = await client.query(
        `SELECT * FROM customers WHERE id = $1 FOR UPDATE`,
        [custId]
      );
      if (!customer) {
        throw new Error('العميل غير موجود');
      }

      const balanceBefore = parseInt(customer.total_points || 0, 10);
      const balanceAfter = Math.max(0, balanceBefore + pts);

      await client.query(
        `UPDATE customers
         SET total_points = $1,
             lifetime_points = ${pts > 0 ? 'lifetime_points + $2' : 'lifetime_points'},
             updated_at = NOW()
         WHERE id = $3`,
        pts > 0 ? [balanceAfter, pts, custId] : [balanceAfter, custId]
      );

      const { rows: [txRow] } = await client.query(
        `INSERT INTO points_transactions (
           customer_id, branch_id, invoice_id, type, points,
           monetary_value, balance_before, balance_after, notes, created_by, created_at
         ) VALUES ($1, $2, NULL, 'adjust', $3, 0, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [
          custId,
          req.user?.branch_id || req.user?.branchId || null,
          pts,
          balanceBefore,
          balanceAfter,
          notes || 'تعديل يدوي من الإدارة',
          req.user?.id || 1
        ]
      );

      return { customer: { ...customer, total_points: balanceAfter }, transaction: txRow };
    });

    logActivity({
      userId: req.user.id,
      branchId: req.user?.branch_id || null,
      actionType: 'LOYALTY_POINTS_ADJUST',
      entityType: 'customers',
      entityId: custId,
      newValue: {
        points_change: pts,
        new_balance: result.customer.total_points,
        notes: notes || 'تعديل يدوي'
      },
      notes: `تعديل رصيد نقاط العميل #${custId} بمقدار ${pts > 0 ? '+' : ''}${pts} نقطة`
    });

    return res.json({
      success: true,
      message: 'تم تعديل رصيد النقاط بنجاح',
      data: result
    });
  } catch (err) {
    console.error('Adjust points error:', err);
    return res.status(500).json({ success: false, message: err.message || 'فشل تعديل النقاط' });
  }
});

/**
 * GET /api/swm/loyalty/settings
 * Get current loyalty configuration
 */
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const rows = await query(`SELECT key, value, label FROM store_settings WHERE key LIKE 'loyalty_%'`);
    const config = {
      loyalty_enabled: 'true',
      loyalty_points_per_egp: '10',
      loyalty_point_value: '0.50',
      loyalty_min_redeem: '100',
      loyalty_max_redeem_pct: '50'
    };

    for (const r of rows) {
      config[r.key] = r.value;
    }

    return res.json({
      success: true,
      data: {
        loyalty_enabled: config.loyalty_enabled === 'true',
        loyalty_points_per_egp: parseFloat(config.loyalty_points_per_egp) || 10,
        loyalty_point_value: parseFloat(config.loyalty_point_value) || 0.50,
        loyalty_min_redeem: parseInt(config.loyalty_min_redeem, 10) || 100,
        loyalty_max_redeem_pct: parseFloat(config.loyalty_max_redeem_pct) || 50
      }
    });
  } catch (err) {
    console.error('Get loyalty settings error:', err);
    return res.status(500).json({ success: false, message: 'فشل جلب إعدادات الولاء' });
  }
});

/**
 * PUT /api/swm/loyalty/settings
 * Update loyalty configuration
 */
router.put('/settings', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const {
      loyalty_enabled,
      loyalty_points_per_egp,
      loyalty_point_value,
      loyalty_min_redeem,
      loyalty_max_redeem_pct
    } = req.body;

    const updates = [
      { key: 'loyalty_enabled', value: String(Boolean(loyalty_enabled)), label: 'تفعيل نظام نقاط الولاء' },
      { key: 'loyalty_points_per_egp', value: String(Math.max(1, parseFloat(loyalty_points_per_egp) || 10)), label: 'كل كم جنيه = 1 نقطة مكتسبة' },
      { key: 'loyalty_point_value', value: String(Math.max(0.01, parseFloat(loyalty_point_value) || 0.50)), label: 'قيمة النقطة عند الاستبدال (جنيه مصري)' },
      { key: 'loyalty_min_redeem', value: String(Math.max(1, parseInt(loyalty_min_redeem, 10) || 100)), label: 'أقل عدد نقاط مسموح للاستبدال' },
      { key: 'loyalty_max_redeem_pct', value: String(Math.min(100, Math.max(1, parseFloat(loyalty_max_redeem_pct) || 50))), label: 'أقصى نسبة خصم بالنقاط من إجمالي الفاتورة (%)' }
    ];

    for (const u of updates) {
      await query(
        `INSERT INTO store_settings (key, value, label, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, label = EXCLUDED.label, updated_at = NOW()`,
        [u.key, u.value, u.label]
      );
    }

    logActivity({
      userId: req.user.id,
      branchId: req.user?.branch_id || null,
      actionType: 'LOYALTY_SETTINGS_UPDATE',
      entityType: 'store_settings',
      entityId: 0,
      newValue: req.body,
      notes: 'تحديث إعدادات نقاط الولاء للعملاء'
    });

    return res.json({
      success: true,
      message: 'تم تحديث إعدادات نقاط الولاء بنجاح'
    });
  } catch (err) {
    console.error('Update loyalty settings error:', err);
    return res.status(500).json({ success: false, message: 'فشل حفظ إعدادات الولاء' });
  }
});

module.exports = router;
