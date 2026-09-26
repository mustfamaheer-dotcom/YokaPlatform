const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireBranchScope } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

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
 * GET /api/swm/pos/session/current
 * Return active session state and today's cash metrics for cashier
 */
router.get('/session/current', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const register = await getOrCreateBranchRegister(branchId);

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
 * POST /api/swm/pos/session/close
 * Close cash drawer with actual cash counted & calculate discrepancy
 */
router.post('/session/close', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const { actual_cash, notes } = req.body;

    if (actual_cash === undefined || isNaN(parseFloat(actual_cash))) {
      return res.status(400).json({ success: false, message: 'Actual cash amount counted is required' });
    }

    const actual = parseFloat(actual_cash);
    const register = await getOrCreateBranchRegister(branchId);

    if (register.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Register is not currently open'
      });
    }

    const expectedCash = parseFloat(register.current_balance) || 0;
    const discrepancy = actual - expectedCash;

    const [updated] = await query(
      `UPDATE cash_registers
       SET status = 'closed',
           current_balance = $1,
           last_transfer_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [actual, register.id]
    );

    logActivity({
      userId: req.user.id,
      branchId,
      actionType: 'POS_SESSION_CLOSE',
      entityType: 'cash_registers',
      entityId: register.id,
      newValue: {
        expected_cash: expectedCash,
        actual_cash: actual,
        discrepancy,
        notes
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `POS Session closed. Expected: ${expectedCash}, Actual: ${actual}, Discrepancy: ${discrepancy}`
    });

    return res.json({
      success: true,
      data: {
        register: updated,
        expected_cash: expectedCash,
        actual_cash: actual,
        discrepancy
      },
      message: 'Cash drawer session closed successfully'
    });
  } catch (err) {
    console.error('POS close session error:', err);
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
    const branchId = req.scopedBranchId;
    const { query: searchQuery } = req.query;

    if (!searchQuery || !searchQuery.trim()) {
      return res.json({ success: true, data: [] });
    }

    const clean = searchQuery.trim();

    // Query both base product and product variants with stock at this branch
    const sql = `
      SELECT p.id AS product_id,
             p.product_code,
             p.barcode AS product_barcode,
             p.product_name,
             p.brand,
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
      LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.status = 'active'
      LEFT JOIN inventory_balances ib_var ON ib_var.product_id = p.id
                                         AND ib_var.variant_id = pv.id
                                         AND ib_var.branch_id = $1
      LEFT JOIN inventory_balances ib_base ON ib_base.product_id = p.id
                                          AND ib_base.variant_id IS NULL
                                          AND ib_base.branch_id = $1
      WHERE p.status = 'active'
        AND (
          p.barcode = $2
          OR pv.variant_sku = $2
          OR p.product_code ILIKE $3
          OR p.product_name ILIKE $3
          OR p.brand ILIKE $3
          OR pv.variant_sku ILIKE $3
        )
      ORDER BY p.id DESC, pv.id ASC
      LIMIT 25
    `;

    const results = await query(sql, [branchId, clean, `%${clean}%`]);

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

      // Structure payment breakdown
      let finalBreakdown = {
        cash: parseFloat(payment_breakdown?.cash || 0),
        card: parseFloat(payment_breakdown?.card || 0),
        transfer: parseFloat(payment_breakdown?.transfer || 0)
      };

      if (payment_method === 'cash') {
        finalBreakdown = { cash: finalAmount, card: 0, transfer: 0 };
      } else if (payment_method === 'card') {
        finalBreakdown = { cash: 0, card: finalAmount, transfer: 0 };
      } else if (payment_method === 'transfer') {
        finalBreakdown = { cash: 0, card: 0, transfer: finalAmount };
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

    // Build filter for sales invoices
    let invWhere = `si.branch_id = $1 AND DATE(si.invoice_date) = $2 AND si.status = 'completed'`;
    const invParams = [branchId, targetDate];

    if (salesperson_id) {
      invWhere += ` AND si.salesperson_id = $${invParams.length + 1}`;
      invParams.push(parseInt(salesperson_id, 10));
    }

    const invoices = await query(
      `SELECT si.*,
              u.full_name AS cashier_name,
              u.username AS cashier_username
       FROM swm_sales_invoices si
       LEFT JOIN users u ON u.id = si.salesperson_id
       WHERE ${invWhere}
       ORDER BY si.invoice_date DESC`,
      invParams
    );

    // Build filter for expenses
    let expWhere = `e.branch_id = $1 AND DATE(e.expense_date) = $2 AND e.status = 'approved'`;
    const expParams = [branchId, targetDate];

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

    // Fetch completed/delivered ECP (Online Store) orders for this branch/warehouse on targetDate
    const ecpWhere = `((o.fulfilling_branch_id = $1) OR ($1 IN (1, 2) AND (o.fulfilling_branch_id IS NULL OR o.fulfilling_branch_id IN (1, 2))))
                      AND o.order_status IN ('delivered', 'completed')
                      AND DATE(COALESCE(o.delivered_at, o.updated_at, o.created_at)) = $2`;
    const ecpOrders = await query(
      `SELECT o.id, o.order_number, o.guest_email, o.shipping_address,
              o.subtotal, o.shipping_cost, o.total_amount,
              o.order_status, o.payment_status, o.payment_method,
              o.shipping_carrier, o.tracking_number, o.parcel_count,
              o.shipped_at, o.delivered_at, o.created_at, o.updated_at,
              o.customer_notes
       FROM ecp_orders o
       WHERE ${ecpWhere}
       ORDER BY COALESCE(o.delivered_at, o.created_at) DESC`,
      [branchId, targetDate]
    );

    // Also fetch recent delivered ECP orders (up to 25) so users can inspect them anytime
    const recentEcpOrders = await query(
      `SELECT o.id, o.order_number, o.guest_email, o.shipping_address,
              o.subtotal, o.shipping_cost, o.total_amount,
              o.order_status, o.payment_status, o.payment_method,
              o.shipping_carrier, o.tracking_number, o.parcel_count,
              o.shipped_at, o.delivered_at, o.created_at, o.updated_at,
              o.customer_notes
       FROM ecp_orders o
       WHERE ((o.fulfilling_branch_id = $1) OR ($1 IN (1, 2) AND (o.fulfilling_branch_id IS NULL OR o.fulfilling_branch_id IN (1, 2))))
         AND o.order_status IN ('delivered', 'completed')
       ORDER BY COALESCE(o.delivered_at, o.created_at) DESC
       LIMIT 25`,
      [branchId]
    );

    // Calculate aggregated sales KPIs for POS invoices
    let posSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let transferSales = 0;

    for (const inv of invoices) {
      const amt = parseFloat(inv.final_amount || 0);
      posSales += amt;

      let bd = inv.payment_breakdown;
      if (typeof bd === 'string') {
        try { bd = JSON.parse(bd); } catch (e) { bd = {}; }
      }
      if (bd && typeof bd === 'object') {
        cashSales += parseFloat(bd.cash || 0);
        cardSales += parseFloat(bd.card || 0);
        transferSales += parseFloat(bd.transfer || 0);
      } else {
        cashSales += amt;
      }
    }

    // Calculate aggregated sales KPIs for ECP orders
    let ecpSales = 0;
    for (const ord of ecpOrders) {
      const amt = parseFloat(ord.total_amount || 0);
      ecpSales += amt;
      const pm = (ord.payment_method || '').toLowerCase();
      if (pm === 'cod' || pm.includes('cash') || pm.includes('استلام')) {
        cashSales += amt;
      } else if (pm.includes('card') || pm.includes('visa')) {
        cardSales += amt;
      } else {
        transferSales += amt;
      }
    }

    // Calculate expenses KPIs
    let totalExpenses = 0;
    for (const exp of expenses) {
      totalExpenses += parseFloat(exp.amount || 0);
    }

    // Get register opening & current balance
    const register = await getOrCreateBranchRegister(branchId);
    const openingBalance = parseFloat(register.opening_balance || 0);
    const expectedDrawerCash = Math.max(0, openingBalance + cashSales - totalExpenses);

    const totalSales = posSales + ecpSales;
    const completedCount = invoices.length + ecpOrders.length;
    const averageOrderValue = completedCount > 0 ? (totalSales / completedCount) : 0;
    const netRevenue = totalSales - totalExpenses;

    // Helper to format an ECP order for the completed orders table
    const formatEcpOrder = (o) => {
      let addr = {};
      if (typeof o.shipping_address === 'string') {
        try { addr = JSON.parse(o.shipping_address || '{}'); } catch (e) { addr = {}; }
      } else if (o.shipping_address) {
        addr = o.shipping_address;
      }
      return {
        id: `ecp_${o.id}`,
        rawId: o.id,
        orderType: 'ecp',
        typeLabel: 'طلب متجر إلكتروني (ECP)',
        orderNumber: o.order_number,
        time: o.delivered_at || o.created_at,
        customerName: addr.recipient_name || o.guest_email || 'عميل المتجر',
        customerPhone: addr.phone || '-',
        city: addr.city || 'متجر إلكتروني',
        amount: parseFloat(o.total_amount || 0),
        paymentMethod: o.payment_method || 'الدفع عند الاستلام',
        carrier: o.shipping_carrier || 'مندوب المتجر',
        trackingNumber: o.tracking_number || '-',
        parcelCount: o.parcel_count || 1,
        status: o.order_status,
        salesperson: 'المتجر الإلكتروني',
        details: o
      };
    };

    // Combine POS invoices & ECP orders into unified completed_orders
    const completedOrders = [
      ...invoices.map(inv => ({
        id: `pos_${inv.id}`,
        rawId: inv.id,
        orderType: 'pos',
        typeLabel: 'فاتورة صالة (POS)',
        orderNumber: inv.invoice_number,
        time: inv.invoice_date,
        customerName: inv.customer_name || 'عميل نقدي',
        customerPhone: inv.customer_phone || '-',
        city: 'الفرع مباشرة',
        amount: parseFloat(inv.final_amount || 0),
        paymentMethod: inv.payment_breakdown ? 'تفصيل متعدد' : 'كاش / نقدية',
        paymentBreakdown: inv.payment_breakdown,
        status: inv.status,
        salesperson: inv.cashier_name || inv.cashier_username || 'الفرع',
        details: inv
      })),
      ...ecpOrders.map(formatEcpOrder)
    ].sort((a, b) => new Date(b.time) - new Date(a.time));

    const recentCompletedEcp = recentEcpOrders.map(formatEcpOrder);

    // Combine into unified chronological timeline
    const timeline = [
      ...invoices.map(inv => ({
        type: 'sale',
        id: inv.id,
        number: inv.invoice_number,
        time: inv.invoice_date,
        amount: parseFloat(inv.final_amount || 0),
        customer_name: inv.customer_name,
        customer_phone: inv.customer_phone,
        salesperson_name: inv.cashier_name || inv.cashier_username,
        payment_breakdown: inv.payment_breakdown,
        notes: inv.notes,
        source: 'pos'
      })),
      ...ecpOrders.map(o => ({
        type: 'sale',
        id: o.id,
        number: o.order_number,
        time: o.delivered_at || o.created_at,
        amount: parseFloat(o.total_amount || 0),
        customer_name: (typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address || '{}').recipient_name : o.shipping_address?.recipient_name) || o.guest_email || 'عميل أونلاين',
        customer_phone: (typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address || '{}').phone : o.shipping_address?.phone) || '-',
        salesperson_name: 'شحن أونلاين',
        payment_breakdown: o.payment_method,
        notes: `شركة الشحن: ${o.shipping_carrier || 'مندوب'} - بوليصة: ${o.tracking_number || '-'}`,
        source: 'ecp'
      })),
      ...expenses.map(exp => ({
        type: 'expense',
        id: exp.id,
        number: exp.expense_ref,
        time: exp.created_at || exp.expense_date,
        amount: parseFloat(exp.amount || 0),
        category: exp.category,
        subcategory: exp.subcategory,
        description: exp.description,
        salesperson_name: exp.created_by_name || exp.created_by_username
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time));

    return res.json({
      success: true,
      data: {
        date: targetDate,
        sales_count: completedCount,
        pos_count: invoices.length,
        ecp_count: ecpOrders.length,
        expenses_count: expenses.length,
        total_transactions: completedCount + expenses.length,
        kpi: {
          total_sales: totalSales,
          pos_sales: posSales,
          ecp_sales: ecpSales,
          completed_count: completedCount,
          average_order_value: averageOrderValue,
          cash_sales: cashSales,
          card_sales: cardSales,
          transfer_sales: transferSales,
          total_expenses: totalExpenses,
          net_revenue: netRevenue,
          opening_balance: openingBalance,
          expected_drawer_cash: expectedDrawerCash,
          register_current_balance: parseFloat(register.current_balance || 0)
        },
        invoices,
        ecp_orders: ecpOrders,
        completed_orders: completedOrders,
        recent_completed_ecp: recentCompletedEcp,
        expenses,
        timeline
      }
    });
  } catch (err) {
    console.error('Shift summary error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
