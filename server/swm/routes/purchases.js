const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * GET /api/swm/purchases
 * Paginated list of purchase invoices with joins for supplier and warehouse
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      supplier_id,
      branch_id,
      status,
      payment_status,
      date_from,
      date_to
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [];
    const params = [];
    let pIdx = 1;

    if (search && search.trim()) {
      whereClauses.push(`(pi.invoice_number ILIKE $${pIdx} OR s.supplier_name ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (supplier_id) {
      whereClauses.push(`pi.supplier_id = $${pIdx}`);
      params.push(parseInt(supplier_id, 10));
      pIdx++;
    }

    if (branch_id) {
      whereClauses.push(`pi.warehouse_branch_id = $${pIdx}`);
      params.push(parseInt(branch_id, 10));
      pIdx++;
    }

    if (status) {
      whereClauses.push(`pi.status = $${pIdx}`);
      params.push(status);
      pIdx++;
    }

    if (payment_status) {
      whereClauses.push(`pi.payment_status = $${pIdx}`);
      params.push(payment_status);
      pIdx++;
    }

    if (date_from) {
      whereClauses.push(`pi.invoice_date >= $${pIdx}`);
      params.push(date_from);
      pIdx++;
    }

    if (date_to) {
      whereClauses.push(`pi.invoice_date <= $${pIdx}`);
      params.push(date_to);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(pi.id) AS total
      FROM purchase_invoices pi
      LEFT JOIN suppliers s ON s.id = pi.supplier_id
      ${whereSql}
    `;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult[0]?.total || 0, 10);

    const dataSql = `
      SELECT pi.*,
             s.supplier_name, s.supplier_code, s.phone AS supplier_phone,
             b.branch_name AS warehouse_name, b.branch_code AS warehouse_code,
             u.full_name AS created_by_name,
             COUNT(pii.id) AS items_count,
             COALESCE(SUM(pii.quantity), 0) AS total_units
      FROM purchase_invoices pi
      LEFT JOIN suppliers s ON s.id = pi.supplier_id
      LEFT JOIN branches b ON b.id = pi.warehouse_branch_id
      LEFT JOIN users u ON u.id = pi.created_by
      LEFT JOIN purchase_invoice_items pii ON pii.invoice_id = pi.id
      ${whereSql}
      GROUP BY pi.id, s.supplier_name, s.supplier_code, s.phone, b.branch_name, b.branch_code, u.full_name
      ORDER BY pi.invoice_date DESC, pi.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const purchases = await query(dataSql, params);

    return res.json({
      success: true,
      data: purchases,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Purchases list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

const { validate, createPurchaseInvoiceSchema, createPurchaseReturnSchema } = require('../../shared/validators');

/**
 * GET /api/swm/purchases/returns
 * List all purchase returns with filters and pagination
 */
router.get('/returns', requireAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      supplier_id,
      branch_id,
      date_from,
      date_to
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [];
    const params = [];
    let pIdx = 1;

    if (search && search.trim()) {
      whereClauses.push(`(pr.return_number ILIKE $${pIdx} OR s.supplier_name ILIKE $${pIdx} OR pi.invoice_number ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (supplier_id) {
      whereClauses.push(`pr.supplier_id = $${pIdx}`);
      params.push(parseInt(supplier_id, 10));
      pIdx++;
    }

    if (branch_id) {
      whereClauses.push(`pr.warehouse_branch_id = $${pIdx}`);
      params.push(parseInt(branch_id, 10));
      pIdx++;
    }

    if (date_from) {
      whereClauses.push(`pr.return_date >= $${pIdx}`);
      params.push(date_from);
      pIdx++;
    }

    if (date_to) {
      whereClauses.push(`pr.return_date <= $${pIdx}`);
      params.push(date_to);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(pr.id) AS total
      FROM purchase_returns pr
      LEFT JOIN suppliers s ON s.id = pr.supplier_id
      LEFT JOIN purchase_invoices pi ON pi.id = pr.invoice_id
      ${whereSql}
    `;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult[0]?.total || 0, 10);

    const dataSql = `
      SELECT pr.*,
             s.supplier_name, s.supplier_code, s.phone AS supplier_phone,
             b.branch_name AS warehouse_name, b.branch_code AS warehouse_code,
             pi.invoice_number AS invoice_ref,
             u.full_name AS created_by_name,
             COUNT(pri.id) AS items_count,
             COALESCE(SUM(pri.quantity), 0) AS total_units
      FROM purchase_returns pr
      LEFT JOIN suppliers s ON s.id = pr.supplier_id
      LEFT JOIN branches b ON b.id = pr.warehouse_branch_id
      LEFT JOIN purchase_invoices pi ON pi.id = pr.invoice_id
      LEFT JOIN users u ON u.id = pr.created_by
      LEFT JOIN purchase_return_items pri ON pri.return_id = pr.id
      ${whereSql}
      GROUP BY pr.id, s.supplier_name, s.supplier_code, s.phone, b.branch_name, b.branch_code, pi.invoice_number, u.full_name
      ORDER BY pr.return_date DESC, pr.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const returns = await query(dataSql, params);

    return res.json({
      success: true,
      data: returns,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Purchase returns list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/purchases/returns/:id
 * Retrieve single purchase return with items
 */
router.get('/returns/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [ret] = await query(
      `SELECT pr.*,
              s.supplier_name, s.supplier_code, s.phone AS supplier_phone, s.address AS supplier_address,
              b.branch_name AS warehouse_name, b.branch_code AS warehouse_code,
              pi.invoice_number AS invoice_ref,
              u.full_name AS created_by_name
       FROM purchase_returns pr
       LEFT JOIN suppliers s ON s.id = pr.supplier_id
       LEFT JOIN branches b ON b.id = pr.warehouse_branch_id
       LEFT JOIN purchase_invoices pi ON pi.id = pr.invoice_id
       LEFT JOIN users u ON u.id = pr.created_by
       WHERE pr.id = $1`,
      [id]
    );

    if (!ret) {
      return res.status(404).json({ success: false, message: 'مرتجع المشتريات غير موجود' });
    }

    if (ret.payment_breakdown && typeof ret.payment_breakdown === 'string') {
      try {
        ret.payment_breakdown = JSON.parse(ret.payment_breakdown);
      } catch (e) {
        // Leave as is
      }
    }

    const items = await query(
      `SELECT pri.*,
              p.barcode, p.product_code
       FROM purchase_return_items pri
       LEFT JOIN products p ON p.id = pri.product_id
       WHERE pri.return_id = $1
       ORDER BY pri.id ASC`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...ret,
        items
      }
    });
  } catch (err) {
    console.error('Purchase return fetch error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/purchases/returns
 * Create a new purchase return with atomic inventory decrement, refund receipt & supplier ledger adjustment
 */
router.post('/returns', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), validate(createPurchaseReturnSchema), async (req, res) => {
  try {
    const {
      invoice_id,
      supplier_id,
      warehouse_branch_id,
      return_date = new Date().toISOString().split('T')[0],
      reason,
      refund_amount = 0,
      refund_method = 'cash',
      payment_breakdown = null,
      items
    } = req.body;

    const [supplier] = await query(`SELECT * FROM suppliers WHERE id = $1`, [supplier_id]);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    }

    const [branch] = await query(`SELECT * FROM branches WHERE id = $1`, [warehouse_branch_id]);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'الفرع / المستودع غير موجود' });
    }

    // Calculate total return amount
    let totalReturnAmount = 0;
    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      const cost = parseFloat(item.unit_cost);
      if (!qty || qty <= 0 || isNaN(cost) || cost < 0) {
        return res.status(400).json({
          success: false,
          message: `بيانات الصنف غير صالحة: ${item.product_name || item.product_id}`
        });
      }
      totalReturnAmount += (qty * cost);
    }

    // Calculate refund from split payment if provided
    let calculatedRefund = 0;
    let finalRefundMethod = refund_method;

    if (Array.isArray(payment_breakdown) && payment_breakdown.length > 0) {
      calculatedRefund = payment_breakdown.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
      finalRefundMethod = payment_breakdown.length > 1
        ? 'split'
        : (payment_breakdown[0].payment_method || payment_breakdown[0].method || refund_method);
    } else {
      calculatedRefund = parseFloat(refund_amount) || 0;
    }

    const returnNumber = `PRET-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const breakdownJson = Array.isArray(payment_breakdown) && payment_breakdown.length > 0
      ? JSON.stringify(payment_breakdown)
      : null;

    const returnResult = await transaction(async (client) => {
      // 1. Stock validation and decrement for each return item
      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        const prodId = parseInt(item.product_id, 10);
        const varId = item.variant_id ? parseInt(item.variant_id, 10) : null;

        // Query available balance with row lock
        const balanceResult = await client.query(
          `SELECT * FROM inventory_balances
           WHERE branch_id = $1 AND product_id = $2
             AND (variant_id = $3 OR ($3 IS NULL AND variant_id IS NULL))
           FOR UPDATE`,
          [warehouse_branch_id, prodId, varId]
        );

        const currentBal = balanceResult.rows[0];
        const availQty = currentBal ? parseInt(currentBal.available_qty, 10) : 0;

        if (!currentBal || availQty < qty) {
          throw new Error(
            `لا يمكن إرجاع ${qty} قطعة من "${item.product_name || 'المنتج ' + prodId}". الرصيد المتاح حالياً بالمخزن هو ${availQty} قطعة فقط (قد تكون البضاعة تم بيعها أو تحويلها بالفعل).`
          );
        }

        // Decrement available_qty, increment returned_qty
        await client.query(
          `UPDATE inventory_balances
           SET available_qty = available_qty - $1,
               returned_qty = returned_qty + $1,
               last_movement_at = NOW(),
               last_updated = NOW()
           WHERE id = $2`,
          [qty, currentBal.id]
        );

        // Record inventory movement
        await client.query(
          `INSERT INTO inventory_movements (
            branch_id, product_id, variant_id, movement_type,
            quantity_change, quantity_before, quantity_after,
            reference_type, notes, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, 'purchase_return', $4, $5, $6, 'purchase_return', $7, $8, NOW(), NOW())`,
          [
            warehouse_branch_id,
            prodId,
            varId,
            -qty,
            availQty,
            availQty - qty,
            `مرتجع مشتريات إلى المورد: ${supplier.supplier_name}${reason ? ' - السبب: ' + reason : ''}`,
            req.user.id
          ]
        );
      }

      // 2. Insert into purchase_returns
      const [newReturn] = (await client.query(
        `INSERT INTO purchase_returns (
          return_number, invoice_id, supplier_id, warehouse_branch_id,
          return_date, total_amount, refund_amount, refund_method,
          payment_breakdown, reason, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed', $11, NOW(), NOW())
        RETURNING *`,
        [
          returnNumber,
          invoice_id || null,
          supplier_id,
          warehouse_branch_id,
          return_date,
          totalReturnAmount,
          calculatedRefund,
          finalRefundMethod,
          breakdownJson,
          reason || null,
          req.user.id
        ]
      )).rows;

      // 3. Insert purchase_return_items
      const insertedItems = [];
      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        const cost = parseFloat(item.unit_cost);
        const lineTot = qty * cost;

        const [retItem] = (await client.query(
          `INSERT INTO purchase_return_items (
            return_id, purchase_item_id, product_id, variant_id,
            quantity, unit_cost, line_total, product_name, product_code
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            newReturn.id,
            item.purchase_item_id || null,
            item.product_id,
            item.variant_id || null,
            qty,
            cost,
            lineTot,
            item.product_name || null,
            item.product_code || null
          ]
        )).rows;
        insertedItems.push(retItem);
      }

      // 4. Update supplier account balance
      // Total return reduces liability by (totalReturnAmount - calculatedRefund)
      const balanceCredit = totalReturnAmount - calculatedRefund;
      if (balanceCredit !== 0) {
        await client.query(
          `UPDATE suppliers
           SET current_balance = current_balance - $1,
               updated_at = NOW()
           WHERE id = $2`,
          [balanceCredit, supplier_id]
        );
      }

      // 5. If money was refunded back from supplier (Cash, Transfer, E-Wallet), record refund receipt in supplier_payments
      if (calculatedRefund > 0) {
        const receiptRef = `SRCP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
        await client.query(
          `INSERT INTO supplier_payments (
            payment_ref, supplier_id, invoice_id, amount, payment_method,
            payment_breakdown, payment_date, reference_no, direction, notes, recorded_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'receipt', $9, $10, NOW(), NOW())`,
          [
            receiptRef,
            supplier_id,
            invoice_id || null,
            calculatedRefund,
            finalRefundMethod,
            breakdownJson,
            return_date,
            returnNumber,
            `استرداد مالي لمرتجع المشتريات ${returnNumber}`,
            req.user.id
          ]
        );
      }

      return { returnRecord: newReturn, items: insertedItems };
    });

    // 6. Log Activity
    logActivity({
      userId: req.user.id,
      branchId: warehouse_branch_id,
      actionType: 'PURCHASE_RETURN',
      entityType: 'purchase_returns',
      entityId: returnResult.returnRecord.id,
      newValue: {
        return_number: returnNumber,
        supplier_id,
        total_amount: totalReturnAmount,
        refund_amount: calculatedRefund,
        refund_method: finalRefundMethod,
        items_count: items.length
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Purchase return ${returnNumber} processed for supplier ${supplier.supplier_name}. Total: ${totalReturnAmount} EGP, Refund: ${calculatedRefund} EGP`
    });

    return res.status(201).json({
      success: true,
      data: returnResult.returnRecord,
      items: returnResult.items,
      message: 'تم تسجيل مرتجع المشتريات وتحديث المخزون وحساب المورد بنجاح'
    });
  } catch (err) {
    console.error('Create purchase return error:', err);
    return res.status(err.message && err.message.includes('لا يمكن إرجاع') ? 400 : 500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/swm/purchases/:id
 * Retrieve single purchase invoice with items
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [invoice] = await query(
      `SELECT pi.*,
              s.supplier_name, s.supplier_code, s.phone AS supplier_phone, s.address AS supplier_address,
              b.branch_name AS warehouse_name, b.branch_code AS warehouse_code,
              u.full_name AS created_by_name
       FROM purchase_invoices pi
       LEFT JOIN suppliers s ON s.id = pi.supplier_id
       LEFT JOIN branches b ON b.id = pi.warehouse_branch_id
       LEFT JOIN users u ON u.id = pi.created_by
       WHERE pi.id = $1`,
      [id]
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Purchase invoice not found' });
    }

    if (invoice.payment_breakdown && typeof invoice.payment_breakdown === 'string') {
      try {
        invoice.payment_breakdown = JSON.parse(invoice.payment_breakdown);
      } catch (e) {
        // Leave as is
      }
    }

    const items = await query(
      `SELECT pii.*,
              p.barcode, p.product_code,
              pv.variant_sku, pv.color, pv.size,
              COALESCE((SELECT SUM(pri.quantity) FROM purchase_return_items pri WHERE pri.purchase_item_id = pii.id), 0) AS returned_quantity
       FROM purchase_invoice_items pii
       LEFT JOIN products p ON p.id = pii.product_id
       LEFT JOIN product_variants pv ON pv.id = pii.variant_id
       WHERE pii.invoice_id = $1
       ORDER BY pii.id ASC`,
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
    console.error('Purchase invoice fetch error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/purchases
 * Create a new purchase invoice with atomic stock increment, price sync & multi-tender split payment
 */
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), validate(createPurchaseInvoiceSchema), async (req, res) => {
  try {
    const {
      supplier_id,
      warehouse_branch_id,
      invoice_number,
      invoice_date = new Date().toISOString().split('T')[0],
      due_date,
      discount_amount = 0,
      tax_amount = 0,
      shipping_cost = 0,
      paid_amount = 0,
      payment_method = 'cash',
      payment_breakdown = null,
      notes,
      items
    } = req.body;

    // Verify supplier and branch exist
    const [supplier] = await query(`SELECT * FROM suppliers WHERE id = $1`, [supplier_id]);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const [branch] = await query(`SELECT * FROM branches WHERE id = $1`, [warehouse_branch_id]);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Warehouse branch not found' });
    }

    // Calculate totals to guarantee arithmetic integrity
    let calculatedSubtotal = 0;
    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      const unitCost = parseFloat(item.unit_cost);
      if (!qty || qty <= 0 || isNaN(unitCost) || unitCost < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity or unit cost for item: ${item.product_name || item.product_id}`
        });
      }
      const discPct = parseFloat(item.discount_pct || 0);
      const discAmt = parseFloat(item.discount_amount || (unitCost * qty * (discPct / 100)));
      const lineTot = (qty * unitCost) - discAmt;
      calculatedSubtotal += lineTot;
    }

    const discTotal = parseFloat(discount_amount) || 0;
    const taxTotal = parseFloat(tax_amount) || 0;
    const shippingTotal = parseFloat(shipping_cost) || 0;
    const finalAmount = Math.max(0, calculatedSubtotal - discTotal + taxTotal + shippingTotal);

    // Multi-tender / Split payment calculation
    let calculatedPaid = 0;
    let finalPaymentMethod = payment_method;

    if (Array.isArray(payment_breakdown) && payment_breakdown.length > 0) {
      calculatedPaid = payment_breakdown.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      finalPaymentMethod = payment_breakdown.length > 1
        ? 'split'
        : (payment_breakdown[0].method || payment_method);
    } else {
      calculatedPaid = parseFloat(paid_amount) || 0;
    }

    const paid = calculatedPaid;
    let paymentStatus = 'unpaid';
    if (paid >= finalAmount) {
      paymentStatus = 'paid';
    } else if (paid > 0) {
      paymentStatus = 'partial';
    }

    // Auto-generate invoice number if not provided
    let finalInvNumber = invoice_number ? invoice_number.trim() : null;
    if (!finalInvNumber) {
      const [{ count }] = await query(`SELECT COUNT(id) AS count FROM purchase_invoices`);
      const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
      finalInvNumber = `PINV-${yymm}-${String(parseInt(count, 10) + 1).padStart(5, '0')}`;
    }

    const existingInv = await query(`SELECT id FROM purchase_invoices WHERE invoice_number = $1`, [finalInvNumber]);
    if (existingInv.length) {
      return res.status(409).json({ success: false, message: 'Invoice number already exists' });
    }

    const breakdownJson = Array.isArray(payment_breakdown) && payment_breakdown.length > 0
      ? JSON.stringify(payment_breakdown)
      : null;

    const priceChangesLogged = [];

    // Atomic Transaction execution
    const invoiceResult = await transaction(async (client) => {
      // 1. Insert Purchase Invoice
      const [newInvoice] = (await client.query(
        `INSERT INTO purchase_invoices (
          invoice_number, supplier_id, warehouse_branch_id, invoice_date, due_date,
          subtotal, discount_amount, tax_amount, shipping_cost, final_amount,
          paid_amount, payment_method, payment_breakdown, payment_status, notes, status, created_by,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'completed', $16, NOW(), NOW())
        RETURNING *`,
        [
          finalInvNumber,
          supplier_id,
          warehouse_branch_id,
          invoice_date,
          due_date || null,
          calculatedSubtotal,
          discTotal,
          taxTotal,
          shippingTotal,
          finalAmount,
          paid,
          finalPaymentMethod,
          breakdownJson,
          paymentStatus,
          notes || null,
          req.user.id
        ]
      )).rows;

      const insertedItems = [];

      // 2. Process each item: insert item row, update stock, calc WAC & sync master product prices
      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        const unitCost = parseFloat(item.unit_cost);
        const sellingPrice = item.selling_price !== undefined && item.selling_price !== null && !isNaN(parseFloat(item.selling_price))
          ? parseFloat(item.selling_price)
          : null;
        const discPct = parseFloat(item.discount_pct || 0);
        const discAmt = parseFloat(item.discount_amount || (unitCost * qty * (discPct / 100)));
        const finalUnitCost = (unitCost * qty - discAmt) / qty;
        const lineTotal = (qty * unitCost) - discAmt;

        // Fetch master product info with cost and selling prices
        const [prod] = (await client.query(
          `SELECT id, product_code, product_name, cost_price, selling_price FROM products WHERE id = $1`,
          [item.product_id]
        )).rows;

        if (!prod) {
          throw new Error(`Product ID ${item.product_id} not found`);
        }

        // Insert purchase invoice item including selling_price
        const [insertedItem] = (await client.query(
          `INSERT INTO purchase_invoice_items (
            invoice_id, product_id, variant_id, quantity, unit_cost, selling_price, discount_pct,
            discount_amount, final_unit_cost, line_total, product_name, product_code
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *`,
          [
            newInvoice.id,
            item.product_id,
            item.variant_id || null,
            qty,
            unitCost,
            sellingPrice,
            discPct,
            discAmt,
            finalUnitCost,
            lineTotal,
            prod.product_name,
            prod.product_code
          ]
        )).rows;
        insertedItems.push(insertedItem);

        // 3. Update or Insert inventory_balances with FOR UPDATE locking
        let balanceRow;
        if (item.variant_id) {
          const res = await client.query(
            `SELECT * FROM inventory_balances
             WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3
             FOR UPDATE`,
            [warehouse_branch_id, item.product_id, item.variant_id]
          );
          balanceRow = res.rows[0];
        } else {
          const res = await client.query(
            `SELECT * FROM inventory_balances
             WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL
             FOR UPDATE`,
            [warehouse_branch_id, item.product_id]
          );
          balanceRow = res.rows[0];
        }

        const qtyBefore = balanceRow ? parseInt(balanceRow.available_qty, 10) : 0;
        const qtyAfter = qtyBefore + qty;

        if (balanceRow) {
          await client.query(
            `UPDATE inventory_balances
             SET available_qty = available_qty + $1,
                 last_movement_at = NOW(),
                 last_updated = NOW()
             WHERE id = $2`,
            [qty, balanceRow.id]
          );
        } else {
          await client.query(
            `INSERT INTO inventory_balances (
              branch_id, product_id, variant_id, available_qty, reserved_qty,
              on_order_qty, sold_qty, returned_qty, last_movement_at, last_updated
            ) VALUES ($1, $2, $3, $4, 0, 0, 0, 0, NOW(), NOW())`,
            [warehouse_branch_id, item.product_id, item.variant_id || null, qty]
          );
        }

        // 4. Automatically update Master Product Cost Price & Selling Price if changed
        const currentProdCost = parseFloat(prod.cost_price) || 0;
        const currentProdSelling = parseFloat(prod.selling_price) || 0;
        const targetCost = unitCost;
        const targetSelling = sellingPrice !== null ? sellingPrice : currentProdSelling;

        const costChanged = Math.abs(currentProdCost - targetCost) > 0.0001;
        const sellingChanged = sellingPrice !== null && Math.abs(currentProdSelling - targetSelling) > 0.0001;

        if (costChanged || sellingChanged) {
          await client.query(
            `UPDATE products
             SET cost_price = $1,
                 selling_price = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [targetCost, targetSelling, item.product_id]
          );

          priceChangesLogged.push({
            productId: item.product_id,
            productName: prod.product_name,
            oldValue: { cost_price: currentProdCost, selling_price: currentProdSelling },
            newValue: { cost_price: targetCost, selling_price: targetSelling }
          });
        }

        // 5. Insert audit row into inventory_movements
        await client.query(
          `INSERT INTO inventory_movements (
            branch_id, product_id, variant_id, movement_type, quantity_change,
            quantity_before, quantity_after, reference_type, reference_id,
            notes, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, 'purchase_in', $4, $5, $6, 'purchase_invoices', $7, $8, $9, NOW(), NOW())`,
          [
            warehouse_branch_id,
            item.product_id,
            item.variant_id || null,
            qty,
            qtyBefore,
            qtyAfter,
            newInvoice.id,
            `Purchase Invoice #${finalInvNumber}`,
            req.user.id
          ]
        );
      }

      // 6. Update supplier balance: liability increases by (finalAmount - paid)
      const balanceChange = finalAmount - paid;
      if (balanceChange !== 0) {
        await client.query(
          `UPDATE suppliers
           SET current_balance = current_balance + $1,
               updated_at = NOW()
           WHERE id = $2`,
          [balanceChange, supplier_id]
        );
      }

      // 7. If paid > 0, record in supplier_payments with multi-tender breakdown
      if (paid > 0) {
        const paymentRef = `SPAY-INIT-${Date.now().toString().slice(-6)}`;
        await client.query(
          `INSERT INTO supplier_payments (
            payment_ref, supplier_id, invoice_id, amount, payment_method,
            payment_breakdown, payment_date, reference_no, direction, notes, recorded_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'payment', $9, $10, NOW(), NOW())`,
          [
            paymentRef,
            supplier_id,
            newInvoice.id,
            paid,
            finalPaymentMethod,
            breakdownJson,
            invoice_date,
            finalInvNumber,
            `Initial payment for purchase invoice ${finalInvNumber}`,
            req.user.id
          ]
        );
      }

      return { invoice: newInvoice, items: insertedItems };
    });

    // Log Activity for price changes
    for (const change of priceChangesLogged) {
      logActivity({
        userId: req.user.id,
        branchId: warehouse_branch_id,
        actionType: 'UPDATE_PRODUCT_PRICE',
        entityType: 'products',
        entityId: change.productId,
        oldValue: change.oldValue,
        newValue: change.newValue,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        notes: `Master product "${change.productName}" prices updated from Purchase Invoice #${finalInvNumber}: Cost ${change.oldValue.cost_price} -> ${change.newValue.cost_price}, Selling ${change.oldValue.selling_price} -> ${change.newValue.selling_price}`
      });
    }

    logActivity({
      userId: req.user.id,
      branchId: warehouse_branch_id,
      actionType: 'CREATE_PURCHASE_INVOICE',
      entityType: 'purchase_invoices',
      entityId: invoiceResult.invoice.id,
      newValue: {
        invoice_number: finalInvNumber,
        supplier_id,
        final_amount: finalAmount,
        paid_amount: paid,
        items_count: items.length
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `Purchase invoice ${finalInvNumber} created for supplier ${supplier.supplier_name} with ${items.length} items`
    });

    return res.status(201).json({
      success: true,
      data: invoiceResult.invoice,
      items: invoiceResult.items,
      message: 'Purchase invoice created and stock updated successfully'
    });
  } catch (err) {
    console.error('Create purchase invoice error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
