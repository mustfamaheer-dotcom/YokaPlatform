const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');

/**
 * GET /api/swm/branches-daily
 * Aggregated daily branches summary for Admin & Super Admin:
 * - KPIs: Total Inflow (Sales), Total Outflow (Expenses), Net Cashflow, Invoices Count, Items Sold
 * - Payment breakdown: Cash, Visa/Cards, Transfers (InstaPay / E-Wallets)
 * - Branch-by-branch comparison summary
 * - Detailed paginated sales invoices list with cashier and customer info
 */
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), async (req, res) => {
  try {
    const {
      branch_id,
      date,
      start_date,
      end_date,
      start_time,
      end_time,
      payment_method,
      salesperson_id,
      page = 1,
      limit = 25
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    // Build date filters
    let startDateVal = null;
    let endDateVal = null;

    if (start_date && end_date) {
      startDateVal = start_date;
      endDateVal = end_date;
    } else if (date) {
      startDateVal = date;
      endDateVal = date;
    } else {
      // Default to today
      const today = new Date().toISOString().split('T')[0];
      startDateVal = today;
      endDateVal = today;
    }

    // Parameters and where clauses for Invoices
    const invWhere = [`si.status = 'completed'`];
    const invParams = [];
    let pIdx = 1;

    // Date range filter
    invWhere.push(`DATE(si.invoice_date) >= $${pIdx}`);
    invParams.push(startDateVal);
    pIdx++;

    invWhere.push(`DATE(si.invoice_date) <= $${pIdx}`);
    invParams.push(endDateVal);
    pIdx++;

    // Time of day filter (optional)
    if (start_time && start_time.trim()) {
      invWhere.push(`si.invoice_date::time >= $${pIdx}::time`);
      invParams.push(start_time.trim());
      pIdx++;
    }
    if (end_time && end_time.trim()) {
      invWhere.push(`si.invoice_date::time <= $${pIdx}::time`);
      invParams.push(end_time.trim());
      pIdx++;
    }

    // Branch filter
    if (branch_id && branch_id !== 'all' && branch_id !== '') {
      invWhere.push(`si.branch_id = $${pIdx}`);
      invParams.push(parseInt(branch_id, 10));
      pIdx++;
    }

    // Salesperson filter
    if (salesperson_id && salesperson_id.trim()) {
      invWhere.push(`si.salesperson_id = $${pIdx}`);
      invParams.push(parseInt(salesperson_id, 10));
      pIdx++;
    }

    const invWhereSql = invWhere.length > 0 ? `WHERE ${invWhere.join(' AND ')}` : '';

    // Parameters and where clauses for Expenses
    const expWhere = [`e.status = 'approved'`];
    const expParams = [];
    let epIdx = 1;

    expWhere.push(`DATE(e.expense_date) >= $${epIdx}`);
    expParams.push(startDateVal);
    epIdx++;

    expWhere.push(`DATE(e.expense_date) <= $${epIdx}`);
    expParams.push(endDateVal);
    epIdx++;

    if (branch_id && branch_id !== 'all' && branch_id !== '') {
      expWhere.push(`e.branch_id = $${epIdx}`);
      expParams.push(parseInt(branch_id, 10));
      epIdx++;
    }

    const expWhereSql = expWhere.length > 0 ? `WHERE ${expWhere.join(' AND ')}` : '';

    // 1. Fetch Invoices for Aggregation and Calculations
    const allFilteredInvoicesSql = `
      SELECT si.id, si.invoice_number, si.branch_id, si.salesperson_id,
             si.customer_name, si.customer_phone, si.invoice_date,
             si.subtotal, si.discount_amount, si.tax_amount, si.final_amount,
             si.payment_breakdown, si.status,
             b.branch_name, b.branch_code, b.branch_type,
             u.full_name AS cashier_name, u.username AS cashier_username,
             COALESCE(item_stats.items_count, 0) AS items_count,
             COALESCE(item_stats.total_qty, 0) AS total_qty
      FROM swm_sales_invoices si
      JOIN branches b ON b.id = si.branch_id
      LEFT JOIN users u ON u.id = si.salesperson_id
      LEFT JOIN (
        SELECT invoice_id, COUNT(id) AS items_count, SUM(quantity) AS total_qty
        FROM swm_sales_invoice_items
        GROUP BY invoice_id
      ) item_stats ON item_stats.invoice_id = si.id
      ${invWhereSql}
      ORDER BY si.invoice_date DESC, si.id DESC
    `;

    const allInvoices = await query(allFilteredInvoicesSql, invParams);

    // 2. Fetch Expenses for the same scope
    const expensesSql = `
      SELECT e.id, e.branch_id, e.amount, e.category, e.description, e.expense_date,
             b.branch_name, b.branch_code, b.branch_type
      FROM expenses e
      JOIN branches b ON b.id = e.branch_id
      ${expWhereSql}
      ORDER BY e.expense_date DESC
    `;
    const allExpenses = await query(expensesSql, expParams);

    // 3. Compute High-Level Financial KPIs
    let totalInflow = 0;
    let totalItemsSold = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let transferTotal = 0;
    let cashCount = 0;
    let cardCount = 0;
    let transferCount = 0;

    // Branch breakdown map
    const branchMap = {};

    for (const inv of allInvoices) {
      const amt = parseFloat(inv.final_amount || 0);
      const qty = parseInt(inv.total_qty || 0, 10);
      totalInflow += amt;
      totalItemsSold += qty;

      let bd = inv.payment_breakdown;
      if (typeof bd === 'string') {
        try { bd = JSON.parse(bd); } catch (e) { bd = {}; }
      }

      let invCash = 0;
      let invCard = 0;
      let invTransfer = 0;

      if (bd && typeof bd === 'object' && Object.keys(bd).length > 0) {
        invCash = parseFloat(bd.cash || 0);
        invCard = parseFloat(bd.card || bd.visa || 0);
        invTransfer = parseFloat(bd.transfer || bd.bank_transfer || bd.e_wallet || 0);
      } else {
        // Fallback default is cash
        invCash = amt;
      }

      cashTotal += invCash;
      cardTotal += invCard;
      transferTotal += invTransfer;

      if (invCash > 0) cashCount++;
      if (invCard > 0) cardCount++;
      if (invTransfer > 0) transferCount++;

      // Track by branch
      const bId = inv.branch_id;
      if (!branchMap[bId]) {
        branchMap[bId] = {
          branch_id: bId,
          branch_name: inv.branch_name,
          branch_code: inv.branch_code,
          branch_type: inv.branch_type,
          invoices_count: 0,
          items_sold: 0,
          total_inflow: 0,
          total_outflow: 0,
          net_cashflow: 0,
          cash: 0,
          card: 0,
          transfer: 0
        };
      }
      branchMap[bId].invoices_count += 1;
      branchMap[bId].items_sold += qty;
      branchMap[bId].total_inflow += amt;
      branchMap[bId].cash += invCash;
      branchMap[bId].card += invCard;
      branchMap[bId].transfer += invTransfer;
    }

    // Compute Expenses
    let totalOutflow = 0;
    for (const exp of allExpenses) {
      const eAmt = parseFloat(exp.amount || 0);
      totalOutflow += eAmt;

      const bId = exp.branch_id;
      if (!branchMap[bId]) {
        branchMap[bId] = {
          branch_id: bId,
          branch_name: exp.branch_name,
          branch_code: exp.branch_code,
          branch_type: exp.branch_type || 'retail_branch',
          invoices_count: 0,
          items_sold: 0,
          total_inflow: 0,
          total_outflow: 0,
          net_cashflow: 0,
          cash: 0,
          card: 0,
          transfer: 0
        };
      }
      branchMap[bId].total_outflow += eAmt;
    }

    // Finalize net cashflow per branch
    const branchesSummary = Object.values(branchMap).map(b => ({
      ...b,
      net_cashflow: b.total_inflow - b.total_outflow
    })).sort((a, b) => b.total_inflow - a.total_inflow);

    const netCashflow = totalInflow - totalOutflow;

    // Optional Filter by Payment Method on in-memory invoices list
    let filteredInvoices = allInvoices;
    if (payment_method && payment_method !== 'all') {
      filteredInvoices = allInvoices.filter(inv => {
        let bd = inv.payment_breakdown;
        if (typeof bd === 'string') {
          try { bd = JSON.parse(bd); } catch (e) { bd = {}; }
        }
        if (!bd || typeof bd !== 'object') return payment_method === 'cash';
        if (payment_method === 'cash') return (parseFloat(bd.cash) || 0) > 0;
        if (payment_method === 'card') return (parseFloat(bd.card) || parseFloat(bd.visa) || 0) > 0;
        if (payment_method === 'transfer') return (parseFloat(bd.transfer) || parseFloat(bd.bank_transfer) || parseFloat(bd.e_wallet) || 0) > 0;
        return true;
      });
    }

    const totalInvoicesCount = filteredInvoices.length;
    const paginatedInvoices = filteredInvoices.slice(offset, offset + limitNum);

    // Compute payment breakdown percentages
    const validInflow = totalInflow > 0 ? totalInflow : 1;
    const paymentBreakdown = {
      cash: {
        amount: Math.round(cashTotal * 100) / 100,
        percentage: totalInflow > 0 ? Math.round((cashTotal / validInflow) * 1000) / 10 : 0,
        count: cashCount
      },
      card: {
        amount: Math.round(cardTotal * 100) / 100,
        percentage: totalInflow > 0 ? Math.round((cardTotal / validInflow) * 1000) / 10 : 0,
        count: cardCount
      },
      transfer: {
        amount: Math.round(transferTotal * 100) / 100,
        percentage: totalInflow > 0 ? Math.round((transferTotal / validInflow) * 1000) / 10 : 0,
        count: transferCount
      }
    };

    return res.json({
      success: true,
      data: {
        filter: {
          branch_id: branch_id || 'all',
          start_date: startDateVal,
          end_date: endDateVal,
          start_time: start_time || null,
          end_time: end_time || null,
          payment_method: payment_method || 'all'
        },
        kpi: {
          totalInflow: Math.round(totalInflow * 100) / 100,
          totalOutflow: Math.round(totalOutflow * 100) / 100,
          netCashflow: Math.round(netCashflow * 100) / 100,
          invoicesCount: allInvoices.length,
          totalItemsSold
        },
        paymentBreakdown,
        branchesSummary,
        invoices: paginatedInvoices,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalInvoicesCount,
          totalPages: Math.ceil(totalInvoicesCount / limitNum)
        }
      }
    });
  } catch (err) {
    console.error('Branches Daily Overview error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
