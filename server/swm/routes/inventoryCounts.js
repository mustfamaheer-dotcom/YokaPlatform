const express = require('express');
const router = express.Router();
const { transaction, query } = require('../../shared/db');
const { requireAuth, requireRole, requireWarehousePermission } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

router.use(requireWarehousePermission('stock_audit'));

/**
 * POST /api/swm/inventory-counts/submit
 * Comprehensive Stock Reconciliation Execution:
 * 1. Inserts into inventory_counts (adjusted / verified).
 * 2. Creates official Stock Adjustment Voucher in stock_adjustments and stock_adjustment_items.
 * 3. Immediately updates inventory_balances (available_qty = actual_qty) whether increase, decrease, or match!
 * 4. Inserts audit trail records in inventory_movements (adjustment_in / adjustment_out).
 * 5. Logs action via logActivity().
 */
router.post('/submit', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'supervisor', 'warehouse_manager']), async (req, res) => {
  try {
    const { branch_id, items, count_session, count_date, notes } = req.body;

    // Scoped branch resolution
    const isRestrictedBranchUser = !['super_admin', 'admin', 'inventory_manager', 'supervisor', 'warehouse_manager'].includes(req.user.role);
    const forcedBranchId = (isRestrictedBranchUser && req.user.branchId) ? req.user.branchId : null;
    const effectiveBranchId = forcedBranchId || (branch_id && branch_id !== 'all' && branch_id !== '' ? parseInt(branch_id, 10) : req.user.branchId);

    if (!effectiveBranchId) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تحديد الفرع المستهدف لتسجيل واعتماد جرد التسوية'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب إرسال صنف واحد على الأقل تم جرد رصيده الفعلي'
      });
    }

    // Validate branch exists
    const [branchRow] = await query('SELECT id, branch_name FROM branches WHERE id = $1', [effectiveBranchId]);
    if (!branchRow) {
      return res.status(404).json({
        success: false,
        message: 'الفرع المحدد غير موجود في النظام'
      });
    }

    const sessionCode = count_session || `REC-B${effectiveBranchId}-${Date.now().toString().slice(-6)}`;
    const dateVal = count_date || new Date().toISOString().slice(0, 10);

    // Fetch product details for accurate pricing and naming
    const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))];
    let productDetailsMap = {};
    if (productIds.length > 0) {
      const prodRows = await query(
        `SELECT id, product_name, product_code, cost_price FROM products WHERE id = ANY($1)`,
        [productIds]
      );
      prodRows.forEach(p => {
        productDetailsMap[p.id] = p;
      });
    }

    // Generate Adjustment Voucher Number: ADJ-YYMM-XXXXX
    const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
    const [{ count }] = await query(`SELECT COUNT(id) AS count FROM stock_adjustments`);
    const voucherNumber = `ADJ-${yymm}-${String(parseInt(count || 0, 10) + 1).padStart(5, '0')}`;

    // Execute atomic transaction for inventory_counts, stock_adjustments, inventory_balances, and movements
    const result = await transaction(async (client) => {
      let totalSurplus = 0;
      let totalDeficit = 0;
      let totalVarianceCost = 0;
      const discrepancyItems = [];

      for (const item of items) {
        if (!item.product_id) continue;
        const systemQty = parseInt(item.system_qty || 0, 10);
        const actualQty = Math.max(0, parseInt(item.actual_qty || 0, 10));
        const varianceQty = actualQty - systemQty;
        const prod = productDetailsMap[item.product_id] || {};
        const unitCost = parseFloat(prod.cost_price || item.cost_price || 0);
        const varianceCost = varianceQty * unitCost;

        if (varianceQty > 0) {
          totalSurplus += varianceQty;
        } else if (varianceQty < 0) {
          totalDeficit += Math.abs(varianceQty);
        }
        totalVarianceCost += varianceCost;

        discrepancyItems.push({
          ...item,
          system_qty: systemQty,
          actual_qty: actualQty,
          variance_qty: varianceQty,
          unit_cost: unitCost,
          variance_cost: varianceCost,
          product_name: prod.product_name || item.product_name || 'منتج',
          product_code: prod.product_code || item.product_code || '',
          variant_sku: item.variant_sku || null
        });
      }

      // 1. Insert official Stock Adjustment Header
      const { rows: [adjVoucher] } = await client.query(
        `INSERT INTO stock_adjustments (
           adjustment_number, branch_id, adjustment_date, reason, status,
           total_items, total_surplus_qty, total_deficit_qty, net_qty_change,
           total_variance_cost, notes, created_by, approved_by, approved_at,
           created_at, updated_at
         ) VALUES ($1, $2, $3, $4, 'approved', $5, $6, $7, $8, $9, $10, $11, $11, NOW(), NOW(), NOW())
         RETURNING id, adjustment_number`,
        [
          voucherNumber,
          effectiveBranchId,
          dateVal,
          `تسوية واعتماد جرد فعلي ميداني (${sessionCode})`,
          discrepancyItems.length,
          totalSurplus,
          totalDeficit,
          totalSurplus - totalDeficit,
          totalVarianceCost,
          notes || `اعتماد تسوية الجرد المباشر لجلسة #${sessionCode}`,
          req.user.id
        ]
      );

      // 2. Loop through all items: record counts, adjust items, update balances, and ledger movements
      for (const d of discrepancyItems) {
        const itemStatus = d.variance_qty !== 0 ? 'adjusted' : 'verified';
        const itemNote = d.notes || notes || (d.variance_qty !== 0 ? `فارق: ${d.variance_qty > 0 ? '+' : ''}${d.variance_qty}` : 'مطابق');

        // A) Insert into inventory_counts
        await client.query(
          `INSERT INTO inventory_counts (
             count_session, branch_id, product_id, variant_id, system_qty,
             actual_qty, notes, counted_by, count_date, status, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            sessionCode,
            effectiveBranchId,
            d.product_id,
            d.variant_id || null,
            d.system_qty,
            d.actual_qty,
            itemNote,
            req.user.id,
            dateVal,
            itemStatus
          ]
        );

        // B) Insert into stock_adjustment_items
        await client.query(
          `INSERT INTO stock_adjustment_items (
             adjustment_id, product_id, variant_id, system_qty, actual_qty,
             variance_qty, unit_cost, variance_cost, product_name, product_code,
             variant_sku, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [
            adjVoucher.id,
            d.product_id,
            d.variant_id || null,
            d.system_qty,
            d.actual_qty,
            d.variance_qty,
            d.unit_cost,
            d.variance_cost,
            d.product_name,
            d.product_code,
            d.variant_sku
          ]
        );

        // C) Update or Insert into inventory_balances so the system stock reflects actual_qty
        const { rows: [bRow] } = await client.query(
          `SELECT id, available_qty FROM inventory_balances
           WHERE branch_id = $1 AND product_id = $2
             AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
          [effectiveBranchId, d.product_id, d.variant_id || null]
        );

        const beforeQty = bRow ? parseInt(bRow.available_qty, 10) : 0;
        if (bRow) {
          await client.query(
            `UPDATE inventory_balances
             SET available_qty = $1, last_movement_at = NOW(), last_updated = NOW()
             WHERE id = $2`,
            [d.actual_qty, bRow.id]
          );
        } else {
          await client.query(
            `INSERT INTO inventory_balances (
               branch_id, product_id, variant_id, available_qty,
               reserved_qty, sold_qty, last_movement_at, last_updated
             ) VALUES ($1, $2, $3, $4, 0, 0, NOW(), NOW())`,
            [effectiveBranchId, d.product_id, d.variant_id || null, d.actual_qty]
          );
        }

        // D) Record in inventory_movements if there is a variance (surplus or shortage)
        if (d.variance_qty !== 0) {
          const movementType = d.variance_qty > 0 ? 'adjustment_in' : 'adjustment_out';
          await client.query(
            `INSERT INTO inventory_movements (
               branch_id, product_id, variant_id, movement_type, quantity_change,
               quantity_before, quantity_after, reference_type, reference_id,
               notes, created_by, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'stock_adjustments', $8, $9, $10, NOW(), NOW())`,
            [
              effectiveBranchId,
              d.product_id,
              d.variant_id || null,
              movementType,
              d.variance_qty,
              beforeQty,
              d.actual_qty,
              adjVoucher.id,
              `تسوية جرد #${sessionCode} - فارق (${d.variance_qty > 0 ? '+' : ''}${d.variance_qty})`,
              req.user.id
            ]
          );
        }
      }

      return {
        voucherId: adjVoucher.id,
        voucherNumber: adjVoucher.adjustment_number,
        totalSurplus,
        totalDeficit,
        netChange: totalSurplus - totalDeficit,
        itemsCount: discrepancyItems.length
      };
    });

    // Invalidate storefront and inventory cache if Redis is active
    try {
      const redis = require('../../shared/redis');
      if (redis) {
        const keys = await redis.keys('ecp:cache:*');
        if (keys && keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch (e) {
      // Redis is optional
    }

    // Explicitly log the action using the shared logActivity() engine
    logActivity({
      userId: req.user.id,
      branchId: effectiveBranchId,
      actionType: 'INVENTORY_RECONCILIATION_SUBMITTED',
      entityType: 'stock_adjustments',
      entityId: result.voucherId,
      newValue: {
        count_session: sessionCode,
        voucher_number: result.voucherNumber,
        branch_id: effectiveBranchId,
        branch_name: branchRow.branch_name,
        items_count: result.itemsCount,
        total_surplus: result.totalSurplus,
        total_deficit: result.totalDeficit,
        net_change: result.netChange
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `اعتماد سند تسوية مخزنية #${result.voucherNumber} لجلسة الجرد (${sessionCode}) وتحديث الأرصدة الفعلية لفرع "${branchRow.branch_name}"`
    });

    return res.status(200).json({
      success: true,
      message: `تم اعتماد سند التسوية رقم (${result.voucherNumber}) وتحديث أرصدة المخزون الفعلية لفرع "${branchRow.branch_name}" بنجاح!`,
      voucher_number: result.voucherNumber,
      session_code: sessionCode,
      branch_id: effectiveBranchId,
      branch_name: branchRow.branch_name,
      items_count: result.itemsCount,
      total_surplus: result.totalSurplus,
      total_deficit: result.totalDeficit,
      net_change: result.netChange
    });
  } catch (err) {
    console.error('Submit inventory reconciliation error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'فشل في حفظ واعتماد جرد التسوية وتحديث المخزون'
    });
  }
});

module.exports = router;
