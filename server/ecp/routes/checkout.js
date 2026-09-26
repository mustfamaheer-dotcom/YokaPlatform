const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { logActivity } = require('../../shared/activityLogger');
const { reserveCartStock, releaseCartReservation } = require('../../shared/inventoryReservation');

const ONLINE_BRANCH_ID = parseInt(process.env.ONLINE_BRANCH_ID || '1', 10);

// Egyptian Governorates with standard flat shipping rates
const EGYPT_GOVERNORATES = [
  { code: 'CAI', name_ar: 'القاهرة', name_en: 'Cairo', shipping_fee: 45 },
  { code: 'GIZ', name_ar: 'الجيزة', name_en: 'Giza', shipping_fee: 45 },
  { code: 'ALY', name_ar: 'الإسكندرية', name_en: 'Alexandria', shipping_fee: 55 },
  { code: 'QAL', name_ar: 'القليوبية', name_en: 'Qalyubia', shipping_fee: 55 },
  { code: 'SHR', name_ar: 'الشرقية', name_en: 'Sharqia', shipping_fee: 60 },
  { code: 'DKH', name_ar: 'الدقهلية', name_en: 'Dakahlia', shipping_fee: 60 },
  { code: 'GHB', name_ar: 'الغربية', name_en: 'Gharbia', shipping_fee: 60 },
  { code: 'MNF', name_ar: 'المنوفية', name_en: 'Menofia', shipping_fee: 60 },
  { code: 'BHR', name_ar: 'البحيرة', name_en: 'Beheira', shipping_fee: 60 },
  { code: 'KFS', name_ar: 'كفر الشيخ', name_en: 'Kafr El Sheikh', shipping_fee: 65 },
  { code: 'DMT', name_ar: 'دمياط', name_en: 'Damietta', shipping_fee: 65 },
  { code: 'PTS', name_ar: 'بورسعيد', name_en: 'Port Said', shipping_fee: 65 },
  { code: 'ISM', name_ar: 'الإسماعيلية', name_en: 'Ismailia', shipping_fee: 65 },
  { code: 'SUZ', name_ar: 'السويس', name_en: 'Suez', shipping_fee: 65 },
  { code: 'BNS', name_ar: 'بني سويف', name_en: 'Beni Suef', shipping_fee: 75 },
  { code: 'FYM', name_ar: 'الفيوم', name_en: 'Fayoum', shipping_fee: 75 },
  { code: 'MNY', name_ar: 'المنيا', name_en: 'Minya', shipping_fee: 80 },
  { code: 'ASY', name_ar: 'أسيوط', name_en: 'Asyut', shipping_fee: 85 },
  { code: 'SOH', name_ar: 'سوهاج', name_en: 'Sohag', shipping_fee: 90 },
  { code: 'QNA', name_ar: 'قنا', name_en: 'Qena', shipping_fee: 95 },
  { code: 'LX', name_ar: 'الأقصر', name_en: 'Luxor', shipping_fee: 95 },
  { code: 'ASW', name_ar: 'أسوان', name_en: 'Aswan', shipping_fee: 100 },
  { code: 'BA', name_ar: 'البحر الأحمر', name_en: 'Red Sea', shipping_fee: 110 },
  { code: 'WAD', name_ar: 'الوادي الجديد', name_en: 'New Valley', shipping_fee: 120 },
  { code: 'MAT', name_ar: 'مطروح', name_en: 'Matrouh', shipping_fee: 110 }
];

/**
 * GET /api/ecp/checkout/shipping-rates
 * Returns list of supported governorates and shipping fees
 */
router.get('/shipping-rates', async (req, res) => {
  try {
    const dbRates = await query(`
      SELECT city_code AS code, city_name AS name_ar, city_name AS name_en, shipping_fee, estimated_days
      FROM ecp_shipping_rates
      WHERE is_active = true
      ORDER BY id ASC
    `);

    const rates = dbRates.length > 0 ? dbRates.map(r => ({
      code: r.code,
      name_ar: r.name_ar,
      name_en: r.name_en,
      shipping_fee: parseFloat(r.shipping_fee),
      estimated_days: r.estimated_days
    })) : EGYPT_GOVERNORATES;

    return res.json({
      success: true,
      data: rates,
      free_shipping_threshold: 1500
    });
  } catch (err) {
    return res.json({
      success: true,
      data: EGYPT_GOVERNORATES,
      free_shipping_threshold: 1500
    });
  }
});

/**
 * GET /api/ecp/checkout/payment-methods
 * Returns active payment methods with account details and instructions
 */
router.get('/payment-methods', async (req, res) => {
  try {
    const methods = await query(`
      SELECT id, method_key, name_ar, name_en, provider,
             account_number, account_name, instructions, requires_receipt, display_order
      FROM ecp_payment_methods
      WHERE is_active = true
      ORDER BY display_order ASC, id ASC
    `);
    return res.json({ success: true, data: methods });
  } catch (err) {
    console.error('ECP fetch payment methods error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/ecp/checkout/reserve
 * Acquire 15-minute temporary inventory reservation before final checkout submission
 */
router.post('/reserve', async (req, res) => {
  try {
    const { cart_id } = req.body;
    if (!cart_id) {
      return res.status(400).json({ success: false, message: 'Cart ID is required' });
    }

    const items = await query(
      `SELECT ci.*, p.product_name
       FROM ecp_cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1`,
      [cart_id]
    );

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Shopping cart is empty' });
    }

    const result = await reserveCartStock(cart_id, ONLINE_BRANCH_ID, items, 900);
    return res.json({
      success: true,
      message: 'تم حجز المخزون لمدة 15 دقيقة لإتمام الطلب',
      expiresAt: result.expiresAt,
      ttlSeconds: result.ttlSeconds
    });
  } catch (err) {
    console.error('ECP reserve stock error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/ecp/checkout/order
 * Place e-commerce order atomically with stock deduction & payment record
 */
router.post('/order', async (req, res) => {
  try {
    const {
      cart_id,
      customer_name,
      customer_email,
      customer_phone,
      governorate,
      city,
      street_address,
      building_apartment,
      payment_method = 'cod', // 'cod', 'instapay', 'vodafone_cash', etc.
      customer_notes,
      transfer_receipt_url,
      transfer_reference
    } = req.body;

    if (!cart_id) {
      return res.status(400).json({ success: false, message: 'Cart ID is required' });
    }

    if (!customer_name || !customer_phone || !governorate || !street_address) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال الاسم، رقم الهاتف، المحافظة، والعنوان بالتفصيل.'
      });
    }

    // Check if selected payment method requires a transfer receipt
    const [configuredMethod] = await query(
      `SELECT method_key, name_ar, requires_receipt FROM ecp_payment_methods WHERE method_key = $1 LIMIT 1`,
      [payment_method]
    );

    const isReceiptRequired = configuredMethod ? configuredMethod.requires_receipt : (payment_method !== 'cod');

    if (isReceiptRequired && (!transfer_receipt_url || !String(transfer_receipt_url).trim())) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إرفاق صورة إشعار التحويل من تطبيق إنستاباي أو المحفظة الإلكترونية لإتمام الطلب.'
      });
    }

    // Calculate shipping cost based on governorate
    let shippingCost = 50;
    let governorateName = governorate;

    try {
      const [rate] = await query(
        `SELECT city_name, shipping_fee FROM ecp_shipping_rates
         WHERE is_active = true AND (city_name = $1 OR city_code = $1) LIMIT 1`,
        [governorate]
      );
      if (rate) {
        shippingCost = parseFloat(rate.shipping_fee);
        governorateName = rate.city_name || governorate;
      } else {
        const fallbackGov = EGYPT_GOVERNORATES.find(
          (g) => g.name_ar === governorate || g.name_en.toLowerCase() === governorate.toLowerCase() || g.code === governorate
        );
        if (fallbackGov) {
          shippingCost = fallbackGov.shipping_fee;
          governorateName = fallbackGov.name_ar;
        } else {
          shippingCost = 50;
        }
      }
    } catch (e) {
      const fallbackGov = EGYPT_GOVERNORATES.find(
        (g) => g.name_ar === governorate || g.name_en.toLowerCase() === governorate.toLowerCase() || g.code === governorate
      );
      if (fallbackGov) {
        shippingCost = fallbackGov.shipping_fee;
        governorateName = fallbackGov.name_ar;
      } else {
        shippingCost = 50;
      }
    }

    // Fetch cart items
    const cartItems = await query(
      `SELECT ci.*, p.product_name, p.product_code, p.cost_price,
              pv.variant_sku, pv.color, pv.size
       FROM ecp_cart_items ci
       JOIN products p ON p.id = ci.product_id
       LEFT JOIN product_variants pv ON pv.id = ci.variant_id
       WHERE ci.cart_id = $1`,
      [cart_id]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'سلة التسوق فارغة' });
    }

    // Calculate totals
    let subtotal = 0;
    for (const it of cartItems) {
      subtotal += (parseFloat(it.unit_price) || 0) * parseInt(it.quantity, 10);
    }

    // Free shipping threshold check (e.g. >= 1500 EGP)
    if (subtotal >= 1500) {
      shippingCost = 0;
    }

    const totalAmount = subtotal + shippingCost;

    // Generate Order Number: ORD-YYMM-XXXXX
    const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
    const [{ count }] = await query(`SELECT COUNT(id) AS count FROM ecp_orders`);
    const orderNumber = `ORD-${yymm}-${String(parseInt(count, 10) + 1).padStart(5, '0')}`;

    const shippingAddress = {
      recipient_name: customer_name,
      phone: customer_phone,
      governorate: governorateName,
      city: city || '',
      street_address,
      building_apartment: building_apartment || ''
    };

    // Execute atomic order transaction
    const orderResult = await transaction(async (client) => {
      // 1. Insert into ecp_orders
      const initialPaymentStatus = payment_method === 'card' ? 'paid' : 'pending';
      const initialOrderStatus = 'processing';

      const [order] = (await client.query(
        `INSERT INTO ecp_orders (
          order_number, guest_email, billing_address, shipping_address,
          subtotal, shipping_cost, total_amount, order_status,
          payment_status, payment_method, fulfilling_branch_id,
          customer_notes, transfer_receipt_url, transfer_reference, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *`,
        [
          orderNumber,
          customer_email || null,
          JSON.stringify(shippingAddress),
          JSON.stringify(shippingAddress),
          subtotal,
          shippingCost,
          totalAmount,
          initialOrderStatus,
          initialPaymentStatus,
          payment_method,
          ONLINE_BRANCH_ID,
          customer_notes || null,
          transfer_receipt_url || null,
          transfer_reference || null
        ]
      )).rows;

      // 2. Lock and deduct stock from inventory_balances & record movements
      for (const it of cartItems) {
        const qty = parseInt(it.quantity, 10);
        let balanceRow;

        if (it.variant_id) {
          const res = await client.query(
            `SELECT * FROM inventory_balances
             WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3
             FOR UPDATE`,
            [ONLINE_BRANCH_ID, it.product_id, it.variant_id]
          );
          if (res.rows.length > 0 && parseInt(res.rows[0].available_qty, 10) >= qty) {
            balanceRow = res.rows[0];
          } else {
            // Check base inventory
            const baseRes = await client.query(
              `SELECT * FROM inventory_balances
               WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL
               FOR UPDATE`,
              [ONLINE_BRANCH_ID, it.product_id]
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
            [ONLINE_BRANCH_ID, it.product_id]
          );
          balanceRow = res.rows[0];
        }

        const availStock = balanceRow ? parseInt(balanceRow.available_qty, 10) : 0;
        if (availStock < qty) {
          throw new Error(`عذراً، نفد مخزون الصنف "${it.product_name}". المتاح: ${availStock}`);
        }

        // Deduct from inventory_balances
        await client.query(
          `UPDATE inventory_balances
           SET available_qty = available_qty - $1,
               sold_qty = sold_qty + $1,
               last_movement_at = NOW(),
               last_updated = NOW()
           WHERE id = $2`,
          [qty, balanceRow.id]
        );

        // Record inventory movement with integer order.id
        await client.query(
          `INSERT INTO inventory_movements (
            branch_id, product_id, variant_id, movement_type, quantity_change,
            quantity_before, quantity_after, reference_type, reference_id,
            notes, created_at, updated_at
          ) VALUES ($1, $2, $3, 'ecom_sale', $4, $5, $6, 'ecp_orders', $7, $8, NOW(), NOW())`,
          [
            ONLINE_BRANCH_ID,
            it.product_id,
            it.variant_id,
            -qty,
            availStock,
            availStock - qty,
            order.id,
            `Online Order #${orderNumber}`
          ]
        );
      }

      // 3. Insert items into ecp_order_items
      for (const it of cartItems) {
        const unitPrice = parseFloat(it.unit_price) || 0;
        const lineTotal = unitPrice * it.quantity;
        const variantDesc = [it.color, it.size].filter(Boolean).join(' - ') || null;

        await client.query(
          `INSERT INTO ecp_order_items (
            order_id, product_id, variant_id, product_name, product_sku,
            variant_desc, quantity, unit_price, unit_cost, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            order.id,
            it.product_id,
            it.variant_id,
            it.product_name,
            it.variant_sku || it.product_code,
            variantDesc,
            it.quantity,
            unitPrice,
            parseFloat(it.cost_price || 0),
            lineTotal
          ]
        );
      }

      // 4. Record payment in ecp_payments
      const paymentRef = `PAY-${orderNumber}`;
      await client.query(
        `INSERT INTO ecp_payments (
          order_id, payment_ref, amount, currency, payment_method,
          status, receipt_url, processed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, 'EGP', $4, $5, $6, NOW(), NOW(), NOW())`,
        [
          order.id,
          paymentRef,
          totalAmount,
          payment_method,
          initialPaymentStatus === 'paid' ? 'completed' : 'pending',
          transfer_receipt_url || null
        ]
      );

      // 5. Empty shopping cart
      await client.query(`DELETE FROM ecp_cart_items WHERE cart_id = $1`, [cart_id]);

      return order;
    });

    // 6. Release Redis temporary hold now that DB deduction is permanent
    await releaseCartReservation(cart_id, ONLINE_BRANCH_ID, cartItems);

    logActivity({
      userId: null,
      branchId: ONLINE_BRANCH_ID,
      actionType: 'ECP_ORDER_PLACED',
      entityType: 'ecp_orders',
      entityId: orderResult.id,
      newValue: {
        order_number: orderNumber,
        customer_name,
        total_amount: totalAmount,
        payment_method,
        has_receipt: Boolean(transfer_receipt_url)
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Online Order #${orderNumber} placed by ${customer_name} for ${totalAmount} EGP (${payment_method})`
    });

    return res.status(201).json({
      success: true,
      message: 'تم تأكيد طلبك بنجاح!',
      data: {
        order_number: orderNumber,
        order_id: orderResult.id,
        total_amount: totalAmount,
        subtotal,
        shipping_cost: shippingCost,
        shipping_address: shippingAddress,
        payment_method,
        payment_status: orderResult.payment_status,
        transfer_receipt_url: orderResult.transfer_receipt_url,
        transfer_reference: orderResult.transfer_reference
      }
    });
  } catch (err) {
    console.error('ECP checkout error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/ecp/checkout/order/:orderNumber
 * Fetch order confirmation details by order number
 */
router.get('/order/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const [order] = await query(
      `SELECT * FROM ecp_orders WHERE order_number = $1`,
      [orderNumber]
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const items = await query(
      `SELECT oi.*, p.slug, p.featured_image
       FROM ecp_order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
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
    console.error('ECP get order error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
