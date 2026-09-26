const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

/**
 * GET /api/swm/stock-adjustments
 * List past stock adjustment vouchers with branch, date, status filters and pagination
 */
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'supervisor']), async (req, res) => {
  try {
    const {
      branch_id,
      status,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [];
    const params = [];
    let pIdx = 1;

    const isBranchAccount = req.user.isBranchAccount ||
      (!['super_admin', 'admin', 'inventory_manager'].includes(req.user.role));
    const forcedBranchId = isBranchAccount ? req.user.branchId : null;
    const effectiveBranchId = forcedBranchId || (branch_id && branch_id !== 'all' && branch_id !== '' ? parseInt(branch_id, 10) : null);

    if (effectiveBranchId) {
      whereClauses.push(`sa.branch_id = $${pIdx}`);
      params.push(effectiveBranchId);
      pIdx++;
    }

    if (status && status !== 'all' && status !== '') {
      whereClauses.push(`sa.status = $${pIdx}`);
      params.push(status);
      pIdx++;
    }

    if (start_date) {
      whereClauses.push(`sa.adjustment_date >= $${pIdx}`);
      params.push(start_date);
      pIdx++;
    }

    if (end_date) {
      whereClauses.push(`sa.adjustment_date <= $${pIdx}`);
      params.push(end_date);
      pIdx++;
    }

    if (search && search.trim()) {
      whereClauses.push(`(
        sa.adjustment_number ILIKE $${pIdx} OR
        sa.reason ILIKE $${pIdx} OR
        sa.notes ILIKE $${pIdx} OR
        b.branch_name ILIKE $${pIdx}
      )`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count Total
    const [countResult] = await query(
      `SELECT COUNT(sa.id) AS total
       FROM stock_adjustments sa
       JOIN branches b ON b.id = sa.branch_id
       ${whereSql}`,
      params
    );
    const total = parseInt(countResult?.total || 0, 10);

    // Fetch Paginated Rows
    const sql = `
      SELECT
        sa.*,
        b.branch_name,
        b.branch_code,
        b.branch_type,
        uc.full_name AS created_by_name,
        uc.username AS created_by_username,
        ua.full_name AS approved_by_name,
        ua.username AS approved_by_username
      FROM stock_adjustments sa
      JOIN branches b ON b.id = sa.branch_id
      LEFT JOIN users uc ON uc.id = sa.created_by
      LEFT JOIN users ua ON ua.id = sa.approved_by
      ${whereSql}
      ORDER BY sa.adjustment_date DESC, sa.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const vouchers = await query(sql, params);

    return res.json({
      success: true,
      data: vouchers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('List stock adjustments error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/stock-adjustments/:id
 * Retrieve single voucher with complete item lines, variances, and branch details
 */
router.get('/:id', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'supervisor']), async (req, res) => {
  try {
    const { id } = req.params;

    const [voucher] = await query(
      `SELECT
        sa.*,
        b.branch_name,
        b.branch_code,
        b.branch_type,
        b.phone AS branch_phone,
        b.address AS branch_address,
        uc.full_name AS created_by_name,
        uc.username AS created_by_username,
        ua.full_name AS approved_by_name,
        ua.username AS approved_by_username
      FROM stock_adjustments sa
      JOIN branches b ON b.id = sa.branch_id
      LEFT JOIN users uc ON uc.id = sa.created_by
      LEFT JOIN users ua ON ua.id = sa.approved_by
      WHERE sa.id = $1`,
      [id]
    );

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'سند التسوية غير موجود' });
    }

    const isBranchAccount = req.user.isBranchAccount ||
      (!['super_admin', 'admin', 'inventory_manager'].includes(req.user.role));
    if (isBranchAccount && voucher.branch_id !== req.user.branchId) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بعرض سندات تسوية لفروع أخرى' });
    }

    const items = await query(
      `SELECT
        sai.*,
        p.barcode,
        c.category_name,
        COALESCE(v.color, p.color) AS color,
        COALESCE(v.size, p.size) AS size
      FROM stock_adjustment_items sai
      JOIN products p ON p.id = sai.product_id
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN product_variants v ON v.id = sai.variant_id
      WHERE sai.adjustment_id = $1
      ORDER BY sai.id ASC`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...voucher,
        items
      }
    });
  } catch (err) {
    console.error('Stock adjustment detail error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/stock-adjustments
 * Create a new stock adjustment voucher (draft or approved).
 * If approved: atomically updates inventory_balances and writes inventory_movements ledger.
 */
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'supervisor']), async (req, res) => {
  try {
    const {
      branch_id,
      adjustment_date,
      reason,
      notes,
      status = 'approved',
      items
    } = req.body;

    const isBranchAccount = req.user.isBranchAccount ||
      (!['super_admin', 'admin', 'inventory_manager'].includes(req.user.role));
    const effectiveBranchId = isBranchAccount ? req.user.branchId : parseInt(branch_id, 10);
    const branchId = effectiveBranchId;

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد الفرع أو المستودع' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد سبب التسوية المخزنية' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'يجب إضافة صنف واحد على الأقل في سند التسوية' });
    }

    const [branch] = await query(`SELECT id, branch_name, branch_code FROM branches WHERE id = $1`, [branchId]);
    if (!branch) {
      return res.status(400).json({ success: false, message: 'الفرع المحدد غير موجود' });
    }

    // Generate Voucher Number: ADJ-YYMM-XXXXX
    const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
    const [{ count }] = await query(`SELECT COUNT(id) AS count FROM stock_adjustments`);
    const voucherNumber = `ADJ-${yymm}-${String(parseInt(count, 10) + 1).padStart(5, '0')}`;

    // Branch accounts can only save drafts for admin review
    const isApproved = isBranchAccount ? false : (status === 'approved');

    // Execute atomic creation transaction
    const createdVoucher = await transaction(async (client) => {
      let totalSurplusQty = 0;
      let totalDeficitQty = 0;
      let totalVarianceCost = 0;

      const validatedItems = [];

      for (const it of items) {
        const productId = parseInt(it.product_id, 10);
        const variantId = it.variant_id ? parseInt(it.variant_id, 10) : null;
        const systemQty = parseInt(it.system_qty || 0, 10);
        const actualQty = parseInt(it.actual_qty, 10);

        if (isNaN(actualQty) || actualQty < 0) {
          throw new Error(`الرصيد الفعلي غير صالح للصنف ${it.product_name || productId}`);
        }

        const varianceQty = actualQty - systemQty;
        const unitCost = parseFloat(it.unit_cost || 0);
        const varianceCost = varianceQty * unitCost;

        if (varianceQty > 0) totalSurplusQty += varianceQty;
        if (varianceQty < 0) totalDeficitQty += Math.abs(varianceQty);
        totalVarianceCost += varianceCost;

        validatedItems.push({
          product_id: productId,
          variant_id: variantId,
          system_qty: systemQty,
          actual_qty: actualQty,
          variance_qty: varianceQty,
          unit_cost: unitCost,
          variance_cost: varianceCost,
          product_name: it.product_name,
          product_code: it.product_code,
          variant_sku: it.variant_sku || null,
          item_notes: it.item_notes || null
        });
      }

      const netQtyChange = totalSurplusQty - totalDeficitQty;

      // 1. Insert Stock Adjustment Header
      const [adjustment] = (await client.query(
        `INSERT INTO stock_adjustments (
          adjustment_number, branch_id, adjustment_date, reason, status,
          total_items, total_surplus_qty, total_deficit_qty, net_qty_change,
          total_variance_cost, notes, created_by, approved_by, approved_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          NOW(), NOW()
        ) RETURNING *`,
        [
          voucherNumber,
          branchId,
          adjustment_date || new Date().toISOString().split('T')[0],
          reason.trim(),
          isApproved ? 'approved' : 'draft',
          validatedItems.length,
          totalSurplusQty,
          totalDeficitQty,
          netQtyChange,
          totalVarianceCost,
          notes ? notes.trim() : null,
          req.user.id,
          isApproved ? req.user.id : null,
          isApproved ? new Date() : null
        ]
      )).rows;

      // 2. Insert Voucher Items
      for (const vi of validatedItems) {
        await client.query(
          `INSERT INTO stock_adjustment_items (
            adjustment_id, product_id, variant_id, system_qty, actual_qty,
            variance_qty, unit_cost, variance_cost, product_name, product_code,
            variant_sku, item_notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
          [
            adjustment.id,
            vi.product_id,
            vi.variant_id,
            vi.system_qty,
            vi.actual_qty,
            vi.variance_qty,
            vi.unit_cost,
            vi.variance_cost,
            vi.product_name,
            vi.product_code,
            vi.variant_sku,
            vi.item_notes
          ]
        );

        // 3. If Approved: Apply inventory adjustment to inventory_balances and inventory_movements
        if (isApproved && vi.variance_qty !== 0) {
          // Find or create balance row with lock
          let balRowRes;
          if (vi.variant_id) {
            balRowRes = await client.query(
              `SELECT * FROM inventory_balances
               WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3
               FOR UPDATE`,
              [branchId, vi.product_id, vi.variant_id]
            );
          } else {
            balRowRes = await client.query(
              `SELECT * FROM inventory_balances
               WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL
               FOR UPDATE`,
              [branchId, vi.product_id]
            );
          }

          let beforeQty = vi.system_qty;
          if (balRowRes.rows.length > 0) {
            const bRow = balRowRes.rows[0];
            beforeQty = parseInt(bRow.available_qty, 10);
            await client.query(
              `UPDATE inventory_balances
               SET available_qty = $1,
                   last_movement_at = NOW(),
                   last_updated = NOW()
               WHERE id = $2`,
              [vi.actual_qty, bRow.id]
            );
          } else {
            await client.query(
              `INSERT INTO inventory_balances (
                branch_id, product_id, variant_id, available_qty,
                reserved_qty, sold_qty, last_movement_at, last_updated
              ) VALUES ($1, $2, $3, $4, 0, 0, NOW(), NOW())`,
              [branchId, vi.product_id, vi.variant_id, vi.actual_qty]
            );
          }

          // Write movement ledger record
          const movementType = vi.variance_qty > 0 ? 'adjustment_in' : 'adjustment_out';
          await client.query(
            `INSERT INTO inventory_movements (
              branch_id, product_id, variant_id, movement_type, quantity_change,
              quantity_before, quantity_after, reference_type, reference_id,
              notes, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'stock_adjustments', $8, $9, $10, NOW(), NOW())`,
            [
              branchId,
              vi.product_id,
              vi.variant_id,
              movementType,
              vi.variance_qty,
              beforeQty,
              vi.actual_qty,
              adjustment.id,
              `سند تسوية #${voucherNumber} (${reason}) - فارق: ${vi.variance_qty > 0 ? '+' : ''}${vi.variance_qty}`,
              req.user.id
            ]
          );
        }
      }

      return adjustment;
    });

    logActivity({
      userId: req.user.id,
      branchId: branchId,
      actionType: 'CREATE_STOCK_ADJUSTMENT',
      entityType: 'stock_adjustments',
      entityId: createdVoucher.id,
      newValue: {
        adjustment_number: createdVoucher.adjustment_number,
        total_items: createdVoucher.total_items,
        total_variance_cost: createdVoucher.total_variance_cost,
        status: createdVoucher.status
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `سند تسوية مخزنية #${createdVoucher.adjustment_number} لفرع ${branch.branch_name}`
    });

    return res.status(201).json({
      success: true,
      message: isApproved ? 'تم اعتماد وتنفيذ سند التسوية في المخزون بنجاح' : 'تم حفظ مسودة سند التسوية بنجاح',
      data: createdVoucher
    });
  } catch (err) {
    console.error('Create stock adjustment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/swm/stock-adjustments/:id/approve
 * Approves a previously saved draft adjustment voucher and applies changes to inventory
 */
router.put('/:id/approve', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const [voucher] = await query(`SELECT * FROM stock_adjustments WHERE id = $1`, [id]);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'سند التسوية غير موجود' });
    }

    if (voucher.status === 'approved') {
      return res.status(400).json({ success: false, message: 'سند التسوية معتمد ومطبق مسبقاً' });
    }

    const items = await query(`SELECT * FROM stock_adjustment_items WHERE adjustment_id = $1`, [id]);

    await transaction(async (client) => {
      // 1. Update Voucher Status
      await client.query(
        `UPDATE stock_adjustments
         SET status = 'approved',
             approved_by = $1,
             approved_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [req.user.id, id]
      );

      // 2. Apply to balances and ledger
      for (const vi of items) {
        if (vi.variance_qty !== 0) {
          let balRowRes;
          if (vi.variant_id) {
            balRowRes = await client.query(
              `SELECT * FROM inventory_balances
               WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3
               FOR UPDATE`,
              [voucher.branch_id, vi.product_id, vi.variant_id]
            );
          } else {
            balRowRes = await client.query(
              `SELECT * FROM inventory_balances
               WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL
               FOR UPDATE`,
              [voucher.branch_id, vi.product_id]
            );
          }

          let beforeQty = vi.system_qty;
          if (balRowRes.rows.length > 0) {
            const bRow = balRowRes.rows[0];
            beforeQty = parseInt(bRow.available_qty, 10);
            await client.query(
              `UPDATE inventory_balances
               SET available_qty = $1,
                   last_movement_at = NOW(),
                   last_updated = NOW()
               WHERE id = $2`,
              [vi.actual_qty, bRow.id]
            );
          } else {
            await client.query(
              `INSERT INTO inventory_balances (
                branch_id, product_id, variant_id, available_qty,
                reserved_qty, sold_qty, last_movement_at, last_updated
              ) VALUES ($1, $2, $3, $4, 0, 0, NOW(), NOW())`,
              [voucher.branch_id, vi.product_id, vi.variant_id, vi.actual_qty]
            );
          }

          const movementType = vi.variance_qty > 0 ? 'adjustment_in' : 'adjustment_out';
          await client.query(
            `INSERT INTO inventory_movements (
              branch_id, product_id, variant_id, movement_type, quantity_change,
              quantity_before, quantity_after, reference_type, reference_id,
              notes, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'stock_adjustments', $8, $9, $10, NOW(), NOW())`,
            [
              voucher.branch_id,
              vi.product_id,
              vi.variant_id,
              movementType,
              vi.variance_qty,
              beforeQty,
              vi.actual_qty,
              voucher.id,
              `اعتماد سند تسوية #${voucher.adjustment_number} - فارق: ${vi.variance_qty > 0 ? '+' : ''}${vi.variance_qty}`,
              req.user.id
            ]
          );
        }
      }
    });

    return res.json({ success: true, message: 'تم اعتماد وتطبيق سند التسوية في المخزون بنجاح' });
  } catch (err) {
    console.error('Approve stock adjustment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
