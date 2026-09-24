const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * GET /api/swm/suppliers
 * List suppliers with search, status filter, and pagination
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [];
    const params = [];
    let pIdx = 1;

    if (search && search.trim()) {
      whereClauses.push(`(s.supplier_name ILIKE $${pIdx} OR s.supplier_code ILIKE $${pIdx} OR s.phone ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (status) {
      whereClauses.push(`s.status = $${pIdx}`);
      params.push(status);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(s.id) AS total FROM suppliers s ${whereSql}`;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult[0]?.total || 0, 10);

    const dataSql = `
      SELECT s.*,
             COUNT(DISTINCT pi.id) AS invoice_count,
             COALESCE(SUM(pi.final_amount), 0) AS total_purchased
      FROM suppliers s
      LEFT JOIN purchase_invoices pi ON pi.supplier_id = s.id
      ${whereSql}
      GROUP BY s.id
      ORDER BY s.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const suppliers = await query(dataSql, params);

    return res.json({
      success: true,
      data: suppliers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Suppliers list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/suppliers/:id
 * Retrieve single supplier details
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [supplier] = await query(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const recentInvoices = await query(
      `SELECT id, invoice_number, invoice_date, final_amount, paid_amount, payment_status, status
       FROM purchase_invoices
       WHERE supplier_id = $1
       ORDER BY invoice_date DESC, id DESC
       LIMIT 10`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...supplier,
        recent_invoices: recentInvoices
      }
    });
  } catch (err) {
    console.error('Supplier fetch error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

const { validate, createSupplierSchema, supplierPaymentSchema } = require('../../shared/validators');

/**
 * POST /api/swm/suppliers
 * Create a new supplier (restricted to exact 5 fields, atomic transaction)
 */
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), validate(createSupplierSchema), async (req, res) => {
  try {
    const {
      supplier_name,
      contact_person,
      phone,
      address,
      opening_balance = 0
    } = req.body;

    // Auto-generate supplier code
    const [{ count }] = await query(`SELECT COUNT(id) AS count FROM suppliers`);
    const finalCode = `SUP-${String(parseInt(count, 10) + 1).padStart(4, '0')}`;

    const initialBalance = parseFloat(opening_balance) || 0;

    const newSupplier = await transaction(async (client) => {
      const [inserted] = (await client.query(
        `INSERT INTO suppliers (
          supplier_code, supplier_name, contact_person, phone, email,
          address, tax_id, opening_balance, current_balance, credit_limit,
          payment_terms_days, status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NULL, $5, NULL, $6, $7, NULL, 30, 'active', NULL, NOW(), NOW())
        RETURNING *`,
        [
          finalCode,
          supplier_name.trim(),
          contact_person ? contact_person.trim() : null,
          phone ? phone.trim() : null,
          address ? address.trim() : null,
          initialBalance,
          initialBalance
        ]
      )).rows;
      return inserted;
    });

    logActivity({
      userId: req.user.id,
      branchId: req.user.branch_id || 1,
      actionType: 'CREATE_SUPPLIER',
      entityType: 'suppliers',
      entityId: newSupplier.id,
      newValue: newSupplier,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Supplier ${supplier_name} created with code ${finalCode} (Opening balance: ${initialBalance})`
    });

    return res.status(201).json({ success: true, data: newSupplier });
  } catch (err) {
    console.error('Create supplier error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/suppliers/:id
 * Update supplier details
 */
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const [old] = await query(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    if (!old) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      tax_id,
      credit_limit,
      payment_terms_days,
      status,
      notes
    } = req.body;

    const [updated] = await query(
      `UPDATE suppliers
       SET supplier_name = COALESCE($1, supplier_name),
           contact_person = COALESCE($2, contact_person),
           phone = COALESCE($3, phone),
           email = COALESCE($4, email),
           address = COALESCE($5, address),
           tax_id = COALESCE($6, tax_id),
           credit_limit = COALESCE($7, credit_limit),
           payment_terms_days = COALESCE($8, payment_terms_days),
           status = COALESCE($9, status),
           notes = COALESCE($10, notes),
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        supplier_name ? supplier_name.trim() : null,
        contact_person !== undefined ? contact_person : null,
        phone !== undefined ? phone : null,
        email !== undefined ? email : null,
        address !== undefined ? address : null,
        tax_id !== undefined ? tax_id : null,
        credit_limit !== undefined ? (credit_limit ? parseFloat(credit_limit) : null) : null,
        payment_terms_days !== undefined ? (payment_terms_days ? parseInt(payment_terms_days, 10) : null) : null,
        status || null,
        notes !== undefined ? notes : null,
        id
      ]
    );

    logActivity({
      userId: req.user.id,
      branchId: req.user.branch_id || 1,
      actionType: 'UPDATE_SUPPLIER',
      entityType: 'suppliers',
      entityId: id,
      oldValue: old,
      newValue: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Supplier ${id} updated`
    });

    return res.json({ success: true, data: updated, message: 'Supplier updated successfully' });
  } catch (err) {
    console.error('Update supplier error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/suppliers/:id/ledger
 * Combined account ledger: invoices (debit/purchase) and payments (credit)
 */
router.get('/:id/ledger', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [supplier] = await query(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const invoices = await query(
      `SELECT id, invoice_number AS ref, invoice_date AS date, final_amount AS amount,
              'INVOICE' AS type, notes, payment_method, payment_breakdown, created_at
       FROM purchase_invoices
       WHERE supplier_id = $1
       ORDER BY invoice_date ASC, id ASC`,
      [id]
    );

    const payments = await query(
      `SELECT id, payment_ref AS ref, payment_date AS date, amount, direction,
              'PAYMENT' AS type, notes, payment_method, payment_breakdown, created_at
       FROM supplier_payments
       WHERE supplier_id = $1
       ORDER BY payment_date ASC, id ASC`,
      [id]
    );

    const returns = await query(
      `SELECT id, return_number AS ref, return_date AS date, total_amount AS amount,
              'RETURN' AS type, reason AS notes, refund_method AS payment_method,
              payment_breakdown, created_at
       FROM purchase_returns
       WHERE supplier_id = $1
       ORDER BY return_date ASC, id ASC`,
      [id]
    );

    // Merge and sort chronologically
    const allEntries = [
      ...invoices.map(inv => {
        let breakdown = null;
        if (inv.payment_breakdown) {
          try {
            breakdown = typeof inv.payment_breakdown === 'string' ? JSON.parse(inv.payment_breakdown) : inv.payment_breakdown;
          } catch (e) {
            breakdown = null;
          }
        }
        return {
          id: inv.id,
          ref: inv.ref,
          date: inv.date,
          type: 'invoice',
          type_label: 'فاتورة توريد',
          debit: parseFloat(inv.amount), // Increases what we owe supplier
          credit: 0,
          payment_method: inv.payment_method,
          payment_breakdown: breakdown,
          notes: inv.notes,
          created_at: inv.created_at
        };
      }),
      ...payments.map(pay => {
        let breakdown = null;
        if (pay.payment_breakdown) {
          try {
            breakdown = typeof pay.payment_breakdown === 'string' ? JSON.parse(pay.payment_breakdown) : pay.payment_breakdown;
          } catch (e) {
            breakdown = null;
          }
        }
        const isReceipt = pay.direction === 'receipt';
        return {
          id: pay.id,
          ref: pay.ref,
          date: pay.date,
          type: isReceipt ? 'receipt' : 'payment',
          type_label: isReceipt ? 'استرداد مالي من المورد' : 'دفعة سداد للمورد',
          debit: isReceipt ? parseFloat(pay.amount) : 0, // Receipt from supplier increases what we owe or cancels credit
          credit: !isReceipt ? parseFloat(pay.amount) : 0, // Payment to supplier decreases what we owe
          payment_method: pay.payment_method,
          payment_breakdown: breakdown,
          notes: pay.notes,
          created_at: pay.created_at
        };
      }),
      ...returns.map(ret => {
        let breakdown = null;
        if (ret.payment_breakdown) {
          try {
            breakdown = typeof ret.payment_breakdown === 'string' ? JSON.parse(ret.payment_breakdown) : ret.payment_breakdown;
          } catch (e) {
            breakdown = null;
          }
        }
        return {
          id: ret.id,
          ref: ret.ref,
          date: ret.date,
          type: 'return',
          type_label: 'مرتجع مشتريات',
          debit: 0,
          credit: parseFloat(ret.amount), // Goods returned decrease liability to supplier
          payment_method: ret.payment_method,
          payment_breakdown: breakdown,
          notes: ret.notes || 'مرتجع أصناف للمورد',
          created_at: ret.created_at
        };
      })
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let running = parseFloat(supplier.opening_balance) || 0;
    const ledger = allEntries.map(entry => {
      running += entry.debit - entry.credit;
      return {
        ...entry,
        balance_after: running
      };
    });

    return res.json({
      success: true,
      data: {
        supplier,
        opening_balance: parseFloat(supplier.opening_balance) || 0,
        current_balance: parseFloat(supplier.current_balance) || 0,
        ledger
      }
    });
  } catch (err) {
    console.error('Supplier ledger error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/suppliers/:id/pay
 * Record payment to supplier with Multi-tender Split Payment support and atomic transaction
 */
router.post('/:id/pay', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), validate(supplierPaymentSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      payment_method = 'cash',
      payment_breakdown = null,
      payment_date = new Date().toISOString().split('T')[0],
      notes,
      invoice_id
    } = req.body;

    // Calculate total amount from split breakdown if provided
    let calculatedTotal = 0;
    let finalPaymentMethod = payment_method;

    if (Array.isArray(payment_breakdown) && payment_breakdown.length > 0) {
      calculatedTotal = payment_breakdown.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      finalPaymentMethod = payment_breakdown.length > 1
        ? 'split'
        : (payment_breakdown[0].method || payment_method);
    } else {
      calculatedTotal = parseFloat(amount) || 0;
    }

    const payAmount = calculatedTotal > 0 ? calculatedTotal : (parseFloat(amount) || 0);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'مبلغ الدفعة الإجمالي يجب أن يكون أكبر من صفر' });
    }

    const [supplier] = await query(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    }

    const paymentRef = `SPAY-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const breakdownJson = Array.isArray(payment_breakdown) && payment_breakdown.length > 0
      ? JSON.stringify(payment_breakdown)
      : null;

    const result = await transaction(async (client) => {
      const [payment] = (await client.query(
        `INSERT INTO supplier_payments (
          payment_ref, supplier_id, invoice_id, amount, payment_method,
          payment_breakdown, payment_date, reference_no, direction, notes, recorded_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, 'payment', $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          paymentRef,
          id,
          invoice_id || null,
          payAmount,
          finalPaymentMethod,
          breakdownJson,
          payment_date,
          notes || null,
          req.user.id
        ]
      )).rows;

      // Update supplier balance (payment reduces liability)
      const [updatedSupplier] = (await client.query(
        `UPDATE suppliers
         SET current_balance = current_balance - $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [payAmount, id]
      )).rows;

      // If tied to a specific purchase invoice, update paid_amount & payment_status
      if (invoice_id) {
        const [inv] = (await client.query(`SELECT * FROM purchase_invoices WHERE id = $1`, [invoice_id])).rows;
        if (inv) {
          const newPaid = parseFloat(inv.paid_amount || 0) + payAmount;
          const finalAmt = parseFloat(inv.final_amount);
          const newStatus = newPaid >= finalAmt ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');
          await client.query(
            `UPDATE purchase_invoices
             SET paid_amount = $1, payment_status = $2, updated_at = NOW()
             WHERE id = $3`,
            [newPaid, newStatus, invoice_id]
          );
        }
      }

      return { payment, updatedSupplier };
    });

    logActivity({
      userId: req.user.id,
      branchId: req.user.branch_id || 1,
      actionType: 'SUPPLIER_PAYMENT',
      entityType: 'supplier_payments',
      entityId: result.payment.id,
      newValue: { amount: payAmount, payment_ref: paymentRef, supplier_id: id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Paid ${payAmount} to supplier ${supplier.supplier_name}`
    });

    return res.status(201).json({ success: true, data: result.payment, current_balance: result.updatedSupplier.current_balance });
  } catch (err) {
    console.error('Supplier payment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
