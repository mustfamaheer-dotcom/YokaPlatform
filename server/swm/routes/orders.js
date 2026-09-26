const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * GET /api/swm/orders
 * Returns list of e-commerce customer orders with filter & pagination
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [];
    const params = [];
    let pIdx = 1;

    if (status && status !== 'all') {
      whereClauses.push(`o.order_status = $${pIdx}`);
      params.push(status);
      pIdx++;
    }

    if (search && search.trim()) {
      whereClauses.push(`(o.order_number ILIKE $${pIdx} OR o.shipping_address->>'phone' ILIKE $${pIdx} OR o.shipping_address->>'recipient_name' ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(id) AS total FROM ecp_orders o ${whereSql}`;
    const [countResult] = await query(countSql, params);
    const total = parseInt(countResult?.total || 0, 10);

    const ordersSql = `
      SELECT o.id, o.order_number, o.guest_email, o.shipping_address,
             o.subtotal, o.shipping_cost, o.total_amount,
             o.order_status, o.payment_status, o.payment_method,
             o.shipping_carrier, o.tracking_number, o.parcel_count,
             o.shipped_at, o.delivered_at,
             o.fulfilling_branch_id, o.customer_notes, o.transfer_receipt_url, o.transfer_reference, o.created_at,
             COUNT(oi.id) AS items_count
      FROM ecp_orders o
      LEFT JOIN ecp_order_items oi ON oi.order_id = o.id
      ${whereSql}
      GROUP BY o.id
      ORDER BY o.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const orders = await query(ordersSql, params);

    return res.json({
      success: true,
      data: orders,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('SWM orders fetch error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/orders/shipping-rates
 * Retrieve all cities / delivery rates
 */
router.get('/shipping-rates', requireAuth, async (req, res) => {
  try {
    const rates = await query(`
      SELECT * FROM ecp_shipping_rates
      ORDER BY id ASC
    `);
    return res.json({ success: true, data: rates });
  } catch (err) {
    console.error('SWM fetch shipping rates error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/orders/shipping-rates
 * Add new city/region with shipping fee
 */
router.post('/shipping-rates', requireAuth, async (req, res) => {
  try {
    const { city_name, city_code, shipping_fee, estimated_days = '2-4 أيام عمل' } = req.body;
    if (!city_name || shipping_fee === undefined) {
      return res.status(400).json({ success: false, message: 'اسم المدينة وسعر الشحن مطلوبان' });
    }

    const code = city_code || `ZONE-${Date.now().toString().slice(-4)}`;
    const [created] = await query(
      `INSERT INTO ecp_shipping_rates (city_name, city_code, shipping_fee, estimated_days, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       RETURNING *`,
      [city_name.trim(), code.toUpperCase().trim(), parseFloat(shipping_fee), estimated_days]
    );

    return res.status(201).json({ success: true, data: created, message: 'تمت إضافة المدينة بنجاح' });
  } catch (err) {
    console.error('SWM add shipping rate error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/orders/shipping-rates/:id
 * Update city delivery fee, days, or active status
 */
router.put('/shipping-rates/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { city_name, shipping_fee, estimated_days, is_active } = req.body;

    const [updated] = await query(
      `UPDATE ecp_shipping_rates SET
        city_name = COALESCE($1, city_name),
        shipping_fee = COALESCE($2, shipping_fee),
        estimated_days = COALESCE($3, estimated_days),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        city_name ? city_name.trim() : null,
        shipping_fee !== undefined ? parseFloat(shipping_fee) : null,
        estimated_days || null,
        is_active !== undefined ? Boolean(is_active) : null,
        id
      ]
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    return res.json({ success: true, data: updated, message: 'تم تحديث سعر التوصيل بنجاح' });
  } catch (err) {
    console.error('SWM update shipping rate error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/swm/orders/shipping-rates/:id
 * Remove city from shipping table
 */
router.delete('/shipping-rates/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM ecp_shipping_rates WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'تم حذف المدينة بنجاح' });
  } catch (err) {
    console.error('SWM delete shipping rate error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/orders/shipping-carriers
 * Retrieve all shipping companies
 */
router.get('/shipping-carriers', requireAuth, async (req, res) => {
  try {
    const carriers = await query(`
      SELECT * FROM ecp_shipping_carriers
      ORDER BY id ASC
    `);
    return res.json({ success: true, data: carriers });
  } catch (err) {
    console.error('SWM fetch shipping carriers error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/orders/shipping-carriers
 * Add new shipping company
 */
router.post('/shipping-carriers', requireAuth, async (req, res) => {
  try {
    const { carrier_name, contact_phone, tracking_url_template } = req.body;
    if (!carrier_name || !String(carrier_name).trim()) {
      return res.status(400).json({ success: false, message: 'اسم شركة الشحن مطلوب' });
    }

    const [created] = await query(
      `INSERT INTO ecp_shipping_carriers (carrier_name, contact_phone, tracking_url_template, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())
       RETURNING *`,
      [carrier_name.trim(), contact_phone || null, tracking_url_template || null]
    );

    return res.status(201).json({ success: true, data: created, message: 'تمت إضافة شركة الشحن بنجاح' });
  } catch (err) {
    console.error('SWM add shipping carrier error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/orders/shipping-carriers/:id
 * Update shipping company
 */
router.put('/shipping-carriers/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { carrier_name, contact_phone, tracking_url_template, is_active } = req.body;

    const [updated] = await query(
      `UPDATE ecp_shipping_carriers SET
        carrier_name = COALESCE($1, carrier_name),
        contact_phone = COALESCE($2, contact_phone),
        tracking_url_template = COALESCE($3, tracking_url_template),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        carrier_name ? carrier_name.trim() : null,
        contact_phone !== undefined ? contact_phone : null,
        tracking_url_template !== undefined ? tracking_url_template : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id
      ]
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Carrier not found' });
    }

    return res.json({ success: true, data: updated, message: 'تم تحديث بيانات شركة الشحن بنجاح' });
  } catch (err) {
    console.error('SWM update shipping carrier error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/swm/orders/shipping-carriers/:id
 * Delete shipping company
 */
router.delete('/shipping-carriers/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM ecp_shipping_carriers WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'تم حذف شركة الشحن بنجاح' });
  } catch (err) {
    console.error('SWM delete shipping carrier error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// ECP PAYMENT METHODS MANAGEMENT (ADMIN)
// ==========================================

/**
 * GET /api/swm/orders/payment-methods
 * Retrieve all payment methods (active and inactive)
 */
router.get('/payment-methods', requireAuth, async (req, res) => {
  try {
    const methods = await query(`
      SELECT * FROM ecp_payment_methods
      ORDER BY display_order ASC, id ASC
    `);
    return res.json({ success: true, data: methods });
  } catch (err) {
    console.error('SWM fetch payment methods error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/orders/payment-methods
 * Add a new payment method / wallet
 */
router.post('/payment-methods', requireAuth, async (req, res) => {
  try {
    const {
      method_key,
      name_ar,
      name_en,
      provider = 'other',
      account_number,
      account_name,
      instructions,
      requires_receipt = true,
      is_active = true,
      display_order = 0
    } = req.body;

    if (!name_ar || !method_key) {
      return res.status(400).json({ success: false, message: 'اسم طريقة الدفع والمفتاح الفريد مطلوبان' });
    }

    const cleanKey = String(method_key).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const [existing] = await query(
      `SELECT id FROM ecp_payment_methods WHERE method_key = $1`,
      [cleanKey]
    );

    if (existing) {
      return res.status(400).json({ success: false, message: 'مفتاح طريقة الدفع مسجل مسبقاً، يرجى اختيار اسم فريد' });
    }

    const [created] = await query(
      `INSERT INTO ecp_payment_methods (
        method_key, name_ar, name_en, provider,
        account_number, account_name, instructions,
        requires_receipt, is_active, display_order, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        cleanKey,
        name_ar.trim(),
        name_en ? name_en.trim() : null,
        provider,
        account_number ? String(account_number).trim() : null,
        account_name ? String(account_name).trim() : null,
        instructions ? instructions.trim() : null,
        Boolean(requires_receipt),
        Boolean(is_active),
        parseInt(display_order, 10) || 0
      ]
    );

    return res.status(201).json({
      success: true,
      data: created,
      message: 'تمت إضافة طريقة الدفع بنجاح'
    });
  } catch (err) {
    console.error('SWM create payment method error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/orders/payment-methods/:id
 * Update payment method details (InstaPay, wallet, active status, instructions)
 */
router.put('/payment-methods/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name_ar,
      name_en,
      provider,
      account_number,
      account_name,
      instructions,
      requires_receipt,
      is_active,
      display_order
    } = req.body;

    const [existing] = await query(`SELECT * FROM ecp_payment_methods WHERE id = $1`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'طريقة الدفع غير موجودة' });
    }

    const [updated] = await query(
      `UPDATE ecp_payment_methods SET
        name_ar = COALESCE($1, name_ar),
        name_en = COALESCE($2, name_en),
        provider = COALESCE($3, provider),
        account_number = COALESCE($4, account_number),
        account_name = COALESCE($5, account_name),
        instructions = COALESCE($6, instructions),
        requires_receipt = COALESCE($7, requires_receipt),
        is_active = COALESCE($8, is_active),
        display_order = COALESCE($9, display_order),
        updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        name_ar !== undefined ? name_ar.trim() : null,
        name_en !== undefined ? name_en.trim() : null,
        provider !== undefined ? provider : null,
        account_number !== undefined ? (account_number ? String(account_number).trim() : null) : null,
        account_name !== undefined ? (account_name ? String(account_name).trim() : null) : null,
        instructions !== undefined ? instructions : null,
        requires_receipt !== undefined ? Boolean(requires_receipt) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        display_order !== undefined ? parseInt(display_order, 10) : null,
        id
      ]
    );

    return res.json({
      success: true,
      data: updated,
      message: 'تم تحديث بيانات طريقة الدفع بنجاح'
    });
  } catch (err) {
    console.error('SWM update payment method error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/swm/orders/payment-methods/:id
 * Delete a payment method
 */
router.delete('/payment-methods/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [method] = await query(`SELECT method_key FROM ecp_payment_methods WHERE id = $1`, [id]);
    if (method && method.method_key === 'cod') {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف خيار الدفع عند الاستلام الأساسي' });
    }

    await query(`DELETE FROM ecp_payment_methods WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'تم حذف طريقة الدفع بنجاح' });
  } catch (err) {
    console.error('SWM delete payment method error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/orders/:id/ship
 * Mark order as shipped with tracking number (بوليصة الشحن) and parcel count (عدد الطرود)
 */
router.put('/:id/ship', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { tracking_number, parcel_count = 1, shipping_carrier, shipping_notes } = req.body;

    if (!tracking_number || !String(tracking_number).trim()) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال رقم بوليصة الشحن' });
    }

    const [existing] = await query(`SELECT * FROM ecp_orders WHERE id = $1`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    await query(
      `UPDATE ecp_orders SET
        order_status = 'shipped',
        tracking_number = $1,
        parcel_count = $2,
        shipping_carrier = $3,
        admin_notes = COALESCE($4, admin_notes),
        shipped_at = NOW(),
        updated_at = NOW()
       WHERE id = $5`,
      [
        String(tracking_number).trim(),
        parseInt(parcel_count, 10) || 1,
        shipping_carrier || 'مندوب الشحن',
        shipping_notes || null,
        id
      ]
    );

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'SHIP_ORDER',
      entityType: 'ecp_orders',
      entityId: id,
      newValue: { tracking_number, parcel_count, shipping_carrier },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Order ${existing.order_number} shipped with waybill ${tracking_number} (${parcel_count} parcels)`
    });

    return res.json({
      success: true,
      message: 'تم شحن الطلب بنجاح وتسجيل بوليصة الشحن وعدد الطرود'
    });
  } catch (err) {
    console.error('SWM ship order error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/orders/:id
 * Retrieve full order details including line items and customer address
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === 'payment-methods' || id === 'shipping-rates' || id === 'shipping-carriers') {
      return next();
    }
    const isNumeric = /^\d+$/.test(String(id).trim());

    const [order] = await query(
      `SELECT o.*, b.branch_name AS fulfilling_branch_name
       FROM ecp_orders o
       LEFT JOIN branches b ON b.id = o.fulfilling_branch_id
       WHERE ${isNumeric ? 'o.id = $1' : 'o.order_number = $1'}`,
      [isNumeric ? parseInt(id, 10) : String(id).trim()]
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const items = await query(
      `SELECT oi.*, p.product_code, p.featured_image
       FROM ecp_order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [order.id]
    );

    return res.json({
      success: true,
      data: {
        ...order,
        items
      }
    });
  } catch (err) {
    console.error('SWM single order error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/orders/:id/status
 * Update order and payment status
 */
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, payment_status } = req.body;

    const [existing] = await query(`SELECT * FROM ecp_orders WHERE id = $1`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await query(
      `UPDATE ecp_orders SET
        order_status = COALESCE($1, order_status),
        payment_status = COALESCE($2, payment_status),
        delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
        updated_at = NOW()
       WHERE id = $3`,
      [order_status || null, payment_status || null, id]
    );

    logActivity({
      userId: req.user.id,
      branchId: req.user.branchId,
      actionType: 'UPDATE_ORDER_STATUS',
      entityType: 'ecp_orders',
      entityId: id,
      oldValue: { order_status: existing.order_status, payment_status: existing.payment_status },
      newValue: { order_status: order_status || existing.order_status, payment_status: payment_status || existing.payment_status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Order ${existing.order_number} status updated to ${order_status || existing.order_status}`
    });

    return res.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح'
    });
  } catch (err) {
    console.error('SWM update order status error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/orders/:id/verify-payment
 * Confirm transfer receipt and mark payment as paid
 */
router.put('/:id/verify-payment', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await query(`SELECT * FROM ecp_orders WHERE id = $1`, [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    await query(
      `UPDATE ecp_orders SET payment_status = 'paid', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await query(
      `UPDATE ecp_payments SET status = 'completed', updated_at = NOW() WHERE order_id = $1`,
      [id]
    );

    logActivity({
      userId: req.user?.id || null,
      branchId: existing.fulfilling_branch_id,
      actionType: 'ECP_PAYMENT_VERIFIED',
      entityType: 'ecp_orders',
      entityId: id,
      notes: `Verified payment transfer receipt for order #${existing.order_number}`
    });

    return res.json({
      success: true,
      message: 'تم تأكيد استلام التحويل بنجاح وتغيير حالة الدفع إلى مدفوع'
    });
  } catch (err) {
    console.error('SWM verify payment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

