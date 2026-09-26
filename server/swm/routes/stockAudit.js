const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');

/**
 * GET /api/swm/stock-audit
 * Retrieves comprehensive stock inventory sheet across branches or for a single branch.
 * Supports filtering by category, search keywords, and stock status.
 * Calculates financial valuations and KPIs for physical audit sheets.
 */
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager', 'supervisor']), async (req, res) => {
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
    const isExport = limit === 'all' || parseInt(limit, 10) === 0;
    const limitNum = isExport ? 5000 : Math.max(1, Math.min(250, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [`p.status = 'active'`];
    const params = [];
    let pIdx = 1;

    // Branch scoping: branch accounts are locked to their own branch
    const isBranchAccount = req.user.isBranchAccount ||
      (!['super_admin', 'admin', 'inventory_manager'].includes(req.user.role));
    const forcedBranchId = isBranchAccount ? req.user.branchId : null;
    const effectiveBranchId = forcedBranchId || (branch_id && branch_id !== 'all' && branch_id !== '' ? branch_id : null);

    // Branch filter
    let branchJoinSql = '';
    if (effectiveBranchId) {
      const bId = parseInt(effectiveBranchId, 10);
      branchJoinSql = `AND ib.branch_id = $${pIdx}`;
      params.push(bId);
      pIdx++;
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
        b.id AS branch_id,
        b.branch_name,
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

module.exports = router;
