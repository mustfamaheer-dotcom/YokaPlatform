const router = require('express').Router();
const { query, transaction } = require('../../shared/db');
const { requireAuth, requireRole, requireWarehousePermission } = require('../../shared/authMiddleware');
const { logActivity } = require('../../shared/activityLogger');

router.use(requireWarehousePermission('transfers'));

/**
 * GET /api/swm/transfers/metrics
 * Summary stats of stock transfers
 */
router.get('/metrics', requireAuth, requireRole(['super_admin', 'admin', 'warehouse_manager']), async (req, res) => {
  try {
    const [stats] = await query(`
      SELECT
        COUNT(id) AS total_transfers,
        COALESCE(SUM(total_units), 0) AS total_units_dispatched,
        COUNT(DISTINCT from_branch_id) AS sender_branches_count,
        COUNT(DISTINCT to_branch_id) AS receiver_branches_count
      FROM stock_transfers
    `);

    return res.json({
      success: true,
      data: {
        total_transfers: parseInt(stats?.total_transfers || 0, 10),
        total_units_dispatched: parseInt(stats?.total_units_dispatched || 0, 10),
        sender_branches_count: parseInt(stats?.sender_branches_count || 0, 10),
        receiver_branches_count: parseInt(stats?.receiver_branches_count || 0, 10)
      }
    });
  } catch (err) {
    console.error('Transfers metrics error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/transfers/branch-stock/:branchId
 * Get available products with current stock in the specified sending branch
 */
router.get('/branch-stock/:branchId', requireAuth, requireRole(['super_admin', 'admin', 'warehouse_manager']), async (req, res) => {
  try {
    const { branchId } = req.params;
    const { search } = req.query;

    const whereClauses = ['ib.branch_id = $1', 'ib.available_qty > 0', 'p.status = \'active\''];
    const params = [parseInt(branchId, 10)];
    let pIdx = 2;

    if (search && search.trim()) {
      whereClauses.push(`(p.product_name ILIKE $${pIdx} OR p.product_code ILIKE $${pIdx} OR p.barcode ILIKE $${pIdx} OR pv.variant_sku ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    const { category_id } = req.query;
    if (category_id && category_id !== 'all') {
      whereClauses.push(`p.category_id = $${pIdx}`);
      params.push(parseInt(category_id, 10));
      pIdx++;
    }

    const sql = `
      SELECT
        ib.id AS balance_id,
        ib.product_id,
        ib.variant_id,
        ib.available_qty,
        p.product_name,
        p.product_code,
        p.barcode,
        p.cost_price,
        p.selling_price,
        pv.variant_sku,
        pv.color,
        pv.size,
        COALESCE(pv.image_url, p.featured_image) AS image_url,
        p.category_id,
        c.category_name,
        CASE
          WHEN pv.id IS NOT NULL THEN CONCAT(p.product_name, ' (', COALESCE(pv.color, ''), ' - ', COALESCE(pv.size, ''), ')')
          ELSE p.product_name
        END AS display_name
      FROM inventory_balances ib
      JOIN products p ON p.id = ib.product_id
      LEFT JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN product_variants pv ON pv.id = ib.variant_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY p.product_name ASC
      LIMIT 1000
    `;

    const rows = await query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch branch stock error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/transfers
 * List stock transfers with filters and pagination
 */
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'warehouse_manager']), async (req, res) => {
  try {
    const { from_branch_id, to_branch_id, date, search, page = 1, limit = 5000 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(10000, parseInt(limit, 10) || 5000));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = ['1=1'];
    const params = [];
    let pIdx = 1;

    if (from_branch_id) {
      whereClauses.push(`st.from_branch_id = $${pIdx++}`);
      params.push(parseInt(from_branch_id, 10));
    }

    if (to_branch_id) {
      whereClauses.push(`st.to_branch_id = $${pIdx++}`);
      params.push(parseInt(to_branch_id, 10));
    }

    if (date) {
      whereClauses.push(`DATE(st.transfer_date) = $${pIdx++}`);
      params.push(date);
    }

    if (search && search.trim()) {
      whereClauses.push(`(st.transfer_number ILIKE $${pIdx} OR st.driver_name ILIKE $${pIdx} OR st.notes ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // Total count
    const [countRes] = await query(`SELECT COUNT(st.id) AS total FROM stock_transfers st ${whereSql}`, params);
    const total = parseInt(countRes?.total || 0, 10);

    // Data query
    const sql = `
      SELECT
        st.*,
        fb.branch_name AS from_branch_name,
        fb.branch_code AS from_branch_code,
        fb.branch_type AS from_branch_type,
        tb.branch_name AS to_branch_name,
        tb.branch_code AS to_branch_code,
        tb.branch_type AS to_branch_type,
        u.full_name AS created_by_name,
        u.username AS created_by_username
      FROM stock_transfers st
      JOIN branches fb ON fb.id = st.from_branch_id
      JOIN branches tb ON tb.id = st.to_branch_id
      LEFT JOIN users u ON u.id = st.created_by
      ${whereSql}
      ORDER BY st.transfer_date DESC, st.id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const transfers = await query(sql, params);

    return res.json({
      success: true,
      data: transfers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('List transfers error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/swm/transfers/:id
 * Retrieve single dispatch note with line items and branch contacts for PDF/Print
 */
router.get('/:id', requireAuth, requireRole(['super_admin', 'admin', 'warehouse_manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const [transfer] = await query(
      `SELECT
        st.*,
        fb.branch_name AS from_branch_name,
        fb.branch_code AS from_branch_code,
        fb.branch_type AS from_branch_type,
        fb.address AS from_branch_address,
        fb.phone AS from_branch_phone,
        tb.branch_name AS to_branch_name,
        tb.branch_code AS to_branch_code,
        tb.branch_type AS to_branch_type,
        tb.address AS to_branch_address,
        tb.phone AS to_branch_phone,
        u.full_name AS created_by_name,
        u.username AS created_by_username
      FROM stock_transfers st
      JOIN branches fb ON fb.id = st.from_branch_id
      JOIN branches tb ON tb.id = st.to_branch_id
      LEFT JOIN users u ON u.id = st.created_by
      WHERE st.id = $1`,
      [id]
    );

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'إذن الصرف غير موجود' });
    }

    const items = await query(
      `SELECT
        sti.*,
        p.barcode,
        p.product_code AS master_product_code,
        pv.variant_sku,
        pv.color,
        pv.size
      FROM stock_transfer_items sti
      JOIN products p ON p.id = sti.product_id
      LEFT JOIN product_variants pv ON pv.id = sti.variant_id
      WHERE sti.transfer_id = $1
      ORDER BY sti.id ASC`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...transfer,
        items
      }
    });
  } catch (err) {
    console.error('Transfer details error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/transfers
 * Create and execute stock transfer:
 * - Deducts from sender branch inventory_balances
 * - Adds to receiver branch inventory_balances
 * - Logs transfer_out and transfer_in audit records in inventory_movements
 * - Creates stock_transfers and stock_transfer_items records
 */
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'warehouse_manager']), async (req, res) => {
  try {
    const {
      from_branch_id,
      to_branch_id,
      transfer_date,
      driver_name,
      vehicle_number,
      notes,
      items
    } = req.body;

    const fromId = parseInt(from_branch_id, 10);
    const toId = parseInt(to_branch_id, 10);

    if (!fromId || !toId) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تحديد كل من المخزن/الفرع المُرسِل والمُستقبِل'
      });
    }

    if (fromId === toId) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن الصرف لنفس المخزن أو الفرع. يرجى اختيار جهتين مختلفتين.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إضافة صنف واحد على الأقل لإذن الصرف'
      });
    }

    // Verify branches exist and are active
    const branchRows = await query(
      `SELECT id, branch_name, branch_code, status FROM branches WHERE id IN ($1, $2)`,
      [fromId, toId]
    );

    if (branchRows.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'أحد الفروع المحددة غير موجود في النظام'
      });
    }

    const fromBranch = branchRows.find(b => b.id === fromId);
    const toBranch = branchRows.find(b => b.id === toId);

    // Generate unique transfer number: DSP-YYMM-XXXXX
    const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
    const [{ count }] = await query(`SELECT COUNT(id) AS count FROM stock_transfers`);
    const transferNumber = `DSP-${yymm}-${String(parseInt(count, 10) + 1).padStart(5, '0')}`;

    // Execute atomic transfer transaction
    const result = await transaction(async (client) => {
      let totalUnits = 0;
      const validatedItems = [];

      // 1. Lock and validate stock for each item from sending branch
      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        if (!qty || qty <= 0) {
          throw new Error(`كمية غير صالحة للصنف ${item.product_name || item.product_id}`);
        }

        const productId = parseInt(item.product_id, 10);
        const variantId = item.variant_id ? parseInt(item.variant_id, 10) : null;

        // Query available balance in sender branch with row lock
        let balanceRow;
        if (variantId) {
          const varBalRes = await client.query(
            `SELECT * FROM inventory_balances
             WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3
             FOR UPDATE`,
            [fromId, productId, variantId]
          );
          if (varBalRes.rows.length > 0) {
            balanceRow = varBalRes.rows[0];
          } else {
            // Fallback to base product balance
            const baseBalRes = await client.query(
              `SELECT * FROM inventory_balances
               WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL
               FOR UPDATE`,
              [fromId, productId]
            );
            balanceRow = baseBalRes.rows[0];
          }
        } else {
          const baseBalRes = await client.query(
            `SELECT * FROM inventory_balances
             WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL
             FOR UPDATE`,
            [fromId, productId]
          );
          balanceRow = baseBalRes.rows[0];
        }

        // Fetch fresh product info
        const prodInfoRes = await client.query(
          `SELECT id, product_code, product_name, cost_price FROM products WHERE id = $1`,
          [productId]
        );
        const prod = prodInfoRes.rows[0];
        const prodName = prod?.product_name || item.product_name || `صنف #${productId}`;

        const available = balanceRow ? parseInt(balanceRow.available_qty, 10) : 0;

        if (available < qty) {
          throw new Error(
            `الرصيد المتاح للصنف "${prodName}" في ${fromBranch.branch_name} (${available} قطعة) غير كافٍ لصرف (${qty} قطعة)`
          );
        }

        totalUnits += qty;
        validatedItems.push({
          product_id: productId,
          variant_id: variantId,
          quantity: qty,
          unit_cost: parseFloat(prod?.cost_price || 0),
          product_name: prod?.product_name || item.product_name,
          product_code: prod?.product_code || item.product_code,
          notes: item.notes || null,
          sender_balance_id: balanceRow.id,
          sender_stock_before: available,
          sender_stock_after: available - qty
        });
      }

      // 2. Insert into stock_transfers
      const [transfer] = (await client.query(
        `INSERT INTO stock_transfers (
          transfer_number, from_branch_id, to_branch_id, transfer_date,
          status, total_items, total_units, driver_name, vehicle_number,
          notes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'completed', $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          transferNumber,
          fromId,
          toId,
          transfer_date || new Date().toISOString().split('T')[0],
          validatedItems.length,
          totalUnits,
          driver_name || null,
          vehicle_number || null,
          notes || null,
          req.user.id
        ]
      )).rows;

      // 3. Process each item: deduct sender, add receiver, log movements
      const savedItems = [];
      for (const vItem of validatedItems) {
        // A. Insert into stock_transfer_items
        const [savedItem] = (await client.query(
          `INSERT INTO stock_transfer_items (
            transfer_id, product_id, variant_id, quantity, unit_cost,
            product_name, product_code, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING *`,
          [
            transfer.id,
            vItem.product_id,
            vItem.variant_id,
            vItem.quantity,
            vItem.unit_cost,
            vItem.product_name,
            vItem.product_code,
            vItem.notes
          ]
        )).rows;
        savedItems.push(savedItem);

        // B. Deduct quantity from sender branch inventory_balances
        await client.query(
          `UPDATE inventory_balances
           SET available_qty = available_qty - $1,
               last_movement_at = NOW(),
               last_updated = NOW()
           WHERE id = $2`,
          [vItem.quantity, vItem.sender_balance_id]
        );

        // C. Log transfer_out movement for sender
        await client.query(
          `INSERT INTO inventory_movements (
            branch_id, product_id, variant_id, movement_type, quantity_change,
            quantity_before, quantity_after, reference_type, reference_id,
            notes, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, 'transfer_out', $4, $5, $6, 'stock_transfers', $7, $8, $9, NOW(), NOW())`,
          [
            fromId,
            vItem.product_id,
            vItem.variant_id,
            -vItem.quantity,
            vItem.sender_stock_before,
            vItem.sender_stock_after,
            transfer.id,
            `إذن صرف #${transferNumber} إلى ${toBranch.branch_name}`,
            req.user.id
          ]
        );

        // D. Add quantity to receiver branch inventory_balances (UPSERT)
        let receiverBalRes;
        if (vItem.variant_id) {
          receiverBalRes = await client.query(
            `SELECT * FROM inventory_balances
             WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3
             FOR UPDATE`,
            [toId, vItem.product_id, vItem.variant_id]
          );
        } else {
          receiverBalRes = await client.query(
            `SELECT * FROM inventory_balances
             WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL
             FOR UPDATE`,
            [toId, vItem.product_id]
          );
        }

        let receiverStockBefore = 0;
        let receiverStockAfter = vItem.quantity;

        if (receiverBalRes.rows.length > 0) {
          const rRow = receiverBalRes.rows[0];
          receiverStockBefore = parseInt(rRow.available_qty, 10);
          receiverStockAfter = receiverStockBefore + vItem.quantity;

          await client.query(
            `UPDATE inventory_balances
             SET available_qty = available_qty + $1,
                 last_movement_at = NOW(),
                 last_updated = NOW()
             WHERE id = $2`,
            [vItem.quantity, rRow.id]
          );
        } else {
          await client.query(
            `INSERT INTO inventory_balances (
              branch_id, product_id, variant_id, available_qty,
              reserved_qty, sold_qty, last_movement_at, last_updated
            ) VALUES ($1, $2, $3, $4, 0, 0, NOW(), NOW())`,
            [toId, vItem.product_id, vItem.variant_id, vItem.quantity]
          );
        }

        // E. Log transfer_in movement for receiver
        await client.query(
          `INSERT INTO inventory_movements (
            branch_id, product_id, variant_id, movement_type, quantity_change,
            quantity_before, quantity_after, reference_type, reference_id,
            notes, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, 'transfer_in', $4, $5, $6, 'stock_transfers', $7, $8, $9, NOW(), NOW())`,
          [
            toId,
            vItem.product_id,
            vItem.variant_id,
            vItem.quantity,
            receiverStockBefore,
            receiverStockAfter,
            transfer.id,
            `إذن استلام #${transferNumber} من ${fromBranch.branch_name}`,
            req.user.id
          ]
        );
      }

      return { transfer, items: savedItems };
    });

    logActivity({
      userId: req.user.id,
      branchId: fromId,
      actionType: 'STOCK_TRANSFER_COMPLETED',
      entityType: 'stock_transfers',
      entityId: result.transfer.id,
      newValue: {
        transfer_number: transferNumber,
        from_branch: fromBranch.branch_name,
        to_branch: toBranch.branch_name,
        items_count: items.length,
        total_units: result.transfer.total_units
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `إذن صرف #${transferNumber}: تحويل ${result.transfer.total_units} قطعة من ${fromBranch.branch_name} إلى ${toBranch.branch_name}`
    });

    return res.status(201).json({
      success: true,
      data: {
        ...result.transfer,
        from_branch_name: fromBranch.branch_name,
        to_branch_name: toBranch.branch_name,
        items: result.items
      },
      message: `تم تنفيذ إذن الصرف #${transferNumber} بنجاح وخصم/إضافة الكميات تلقائياً`
    });
  } catch (err) {
    console.error('Create transfer error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
