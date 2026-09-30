const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');

/**
 * GET /api/swm/admin-journals
 * Comprehensive Executive Administrative Journals & Financials:
 * 1. Expenses: categorized breakdown (payroll by employee/branch, utility bills, other operating expenses).
 * 2. Administrative Operations: stock transfers, supplier payments, purchase additions.
 *    Branch Net Inflow: sales minus expenses, broken down into (cash, visa, transfers).
 * 3. Profitability (P&L):
 *    - Revenue: total sales inflow
 *    - Cost of Goods Sold (COGS)
 *    - Gross Profit: Revenue - COGS
 *    - Operating Expenses: salaries, rent, ads, packaging, etc.
 *    - Net Profit (Actual Gain): Gross Profit - Operating Expenses
 */
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), async (req, res) => {
  try {
    const {
      branch_id,
      start_date,
      end_date,
      date,
      expense_category = 'all'
    } = req.query;

    // Date range determination
    let startDateVal = null;
    let endDateVal = null;

    if (start_date && end_date) {
      startDateVal = start_date;
      endDateVal = end_date;
    } else if (date) {
      startDateVal = date;
      endDateVal = date;
    } else {
      // Default: current month from day 1 to today
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      startDateVal = `${y}-${m}-01`;
      endDateVal = `${y}-${m}-${d}`;
    }

    const branchFilter = branch_id && branch_id !== 'all' ? parseInt(branch_id, 10) : null;

    // ==========================================
    // 1. EXPENSES & PAYROLL ANALYSIS
    // ==========================================
    const expWhere = [`e.status = 'approved'`];
    const expParams = [];
    let epIdx = 1;

    expWhere.push(`DATE(e.expense_date) >= $${epIdx++}`);
    expParams.push(startDateVal);

    expWhere.push(`DATE(e.expense_date) <= $${epIdx++}`);
    expParams.push(endDateVal);

    if (branchFilter) {
      expWhere.push(`e.branch_id = $${epIdx++}`);
      expParams.push(branchFilter);
    }

    const expWhereSql = `WHERE ${expWhere.join(' AND ')}`;

    // Raw expenses list
    const rawExpensesSql = `
      SELECT e.*,
             b.branch_name, b.branch_code,
             u.full_name AS recorded_by_name,
             u.username AS recorded_by_username
      FROM expenses e
      JOIN branches b ON b.id = e.branch_id
      LEFT JOIN users u ON u.id = e.recorded_by
      ${expWhereSql}
      ORDER BY e.expense_date DESC, e.id DESC
    `;
    const allExpenses = await query(rawExpensesSql, expParams);

    // Filter by expense category if specified
    let filteredExpenses = allExpenses;
    if (expense_category && expense_category !== 'all') {
      if (expense_category === 'payroll') {
        filteredExpenses = allExpenses.filter(e =>
          ['payroll', 'sales_withdrawal'].includes(e.category) ||
          (e.description && (e.description.includes('سحب بائع') || e.description.includes('راتب') || e.description.includes('قبض')))
        );
      } else if (expense_category === 'utility_bill') {
        filteredExpenses = allExpenses.filter(e =>
          e.category === 'utility_bill' ||
          ['water', 'electricity', 'rent', 'internet', 'gas'].includes(e.subcategory)
        );
      } else if (expense_category === 'other') {
        filteredExpenses = allExpenses.filter(e =>
          !['payroll', 'sales_withdrawal', 'utility_bill'].includes(e.category) &&
          !['water', 'electricity', 'rent', 'internet', 'gas'].includes(e.subcategory)
        );
      }
    }

    // Categorized expense metrics
    let totalExpenses = 0;
    let totalPayroll = 0;
    let totalBills = 0;
    let totalRent = 0;
    let totalMarketing = 0;
    let totalPackaging = 0;
    let totalOther = 0;

    // Payroll by employee / salesperson aggregation map
    const payrollByEmployeeMap = {};

    for (const exp of allExpenses) {
      const amt = parseFloat(exp.amount || 0);
      totalExpenses += amt;

      const cat = exp.category;
      const sub = exp.subcategory || '';
      const desc = exp.description || '';

      const isPayroll = ['payroll', 'sales_withdrawal'].includes(cat) ||
        desc.includes('سحب بائع') || desc.includes('راتب') || desc.includes('قبض');
      const isBill = cat === 'utility_bill' || ['water', 'electricity', 'internet', 'gas'].includes(sub);
      const isRent = sub === 'rent' || desc.includes('إيجار') || desc.includes('ايجار');
      const isMarketing = sub === 'marketing' || sub === 'ads' || desc.includes('إعلان') || desc.includes('اعلان') || desc.includes('تسويق');
      const isPackaging = sub === 'packaging' || sub === 'shipping' || desc.includes('تغليف') || desc.includes('شحن');

      if (isPayroll) {
        totalPayroll += amt;

        // Extract employee name from description or recorded_by
        let empKey = exp.recorded_by_name || 'موظف غير محدد';
        if (desc.includes('المستلم:')) {
          const match = desc.match(/المستلم:\s*([^\s-]+(?:\s+[^\s-]+)*)/);
          if (match && match[1]) empKey = match[1].trim();
        } else if (desc.includes('سحب بائع:')) {
          const match = desc.match(/سحب بائع:\s*([^\s-]+(?:\s+[^\s-]+)*)/);
          if (match && match[1]) empKey = match[1].trim();
        }

        const mapKey = `${exp.branch_id}-${empKey}`;
        if (!payrollByEmployeeMap[mapKey]) {
          payrollByEmployeeMap[mapKey] = {
            employee_name: empKey,
            branch_id: exp.branch_id,
            branch_name: exp.branch_name,
            total_amount: 0,
            transactions_count: 0
          };
        }
        payrollByEmployeeMap[mapKey].total_amount += amt;
        payrollByEmployeeMap[mapKey].transactions_count += 1;
      } else if (isRent) {
        totalRent += amt;
      } else if (isMarketing) {
        totalMarketing += amt;
      } else if (isPackaging) {
        totalPackaging += amt;
      } else if (isBill) {
        totalBills += amt;
      } else {
        totalOther += amt;
      }
    }

    const payrollByEmployee = Object.values(payrollByEmployeeMap).sort((a, b) => b.total_amount - a.total_amount);

    // ==========================================
    // 2. ADMINISTRATIVE OPERATIONS
    // ==========================================

    // 2.1 Stock Transfers
    const transWhere = [];
    const transParams = [];
    let tpIdx = 1;

    transWhere.push(`DATE(st.transfer_date) >= $${tpIdx++}`);
    transParams.push(startDateVal);

    transWhere.push(`DATE(st.transfer_date) <= $${tpIdx++}`);
    transParams.push(endDateVal);

    if (branchFilter) {
      transWhere.push(`(st.from_branch_id = $${tpIdx} OR st.to_branch_id = $${tpIdx})`);
      transParams.push(branchFilter);
      tpIdx++;
    }

    const transWhereSql = transWhere.length > 0 ? `WHERE ${transWhere.join(' AND ')}` : '';
    const transfersSql = `
      SELECT st.*,
             fb.branch_name AS from_branch_name, fb.branch_code AS from_branch_code,
             tb.branch_name AS to_branch_name, tb.branch_code AS to_branch_code,
             u.full_name AS created_by_name
      FROM stock_transfers st
      JOIN branches fb ON fb.id = st.from_branch_id
      JOIN branches tb ON tb.id = st.to_branch_id
      LEFT JOIN users u ON u.id = st.created_by
      ${transWhereSql}
      ORDER BY st.transfer_date DESC, st.id DESC
      LIMIT 5000
    `;
    const transfers = await query(transfersSql, transParams);

    // 2.2 Supplier Payments
    const payWhere = [];
    const payParams = [];
    let ppIdx = 1;

    payWhere.push(`DATE(sp.payment_date) >= $${ppIdx++}`);
    payParams.push(startDateVal);

    payWhere.push(`DATE(sp.payment_date) <= $${ppIdx++}`);
    payParams.push(endDateVal);

    const payWhereSql = payWhere.length > 0 ? `WHERE ${payWhere.join(' AND ')}` : '';
    const paymentsSql = `
      SELECT sp.*,
             s.supplier_name, s.phone AS supplier_phone,
             pi.invoice_number,
             u.full_name AS recorded_by_name
      FROM supplier_payments sp
      JOIN suppliers s ON s.id = sp.supplier_id
      LEFT JOIN purchase_invoices pi ON pi.id = sp.invoice_id
      LEFT JOIN users u ON u.id = sp.recorded_by
      ${payWhereSql}
      ORDER BY sp.payment_date DESC, sp.id DESC
      LIMIT 5000
    `;
    const supplierPayments = await query(paymentsSql, payParams);

    // 2.3 Purchase Invoices
    const purWhere = [];
    const purParams = [];
    let purIdx = 1;

    purWhere.push(`DATE(pi.invoice_date) >= $${purIdx++}`);
    purParams.push(startDateVal);

    purWhere.push(`DATE(pi.invoice_date) <= $${purIdx++}`);
    purParams.push(endDateVal);

    if (branchFilter) {
      purWhere.push(`pi.warehouse_branch_id = $${purIdx++}`);
      purParams.push(branchFilter);
    }

    const purWhereSql = purWhere.length > 0 ? `WHERE ${purWhere.join(' AND ')}` : '';
    const purchasesSql = `
      SELECT pi.*,
             s.supplier_name,
             b.branch_name AS warehouse_name,
             u.full_name AS created_by_name
      FROM purchase_invoices pi
      JOIN suppliers s ON s.id = pi.supplier_id
      LEFT JOIN branches b ON b.id = pi.warehouse_branch_id
      LEFT JOIN users u ON u.id = pi.created_by
      ${purWhereSql}
      ORDER BY pi.invoice_date DESC, pi.id DESC
      LIMIT 5000
    `;
    const purchaseInvoices = await query(purchasesSql, purParams);

    // 2.4 Stock Adjustments / Reconciliations (سندات التسوية المخزنية)
    const adjWhere = [];
    const adjParams = [];
    let apIdx = 1;

    adjWhere.push(`DATE(sa.adjustment_date) >= $${apIdx++}`);
    adjParams.push(startDateVal);

    adjWhere.push(`DATE(sa.adjustment_date) <= $${apIdx++}`);
    adjParams.push(endDateVal);

    if (branchFilter) {
      adjWhere.push(`sa.branch_id = $${apIdx++}`);
      adjParams.push(branchFilter);
    }

    const adjWhereSql = adjWhere.length > 0 ? `WHERE ${adjWhere.join(' AND ')}` : '';
    const adjustmentsSql = `
      SELECT sa.*,
             b.branch_name, b.branch_code,
             u.full_name AS created_by_name,
             au.full_name AS approved_by_name
      FROM stock_adjustments sa
      JOIN branches b ON b.id = sa.branch_id
      LEFT JOIN users u ON u.id = sa.created_by
      LEFT JOIN users au ON au.id = sa.approved_by
      ${adjWhereSql}
      ORDER BY sa.adjustment_date DESC, sa.id DESC
      LIMIT 5000
    `;
    const stockAdjustments = await query(adjustmentsSql, adjParams);

    // 2.5 Branch Cash Transfers to Main Safe (تحويلات الفروع للخزنة الرئيسية)
    const cashWhere = [];
    const cashParams = [];
    let cpIdx = 1;

    cashWhere.push(`DATE(ct.requested_at) >= $${cpIdx++}`);
    cashParams.push(startDateVal);

    cashWhere.push(`DATE(ct.requested_at) <= $${cpIdx++}`);
    cashParams.push(endDateVal);

    if (branchFilter) {
      cashWhere.push(`(ct.from_branch_id = $${cpIdx} OR ct.to_branch_id = $${cpIdx})`);
      cashParams.push(branchFilter);
      cpIdx++;
    }

    const cashWhereSql = cashWhere.length > 0 ? `WHERE ${cashWhere.join(' AND ')}` : '';
    const cashTransfersSql = `
      SELECT ct.*,
             fb.branch_name AS from_branch_name, fb.branch_code AS from_branch_code,
             tb.branch_name AS to_branch_name, tb.branch_code AS to_branch_code,
             ru.full_name AS requested_by_name, ru.username AS requested_by_username,
             cu.full_name AS confirmed_by_name
      FROM cash_transfers ct
      JOIN branches fb ON fb.id = ct.from_branch_id
      JOIN branches tb ON tb.id = ct.to_branch_id
      JOIN users ru ON ru.id = ct.requested_by
      LEFT JOIN users cu ON cu.id = ct.confirmed_by
      ${cashWhereSql}
      ORDER BY ct.requested_at DESC, ct.id DESC
      LIMIT 5000
    `;
    const cashTransfers = await query(cashTransfersSql, cashParams);

    // 2.6 Consolidated All Administrative Operations Unified Timeline
    const allOperations = [
      ...stockAdjustments.map(sa => ({
        id: `adj-${sa.id}`,
        raw_id: sa.id,
        operation_type: 'stock_adjustment',
        operation_title: 'سند تسوية مخزنية',
        reference_no: sa.adjustment_number,
        date: sa.adjustment_date,
        branch_name: sa.branch_name,
        branch_id: sa.branch_id,
        amount: parseFloat(sa.total_variance_cost || 0),
        quantity_impact: parseInt(sa.net_qty_change || 0, 10),
        surplus_qty: parseInt(sa.total_surplus_qty || 0, 10),
        deficit_qty: parseInt(sa.total_deficit_qty || 0, 10),
        status: sa.status,
        user_name: sa.approved_by_name || sa.created_by_name || 'المسؤول الإداري',
        notes: sa.reason || sa.notes || 'تسوية فروقات جرد',
        badge_color: 'purple'
      })),
      ...cashTransfers.map(ct => ({
        id: `ct-${ct.id}`,
        raw_id: ct.id,
        operation_type: 'cash_transfer',
        operation_title: 'تحويل نقدية للخزنة الرئيسية',
        reference_no: ct.reference_no,
        date: ct.requested_at,
        branch_name: `${ct.from_branch_name} ➔ ${ct.to_branch_name}`,
        branch_id: ct.from_branch_id,
        amount: parseFloat(ct.amount || 0),
        quantity_impact: null,
        status: ct.status,
        user_name: ct.confirmed_by_name ? `${ct.requested_by_name || 'المشرف'} (تأكيد: ${ct.confirmed_by_name})` : (ct.requested_by_name || 'مشرف الفرع'),
        notes: ct.notes || (ct.transfer_method === 'manual_cash' ? 'تسليم نقدية باليد' : 'تحويل إلكتروني'),
        badge_color: 'gold'
      })),
      ...supplierPayments.map(sp => ({
        id: `sp-${sp.id}`,
        raw_id: sp.id,
        operation_type: 'supplier_payment',
        operation_title: 'سداد دفعة لمورد',
        reference_no: sp.invoice_number ? `فاتورة #${sp.invoice_number}` : `سداد #${sp.id}`,
        date: sp.payment_date,
        branch_name: sp.supplier_name,
        branch_id: null,
        amount: parseFloat(sp.amount || 0),
        quantity_impact: null,
        status: 'completed',
        user_name: sp.recorded_by_name || 'مسؤول الحسابات',
        notes: sp.notes || `سداد ${sp.payment_method === 'cash' ? 'نقدي (كاش)' : sp.payment_method}`,
        badge_color: 'cyan'
      })),
      ...transfers.map(st => ({
        id: `st-${st.id}`,
        raw_id: st.id,
        operation_type: 'stock_transfer',
        operation_title: 'إذن صرف / نقل بين المخازن',
        reference_no: st.transfer_number,
        date: st.transfer_date,
        branch_name: `${st.from_branch_name} ➔ ${st.to_branch_name}`,
        branch_id: st.from_branch_id,
        amount: 0,
        quantity_impact: parseInt(st.total_items || 0, 10),
        status: st.status,
        user_name: st.created_by_name || 'مسؤول المستودع',
        notes: st.notes || `نقل بضائع (${st.total_items} صنف)`,
        badge_color: 'blue'
      })),
      ...purchaseInvoices.map(pi => ({
        id: `pi-${pi.id}`,
        raw_id: pi.id,
        operation_type: 'purchase_invoice',
        operation_title: 'فاتورة شراء واستلام بضاعة',
        reference_no: pi.invoice_number,
        date: pi.invoice_date,
        branch_name: `${pi.supplier_name} ➔ ${pi.warehouse_name || 'المستودع الرئيسي'}`,
        branch_id: pi.warehouse_branch_id,
        amount: parseFloat(pi.final_amount || 0),
        quantity_impact: null,
        status: pi.status || 'completed',
        user_name: pi.created_by_name || 'مسؤول التوريد',
        notes: `توريد بضاعة (مدفوع: ${parseFloat(pi.paid_amount || 0).toLocaleString()} ج.م)`,
        badge_color: 'green'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // ==========================================
    // 3. BRANCH NET INFLOW & PAYMENT BREAKDOWN
    // ==========================================
    const invWhere = [`si.status = 'completed'`];
    const invParams = [];
    let ipIdx = 1;

    invWhere.push(`DATE(si.invoice_date) >= $${ipIdx++}`);
    invParams.push(startDateVal);

    invWhere.push(`DATE(si.invoice_date) <= $${endDateVal ? ipIdx++ : ipIdx}`);
    invParams.push(endDateVal);

    if (branchFilter) {
      invWhere.push(`si.branch_id = $${ipIdx++}`);
      invParams.push(branchFilter);
    }

    const invWhereSql = `WHERE ${invWhere.join(' AND ')}`;

    // Invoices list with item costs for Gross Profit & COGS
    const salesInvoicesSql = `
      SELECT si.id, si.invoice_number, si.branch_id, si.invoice_date,
             si.final_amount, si.payment_breakdown,
             b.branch_name, b.branch_code
      FROM swm_sales_invoices si
      JOIN branches b ON b.id = si.branch_id
      ${invWhereSql}
    `;
    const salesInvoices = await query(salesInvoicesSql, invParams);

    // Compute Sales COGS (Cost of goods sold) for invoices
    const cogsSql = `
      SELECT COALESCE(SUM(sii.quantity * COALESCE(sii.cost_at_sale, p.cost_price, 0)), 0) AS total_cogs
      FROM swm_sales_invoice_items sii
      JOIN swm_sales_invoices si ON si.id = sii.invoice_id
      LEFT JOIN products p ON p.id = sii.product_id
      ${invWhereSql}
    `;
    const [cogsRes] = await query(cogsSql, invParams);
    const totalCOGS = parseFloat(cogsRes?.total_cogs || 0);

    // Compute Branch-by-branch Net Inflow after expenses, broken down into (Cash, Cards, Transfers)
    let totalSalesRevenue = 0;
    let totalCashSales = 0;
    let totalCardSales = 0;
    let totalTransferSales = 0;

    const branchInflowMap = {};

    // Initialize branch inflow map with known branches
    const allBranches = await query(`SELECT id, branch_name, branch_code, branch_type FROM branches WHERE status = 'active' ORDER BY id ASC`);
    for (const b of allBranches) {
      if (!branchFilter || branchFilter === b.id) {
        branchInflowMap[b.id] = {
          branch_id: b.id,
          branch_name: b.branch_name,
          branch_code: b.branch_code,
          branch_type: b.branch_type,
          sales_revenue: 0,
          cash_sales: 0,
          card_sales: 0,
          transfer_sales: 0,
          invoices_count: 0,
          branch_expenses: 0,
          cash_expenses: 0,
          net_inflow: 0,
          net_cash: 0
        };
      }
    }

    // Process Sales Invoices
    for (const inv of salesInvoices) {
      const amt = parseFloat(inv.final_amount || 0);
      totalSalesRevenue += amt;

      const br = branchInflowMap[inv.branch_id];
      if (br) {
        br.sales_revenue += amt;
        br.invoices_count += 1;
      }

      // Breakdown parsing
      let bdown = inv.payment_breakdown;
      if (typeof bdown === 'string') {
        try { bdown = JSON.parse(bdown); } catch (e) { bdown = null; }
      }

      let cashPart = 0;
      let cardPart = 0;
      let transferPart = 0;

      if (bdown && typeof bdown === 'object') {
        cashPart = parseFloat(bdown.cash || 0);
        cardPart = parseFloat(bdown.card || bdown.visa || 0);
        transferPart = parseFloat(bdown.transfer || bdown.instapay || bdown.wallet || 0);
      } else {
        cashPart = amt; // Default to cash if no breakdown
      }

      totalCashSales += cashPart;
      totalCardSales += cardPart;
      totalTransferSales += transferPart;

      if (br) {
        br.cash_sales += cashPart;
        br.card_sales += cardPart;
        br.transfer_sales += transferPart;
      }
    }

    // Process Expenses per branch
    for (const exp of allExpenses) {
      const amt = parseFloat(exp.amount || 0);
      const br = branchInflowMap[exp.branch_id];
      if (br) {
        br.branch_expenses += amt;
        // All cash register / withdrawals are cash expenses
        br.cash_expenses += amt;
      }
    }

    // Compute Net Inflows per branch
    const branchInflows = Object.values(branchInflowMap).map(b => {
      const net = b.sales_revenue - b.branch_expenses;
      const netCash = b.cash_sales - b.cash_expenses;
      return {
        ...b,
        net_inflow: Math.round(net * 100) / 100,
        net_cash: Math.round(netCash * 100) / 100
      };
    }).sort((a, b) => b.sales_revenue - a.sales_revenue);

    // ==========================================
    // 4. PROFITABILITY & P&L STATEMENT
    // ==========================================
    // Formula per requirements:
    // Revenue = Total sales money in
    // Gross Profit = Revenue - COGS
    // Net Profit (Actual Gain) = Gross Profit - Operating Expenses
    const grossProfit = totalSalesRevenue - totalCOGS;
    const grossMarginPct = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

    const operatingExpenses = totalExpenses;
    const netProfit = grossProfit - operatingExpenses;
    const netMarginPct = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

    return res.json({
      success: true,
      data: {
        filter: {
          startDate: startDateVal,
          endDate: endDateVal,
          branchId: branchFilter
        },
        // Section A: Expenses
        expenses: {
          items: filteredExpenses,
          summary: {
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            totalPayroll: Math.round(totalPayroll * 100) / 100,
            totalBills: Math.round(totalBills * 100) / 100,
            totalRent: Math.round(totalRent * 100) / 100,
            totalMarketing: Math.round(totalMarketing * 100) / 100,
            totalPackaging: Math.round(totalPackaging * 100) / 100,
            totalOther: Math.round(totalOther * 100) / 100,
            count: filteredExpenses.length
          },
          payrollByEmployee
        },
        // Section B: Administrative Operations & Branch Net Inflow
        operations: {
          allOperations,
          stockAdjustments,
          cashTransfers,
          transfers,
          supplierPayments,
          purchaseInvoices,
          branchInflows,
          summary: {
            totalAllOperationsCount: allOperations.length,
            totalStockAdjustmentsCount: stockAdjustments.length,
            totalStockAdjustmentsCost: stockAdjustments.reduce((s, a) => s + parseFloat(a.total_variance_cost || 0), 0),
            totalCashTransfersCount: cashTransfers.length,
            totalCashTransfersAmount: cashTransfers.reduce((s, c) => s + parseFloat(c.amount || 0), 0),
            totalTransfersCount: transfers.length,
            totalSupplierPaymentsAmount: supplierPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0),
            totalPurchasesAmount: purchaseInvoices.reduce((s, p) => s + parseFloat(p.final_amount || 0), 0),
            totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            netBranchInflow: Math.round((totalSalesRevenue - totalExpenses) * 100) / 100,
            // Net payment breakdown across branches
            netCash: Math.round((totalCashSales - totalExpenses) * 100) / 100,
            totalCashSales: Math.round(totalCashSales * 100) / 100,
            totalCardSales: Math.round(totalCardSales * 100) / 100,
            totalTransferSales: Math.round(totalTransferSales * 100) / 100
          }
        },
        // Section C: Profitability (P&L)
        profitability: {
          revenue: Math.round(totalSalesRevenue * 100) / 100,
          cogs: Math.round(totalCOGS * 100) / 100,
          grossProfit: Math.round(grossProfit * 100) / 100,
          grossMarginPct: Math.round(grossMarginPct * 10) / 10,
          operatingExpenses: Math.round(operatingExpenses * 100) / 100,
          operatingExpensesBreakdown: {
            payroll: Math.round(totalPayroll * 100) / 100,
            rent: Math.round(totalRent * 100) / 100,
            marketing: Math.round(totalMarketing * 100) / 100,
            packaging: Math.round(totalPackaging * 100) / 100,
            utilities: Math.round(totalBills * 100) / 100,
            other: Math.round(totalOther * 100) / 100
          },
          netProfit: Math.round(netProfit * 100) / 100,
          netMarginPct: Math.round(netMarginPct * 10) / 10
        }
      }
    });
  } catch (err) {
    console.error('Admin Journals error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/swm/admin-journals/expense
 * Quick creation of administrative expense (payroll, utility bill, operating expense)
 */
router.post('/expense', requireAuth, requireRole(['super_admin', 'admin', 'inventory_manager']), async (req, res) => {
  try {
    const {
      branch_id,
      category, // 'payroll' | 'utility_bill' | 'rent' | 'marketing' | 'packaging' | 'other'
      subcategory,
      amount,
      description,
      recipient_name,
      expense_date
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال مبلغ صحيح للمصروف' });
    }
    if (!branch_id) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد الفرع المعني بالمصروف' });
    }

    const expDate = expense_date || new Date().toISOString().split('T')[0];
    const expRef = `EXP-ADM-${Date.now().toString().slice(-6)}`;
    const fullDesc = recipient_name ? `المستلم: ${recipient_name} — ${description || ''}` : (description || '');

    const insertSql = `
      INSERT INTO expenses (
        expense_ref, branch_id, category, subcategory, amount, description,
        expense_date, recorded_by, status, approved_by, approved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9, NOW())
      RETURNING *
    `;

    const [saved] = await query(insertSql, [
      expRef,
      parseInt(branch_id, 10),
      category || 'other',
      subcategory || null,
      parsedAmount,
      fullDesc,
      expDate,
      req.user.id,
      req.user.id
    ]);

    return res.status(201).json({
      success: true,
      message: 'تم تسجيل المصروف الإداري بنجاح',
      data: saved
    });
  } catch (err) {
    console.error('Create admin expense error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
