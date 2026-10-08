const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireRole, requireWarehousePermission } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

router.use(requireWarehousePermission('stock_audit'));

/**
 * GET /api/swm/stock-audit
 * Retrieves comprehensive stock inventory sheet across branches or for a single branch.
 * Supports filtering by category, search keywords, and stock status.
 * Calculates financial valuations and KPIs for physical audit sheets.
 */
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'supervisor', 'warehouse_manager']), async (req, res) => {
  try {
    const {
      branch_id,
      category_id,
      status_filter,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const isExport = limit === 'all' || parseInt(limit, 10) === 0 || parseInt(limit, 10) >= 1000;
    const limitNum = isExport ? 10000 : Math.max(1, Math.min(1000, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [`p.status = 'active'`];
    const params = [];
    let pIdx = 1;

    // Branch scoping: Allow super_admin, admin, inventory_manager, and supervisor in SWM dashboard to audit any requested branch
    const isRestrictedBranchUser = !['super_admin', 'admin', 'inventory_manager', 'supervisor'].includes(req.user.role);
    const forcedBranchId = (isRestrictedBranchUser && req.user.branchId) ? req.user.branchId : null;
    const effectiveBranchId = forcedBranchId || (branch_id && branch_id !== 'all' && branch_id !== '' && branch_id !== 'undefined' ? branch_id : null);

    // Branch filter
    let branchJoinSql = '';
    let selectedBranchFallbackId = null;
    let selectedBranchFallbackName = 'المستودع الرئيسي';

    if (effectiveBranchId) {
      const bId = parseInt(effectiveBranchId, 10);
      selectedBranchFallbackId = bId;
      branchJoinSql = `AND ib.branch_id = $${pIdx}`;
      params.push(bId);
      pIdx++;

      try {
        const [brRow] = await query('SELECT id, branch_name FROM branches WHERE id = $1', [bId]);
        if (brRow) {
          selectedBranchFallbackName = brRow.branch_name;
        }
      } catch (e) {
        // Fallback to default
      }
    }

    // Category filter
    if (category_id && category_id !== 'all' && category_id !== '') {
      whereClauses.push(`p.category_id = $${pIdx}`);
      params.push(parseInt(category_id, 10));
      pIdx++;
    }

    // Keyword search
    if (search && search.trim()) {
      whereClauses.push(`(
        p.product_name ILIKE $${pIdx} OR
        p.product_code ILIKE $${pIdx} OR
        p.barcode ILIKE $${pIdx} OR
        p.brand ILIKE $${pIdx} OR
        v.variant_sku ILIKE $${pIdx}
      )`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    const baseWhereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Primary SQL Query
    // We want all product variants or base products with their current stock balance in the targeted branch(es)
    const sql = `
      SELECT
        p.id AS product_id,
        p.product_name,
        p.product_code,
        p.barcode,
        p.category_id,
        c.category_name,
        p.brand,
        p.cost_price,
        p.selling_price,
        p.wholesale_price,
        p.sale_price,
        p.featured_image,
        p.reorder_level,
        p.status AS product_status,
        v.id AS variant_id,
        v.variant_sku,
        COALESCE(v.color, p.color) AS color,
        COALESCE(v.size, p.size) AS size,
        COALESCE(ib.available_qty, 0) AS system_qty,
        COALESCE(ib.reserved_qty, 0) AS reserved_qty,
        COALESCE(ib.sold_qty, 0) AS sold_qty,
        COALESCE(ib.returned_qty, 0) AS returned_qty,
        COALESCE(b.id, ${selectedBranchFallbackId ? selectedBranchFallbackId : 'NULL'}) AS branch_id,
        COALESCE(b.branch_name, '${selectedBranchFallbackName.replace(/'/g, "''")}') AS branch_name,
        b.branch_code,
        b.branch_type,
        ib.id AS balance_id,
        (COALESCE(ib.available_qty, 0) * CAST(p.cost_price AS NUMERIC)) AS stock_value
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN product_variants v ON v.product_id = p.id
      LEFT JOIN inventory_balances ib ON ib.product_id = p.id
        AND (ib.variant_id = v.id OR (ib.variant_id IS NULL AND v.id IS NULL))
        ${branchJoinSql}
      LEFT JOIN branches b ON b.id = ib.branch_id
      ${baseWhereSql}
      ORDER BY p.id ASC, v.id ASC NULLS FIRST
    `;

    const allRows = await query(sql, params);

    // Calculate Global KPIs for the scope across all matched items
    let totalUnits = 0;
    let totalStockValue = 0;
    let inStockCount = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    for (const r of allRows) {
      const q = parseInt(r.system_qty || 0, 10);
      const cost = parseFloat(r.cost_price || 0);
      totalUnits += q;
      totalStockValue += (q * cost);

      if (q > 0) inStockCount++;
      else outOfStockCount++;

      const min = parseInt(r.reorder_level || 5, 10);
      if (q > 0 && q <= min) lowStockCount++;
    }

    // Apply Stock Status filter in memory if specified
    let filteredRows = allRows;
    if (status_filter && status_filter !== 'all') {
      if (status_filter === 'in_stock') {
        filteredRows = allRows.filter(r => parseInt(r.system_qty, 10) > 0);
      } else if (status_filter === 'out_of_stock') {
        filteredRows = allRows.filter(r => parseInt(r.system_qty, 10) <= 0);
      } else if (status_filter === 'low_stock') {
        filteredRows = allRows.filter(r => {
          const qty = parseInt(r.system_qty, 10);
          const min = parseInt(r.reorder_level || 5, 10);
          return qty > 0 && qty <= min;
        });
      }
    }

    const totalCount = filteredRows.length;
    const paginatedItems = isExport ? filteredRows : filteredRows.slice(offset, offset + limitNum);

    // Branch info if single branch is selected
    let targetBranch = null;
    if (effectiveBranchId) {
      const [b] = await query(`SELECT id, branch_name, branch_code, branch_type FROM branches WHERE id = $1`, [parseInt(effectiveBranchId, 10)]);
      targetBranch = b || null;
    }

    return res.json({
      success: true,
      data: {
        items: paginatedItems,
        kpi: {
          totalItems: totalCount,
          totalUnits,
          totalStockValue: Math.round(totalStockValue * 100) / 100,
          inStockCount,
          outOfStockCount,
          lowStockCount
        },
        targetBranch,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      }
    });
  } catch (err) {
    console.error('Stock Audit error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/stock-audit/counts
 * List stock-take sessions for the user's branch
 */
router.get('/counts', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'supervisor', 'warehouse_manager']), async (req, res) => {
  try {
    const isBranchAccount = req.user.isBranchAccount || (!['super_admin', 'admin', 'inventory_manager'].includes(req.user.role));
    const effectiveBranchId = isBranchAccount ? req.user.branchId : (req.query.branch_id || req.user.branchId);

    if (!effectiveBranchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required' });
    }

    const sessions = await query(
      `SELECT count_session, count_date, status, COUNT(id) AS items_counted,
              SUM(CASE WHEN actual_qty != system_qty THEN 1 ELSE 0 END) AS discrepancies_count,
              MAX(created_at) AS created_at
       FROM inventory_counts
       WHERE branch_id = $1
       GROUP BY count_session, count_date, status
       ORDER BY created_at DESC
       LIMIT 30`,
      [effectiveBranchId]
    );

    return res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('List stock count sessions error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/stock-audit/counts/:session
 * Get detail items for a specific stock-take session
 */
router.get('/counts/:session', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'supervisor', 'warehouse_manager']), async (req, res) => {
  try {
    const { session } = req.params;
    const isBranchAccount = req.user.isBranchAccount || (!['super_admin', 'admin', 'inventory_manager'].includes(req.user.role));
    const effectiveBranchId = isBranchAccount ? req.user.branchId : (req.query.branch_id || req.user.branchId);

    const items = await query(
      `SELECT ic.*, p.product_name, p.product_code, p.barcode, p.cost_price, p.selling_price,
              (ic.actual_qty - ic.system_qty) AS variance_qty,
              u.full_name AS counted_by_name
       FROM inventory_counts ic
       JOIN products p ON p.id = ic.product_id
       LEFT JOIN users u ON u.id = ic.counted_by
       WHERE ic.count_session = $1 AND ic.branch_id = $2
       ORDER BY ic.id ASC`,
      [session, effectiveBranchId]
    );

    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('Get stock count detail error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/stock-audit/counts
 * Submit a physical stock-take session
 */
router.post('/counts', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'supervisor', 'warehouse_manager']), async (req, res) => {
  try {
    const { count_session, count_date, items, notes } = req.body;
    const branchId = req.body.branch_id || req.user.branch_id || req.user.branchId;

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'يجب إرسال أصناف الجرد' });
    }

    const sessionCode = count_session || `STK-B${branchId}-${Date.now()}`;
    const dateVal = count_date || new Date().toISOString().slice(0, 10);

    await transaction(async (client) => {
      for (const item of items) {
        if (!item.product_id) continue;
        await client.query(
          `INSERT INTO inventory_counts (
             count_session, branch_id, product_id, variant_id, system_qty,
             actual_qty, notes, counted_by, count_date, status, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted', NOW(), NOW())`,
          [
            sessionCode,
            branchId,
            item.product_id,
            item.variant_id || null,
            parseInt(item.system_qty || 0, 10),
            parseInt(item.actual_qty || 0, 10),
            item.notes || notes || null,
            req.user.id,
            dateVal
          ]
        );
      }
    });

    logActivity({
      userId: req.user.id,
      branchId,
      actionType: 'STOCK_COUNT_SUBMITTED',
      entityType: 'inventory_counts',
      entityId: null,
      newValue: { count_session: sessionCode, items_count: items.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `تسجيل جلسة جرد مجمع (${sessionCode}) بعدد ${items.length} صنف`
    });

    return res.status(201).json({
      success: true,
      message: `تم تسجيل جلسة الجرد المجمع (${sessionCode}) بعدد ${items.length} صنف بنجاح`,
      session_code: sessionCode
    });
  } catch (err) {
    console.error('Submit stock counts error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/stock-audit/counts/:session/convert-to-adjustment
 * Convert discrepancies from a physical stock-take into an approved stock adjustment voucher
 */
router.post('/counts/:session/convert-to-adjustment', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'supervisor', 'warehouse_manager']), async (req, res) => {
  try {
    const { session } = req.params;
    const branchId = req.body.branch_id || req.user.branch_id || req.user.branchId;

    const countItems = await query(
      `SELECT ic.*, p.product_name, p.product_code, p.cost_price, v.variant_sku
       FROM inventory_counts ic
       JOIN products p ON p.id = ic.product_id
       LEFT JOIN product_variants v ON v.id = ic.variant_id
       WHERE ic.count_session = $1 AND ic.branch_id = $2`,
      [session, branchId]
    );

    if (countItems.length === 0) {
      return res.status(404).json({ success: false, message: 'جلسة الجرد غير موجودة أو فارغة' });
    }

    const discrepancies = countItems.filter(i => parseInt(i.actual_qty, 10) !== parseInt(i.system_qty, 10));

    if (discrepancies.length === 0) {
      await query(`UPDATE inventory_counts SET status = 'verified', updated_at = NOW() WHERE count_session = $1 AND branch_id = $2`, [session, branchId]);
      return res.json({ success: true, message: 'لا توجد أي فروقات بين الجرد الفعلي ورصيد النظام. تم تأكيد الجرد كمطابق 100%.' });
    }

    const { transaction } = require('../../shared/db');
    const { logActivity } = require('../../shared/activityLogger');

    // Generate Adjustment Voucher Number: ADJ-YYMM-XXXXX
    const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
    const [{ count }] = await query(`SELECT COUNT(id) AS count FROM stock_adjustments`);
    const voucherNumber = `ADJ-${yymm}-${String(parseInt(count, 10) + 1).padStart(5, '0')}`;

    const adjustmentVoucher = await transaction(async (client) => {
      let totalSurplus = 0;
      let totalDeficit = 0;
      let totalVarianceCost = 0;

      for (const d of discrepancies) {
        const diff = parseInt(d.actual_qty, 10) - parseInt(d.system_qty, 10);
        const cost = parseFloat(d.cost_price || 0);
        if (diff > 0) totalSurplus += diff;
        else totalDeficit += Math.abs(diff);
        totalVarianceCost += (diff * cost);
      }

      // 1. Create Stock Adjustment Header
      const { rows: [adj] } = await client.query(
        `INSERT INTO stock_adjustments (
           adjustment_number, branch_id, adjustment_date, reason, status,
           total_items, total_surplus_qty, total_deficit_qty, net_qty_change,
           total_variance_cost, notes, created_by, approved_by, approved_at,
           created_at, updated_at
         ) VALUES ($1, $2, NOW()::date, $3, 'approved', $4, $5, $6, $7, $8, $9, $10, $10, NOW(), NOW(), NOW())
         RETURNING *`,
        [
          voucherNumber,
          branchId,
          `تسوية فورية ناتجة عن جلسة الجرد المجمع (${session})`,
          discrepancies.length,
          totalSurplus,
          totalDeficit,
          totalSurplus - totalDeficit,
          totalVarianceCost,
          `تم إنشاء واعتماد التسوية آلياً من جلسة الجرد #${session}`,
          req.user.id
        ]
      );

      // 2. Insert items and update balances
      for (const it of discrepancies) {
        const varianceQty = parseInt(it.actual_qty, 10) - parseInt(it.system_qty, 10);
        const unitCost = parseFloat(it.cost_price || 0);
        const varianceCost = varianceQty * unitCost;

        await client.query(
          `INSERT INTO stock_adjustment_items (
             adjustment_id, product_id, variant_id, system_qty, actual_qty,
             variance_qty, unit_cost, variance_cost, product_name, product_code,
             variant_sku, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [
            adj.id, it.product_id, it.variant_id, it.system_qty, it.actual_qty,
            varianceQty, unitCost, varianceCost, it.product_name, it.product_code,
            it.variant_sku || null
          ]
        );

        // Update inventory balance
        const { rows: [bRow] } = await client.query(
          `SELECT id, available_qty FROM inventory_balances 
           WHERE branch_id = $1 AND product_id = $2 
             AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
          [branchId, it.product_id, it.variant_id]
        );

        const beforeQty = bRow ? parseInt(bRow.available_qty, 10) : 0;
        if (bRow) {
          await client.query(
            `UPDATE inventory_balances 
             SET available_qty = $1, last_movement_at = NOW(), last_updated = NOW() 
             WHERE id = $2`,
            [it.actual_qty, bRow.id]
          );
        } else {
          await client.query(
            `INSERT INTO inventory_balances (
               branch_id, product_id, variant_id, available_qty,
               reserved_qty, sold_qty, last_movement_at, last_updated
             ) VALUES ($1, $2, $3, $4, 0, 0, NOW(), NOW())`,
            [branchId, it.product_id, it.variant_id, it.actual_qty]
          );
        }

        // Ledger movement
        const movementType = varianceQty > 0 ? 'adjustment_in' : 'adjustment_out';
        await client.query(
          `INSERT INTO inventory_movements (
             branch_id, product_id, variant_id, movement_type, quantity_change,
             quantity_before, quantity_after, reference_type, reference_id,
             notes, created_by, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'stock_adjustments', $8, $9, $10, NOW(), NOW())`,
          [
            branchId, it.product_id, it.variant_id, movementType, varianceQty,
            beforeQty, it.actual_qty, adj.id,
            `تسوية جرد #${session} - فارق: ${varianceQty > 0 ? '+' : ''}${varianceQty}`,
            req.user.id
          ]
        );
      }

      // Mark inventory_counts status as adjusted
      await client.query(
        `UPDATE inventory_counts SET status = 'adjusted', updated_at = NOW() WHERE count_session = $1 AND branch_id = $2`,
        [session, branchId]
      );

      return adj;
    });

    logActivity({
      userId: req.user.id,
      branchId,
      actionType: 'STOCK_COUNT_CONVERTED_TO_ADJUSTMENT',
      entityType: 'stock_adjustments',
      entityId: adjustmentVoucher.id,
      newValue: { session, voucherNumber: adjustmentVoucher.adjustment_number },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `تحويل جلسة الجرد #${session} لسند تسوية رقم ${adjustmentVoucher.adjustment_number}`
    });

    return res.status(201).json({
      success: true,
      message: `تم إنشاء واعتماد سند التسوية #${adjustmentVoucher.adjustment_number} لـ ${discrepancies.length} أصناف بنجاح وتحديث أرصدة المخزون`,
      data: adjustmentVoucher
    });
  } catch (err) {
    console.error('Convert count to adjustment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
