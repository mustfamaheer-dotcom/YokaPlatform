const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireBranchScope } = require('../../shared/authMiddleware');

/**
 * GET /api/swm/analytics/overview
 * Returns comprehensive business intelligence: Top Products, Payment Methods,
 * Sales Trend, Geographic Demand, and Strategic KPIs for decision making.
 */
router.get('/overview', requireAuth, requireBranchScope, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const { days, startDate, endDate } = req.query;

    // Filter date condition for ECP orders and POS invoices
    let ecpDateCondition = '';
    let posDateCondition = '';
    const dateParams = [];

    if (startDate && endDate) {
      ecpDateCondition = `AND o.created_at >= ? AND o.created_at <= ?`;
      posDateCondition = `AND si.invoice_date >= ? AND si.invoice_date <= ?`;
      dateParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else if (startDate) {
      ecpDateCondition = `AND o.created_at >= ?`;
      posDateCondition = `AND si.invoice_date >= ?`;
      dateParams.push(`${startDate} 00:00:00`);
    } else if (endDate) {
      ecpDateCondition = `AND o.created_at <= ?`;
      posDateCondition = `AND si.invoice_date <= ?`;
      dateParams.push(`${endDate} 23:59:59`);
    } else if (days && days !== 'all') {
      const dayCount = parseInt(days, 10) || 30;
      ecpDateCondition = `AND o.created_at >= CURRENT_DATE - (? || ' days')::INTERVAL`;
      posDateCondition = `AND si.invoice_date >= CURRENT_DATE - (? || ' days')::INTERVAL`;
      dateParams.push(dayCount);
    }

    // Branch scoping condition:
    // Support 'all', 'retail' (all retail stores), 'ecom' / 'ecs' / '2' (ecom store), or specific branch ID
    const branchFilter = req.query.branch_id || req.scopedBranchId || 'all';

    let ecpBranchCondition = '';
    let posBranchCondition = '';

    if (branchFilter === 'retail') {
      // 100% pure retail in-store POS sales
      ecpBranchCondition = `AND 1=0`;
      posBranchCondition = `AND si.branch_id IN (SELECT id FROM branches WHERE branch_type = 'retail_branch')`;
    } else if (branchFilter === 'ecom' || branchFilter === 'ecs' || String(branchFilter) === '2') {
      // 100% pure online E-Commerce store orders
      ecpBranchCondition = ``;
      posBranchCondition = `AND 1=0`;
    } else if (branchFilter === 'all' || !branchFilter) {
      ecpBranchCondition = '';
      posBranchCondition = '';
    } else {
      const bId = parseInt(branchFilter, 10);
      ecpBranchCondition = `AND o.fulfilling_branch_id = ${bId}`;
      posBranchCondition = `AND si.branch_id = ${bId}`;
    }

    // 1. Fetch ECP orders
    const ecpOrdersQuery = `
      SELECT o.id, o.order_number, o.total_amount, o.subtotal, o.shipping_cost,
             o.order_status, o.payment_status, o.payment_method,
             o.shipping_carrier, o.shipping_address, o.created_at, o.delivered_at
      FROM ecp_orders o
      WHERE o.order_status NOT IN ('cancelled', 'refunded')
      ${ecpDateCondition}
      ${ecpBranchCondition}
      ORDER BY o.created_at DESC
    `;
    const ecpOrders = await query(ecpOrdersQuery, dateParams);

    // 2. Fetch POS sales invoices
    const posInvoicesQuery = `
      SELECT si.id, si.invoice_number, si.final_amount, si.payment_breakdown,
             si.status, si.invoice_date, si.created_at
      FROM swm_sales_invoices si
      WHERE si.status = 'completed'
      ${posDateCondition}
      ${posBranchCondition}
      ORDER BY si.invoice_date DESC
    `;
    const posInvoices = await query(posInvoicesQuery, dateParams);

    // 3. Aggregate Top Selling Products
    const productsSql = `
      WITH all_items AS (
        SELECT oi.product_name,
               COALESCE(oi.product_sku, '') AS sku,
               oi.quantity,
               oi.line_total,
               'ecp' AS source
        FROM ecp_order_items oi
        JOIN ecp_orders o ON o.id = oi.order_id
        WHERE o.order_status NOT IN ('cancelled', 'refunded')
        ${ecpDateCondition}
        ${ecpBranchCondition}

        UNION ALL

        SELECT sii.product_name,
               COALESCE(sii.product_code, '') AS sku,
               sii.quantity,
               sii.line_total,
               'pos' AS source
        FROM swm_sales_invoice_items sii
        JOIN swm_sales_invoices si ON si.id = sii.invoice_id
        WHERE si.status = 'completed'
        ${posDateCondition}
        ${posBranchCondition}
      )
      SELECT product_name,
             MAX(sku) AS sku,
             SUM(quantity)::int AS units_sold,
             SUM(line_total)::numeric(12,2) AS total_revenue
      FROM all_items
      GROUP BY product_name
      ORDER BY units_sold DESC, total_revenue DESC
      LIMIT 15
    `;
    const rawTopProducts = await query(productsSql, [...dateParams, ...dateParams]);

    // 4. Calculate Combined Financial KPIs
    let totalRevenue = 0;
    let totalEcpRevenue = 0;
    let totalPosRevenue = 0;
    let totalDeliveredEcp = 0;

    for (const o of ecpOrders) {
      const amt = parseFloat(o.total_amount || 0);
      totalRevenue += amt;
      totalEcpRevenue += amt;
      if (o.order_status === 'delivered') {
        totalDeliveredEcp++;
      }
    }

    for (const inv of posInvoices) {
      const amt = parseFloat(inv.final_amount || 0);
      totalRevenue += amt;
      totalPosRevenue += amt;
    }

    const totalOrdersCount = ecpOrders.length + posInvoices.length;
    const averageOrderValue = totalOrdersCount > 0 ? (totalRevenue / totalOrdersCount) : 0;

    let totalUnitsSold = 0;
    for (const p of rawTopProducts) {
      totalUnitsSold += parseInt(p.units_sold || 0, 10);
    }

    const fulfillmentRate = ecpOrders.length > 0
      ? ((totalDeliveredEcp / ecpOrders.length) * 100)
      : 100;

    // Enhance top products with percentage of total revenue
    const topProducts = rawTopProducts.map((p, index) => {
      const rev = parseFloat(p.total_revenue || 0);
      const pct = totalRevenue > 0 ? ((rev / totalRevenue) * 100) : 0;
      return {
        rank: index + 1,
        name: p.product_name,
        sku: p.sku || 'N/A',
        units_sold: parseInt(p.units_sold || 0, 10),
        revenue: rev,
        revenue_percentage: parseFloat(pct.toFixed(1))
      };
    });

    const topPerformer = topProducts[0] || null;

    // 5. Fetch Configured Payment Methods from ecp_payment_methods
    const configuredPaymentMethods = await query(`
      SELECT id, method_key, name_ar, name_en, provider, account_number, account_name, instructions, requires_receipt, is_active, display_order
      FROM ecp_payment_methods
      ORDER BY display_order ASC, id ASC
    `);

    // Helper for provider brand colors
    const getProviderColor = (provider, key) => {
      const p = (provider || '').toLowerCase();
      const k = (key || '').toLowerCase();
      if (p === 'instapay' || k.includes('instapay')) return '#9333ea';
      if (p === 'vodafone' || k.includes('vodafone')) return '#e11d48';
      if (p === 'orange' || k.includes('orange')) return '#ea580c';
      if (p === 'etisalat' || k.includes('etisalat')) return '#16a34a';
      if (p === 'we' || k.includes('we')) return '#7c3aed';
      if (p === 'cash' || k === 'cod') return '#f59e0b';
      if (p === 'card' || k.includes('card') || k.includes('visa')) return '#2563eb';
      if (p === 'wallet' || k.includes('wallet')) return '#06b6d4';
      return '#64748b';
    };

    // Initialize map from configured methods
    const paymentMap = {};
    for (const pm of configuredPaymentMethods) {
      paymentMap[pm.method_key] = {
        key: pm.method_key,
        label: pm.name_ar || pm.name_en || pm.method_key,
        name_ar: pm.name_ar,
        name_en: pm.name_en,
        provider: pm.provider || 'custom',
        account_number: pm.account_number || null,
        account_name: pm.account_name || null,
        is_active: pm.is_active,
        is_configured: true,
        display_order: pm.display_order,
        color: getProviderColor(pm.provider, pm.method_key),
        amount: 0,
        count: 0
      };
    }

    // Aggregate from ECP Orders
    for (const o of ecpOrders) {
      const rawKey = (o.payment_method || 'cod').toLowerCase();
      const amt = parseFloat(o.total_amount || 0);

      // Try direct match or smart provider matching
      let targetKey = rawKey;
      if (!paymentMap[targetKey]) {
        const matchedConfig = configuredPaymentMethods.find(m =>
          m.method_key.toLowerCase() === rawKey ||
          (m.provider === 'vodafone' && (rawKey.includes('wallet') || rawKey.includes('vodafone'))) ||
          (m.provider === 'instapay' && rawKey.includes('instapay')) ||
          (m.provider === 'cash' && (rawKey === 'cod' || rawKey === 'cash'))
        );

        if (matchedConfig) {
          targetKey = matchedConfig.method_key;
        } else {
          // Unconfigured method fallback
          targetKey = rawKey;
          paymentMap[targetKey] = {
            key: targetKey,
            label: rawKey === 'cod' ? 'الدفع عند الاستلام (COD)' : rawKey,
            name_ar: rawKey,
            provider: 'custom',
            account_number: null,
            account_name: null,
            is_active: true,
            is_configured: false,
            color: getProviderColor(null, rawKey),
            amount: 0,
            count: 0
          };
        }
      }

      paymentMap[targetKey].amount += amt;
      paymentMap[targetKey].count += 1;
    }

    // Aggregate from POS Invoices into mapped methods or POS entries
    for (const inv of posInvoices) {
      const amt = parseFloat(inv.final_amount || 0);
      let bd = inv.payment_breakdown;
      if (typeof bd === 'string') {
        try { bd = JSON.parse(bd); } catch (e) { bd = {}; }
      }

      // POS Cash
      const posCashAmt = bd && bd.cash ? parseFloat(bd.cash) : (!bd || (!bd.card && !bd.transfer) ? amt : 0);
      if (posCashAmt > 0) {
        const cashMethod = configuredPaymentMethods.find(m => m.provider === 'cash' || m.method_key === 'cod');
        const k = cashMethod ? cashMethod.method_key : 'pos_cash';
        if (!paymentMap[k]) {
          paymentMap[k] = {
            key: k,
            label: 'نقدي وكاش بالفرع',
            provider: 'cash',
            color: '#f59e0b',
            amount: 0,
            count: 0
          };
        }
        paymentMap[k].amount += posCashAmt;
        paymentMap[k].count += 1;
      }

      // POS Card
      if (bd && bd.card && parseFloat(bd.card) > 0) {
        const k = 'pos_card';
        if (!paymentMap[k]) {
          paymentMap[k] = {
            key: k,
            label: 'بطاقات ودفع إلكتروني (POS Card)',
            provider: 'card',
            color: '#2563eb',
            amount: 0,
            count: 0
          };
        }
        paymentMap[k].amount += parseFloat(bd.card);
        paymentMap[k].count += 1;
      }

      // POS Bank Transfer / InstaPay
      if (bd && bd.transfer && parseFloat(bd.transfer) > 0) {
        const instapayMethod = configuredPaymentMethods.find(m => m.provider === 'instapay');
        const k = instapayMethod ? instapayMethod.method_key : 'pos_transfer';
        if (!paymentMap[k]) {
          paymentMap[k] = {
            key: k,
            label: 'تحويل إنستاباي / بنكي',
            provider: 'instapay',
            color: '#9333ea',
            amount: 0,
            count: 0
          };
        }
        paymentMap[k].amount += parseFloat(bd.transfer);
        paymentMap[k].count += 1;
      }
    }

    const paymentMethods = Object.values(paymentMap).map((item) => {
      const pct = totalRevenue > 0 ? ((item.amount / totalRevenue) * 100) : 0;
      return {
        key: item.key,
        label: item.label,
        name_ar: item.name_ar || item.label,
        provider: item.provider,
        account_number: item.account_number,
        account_name: item.account_name,
        is_configured: !!item.is_configured,
        is_active: item.is_active !== false,
        color: item.color,
        amount: parseFloat(item.amount.toFixed(2)),
        count: item.count,
        percentage: parseFloat(pct.toFixed(1))
      };
    }).sort((a, b) => b.amount - a.amount);

    // 6. Daily Sales & Orders Trend (Last N days)
    const dailyMap = {};

    for (const o of ecpOrders) {
      const dStr = new Date(o.created_at).toISOString().split('T')[0];
      const dLabel = `${new Date(o.created_at).getDate()}/${new Date(o.created_at).getMonth() + 1}`;
      if (!dailyMap[dStr]) {
        dailyMap[dStr] = { date: dStr, label: dLabel, revenue: 0, orders: 0, ecp_rev: 0, pos_rev: 0 };
      }
      const amt = parseFloat(o.total_amount || 0);
      dailyMap[dStr].revenue += amt;
      dailyMap[dStr].ecp_rev += amt;
      dailyMap[dStr].orders += 1;
    }

    for (const inv of posInvoices) {
      const dStr = new Date(inv.invoice_date).toISOString().split('T')[0];
      const dLabel = `${new Date(inv.invoice_date).getDate()}/${new Date(inv.invoice_date).getMonth() + 1}`;
      if (!dailyMap[dStr]) {
        dailyMap[dStr] = { date: dStr, label: dLabel, revenue: 0, orders: 0, ecp_rev: 0, pos_rev: 0 };
      }
      const amt = parseFloat(inv.final_amount || 0);
      dailyMap[dStr].revenue += amt;
      dailyMap[dStr].pos_rev += amt;
      dailyMap[dStr].orders += 1;
    }

    const dailySalesTrend = Object.values(dailyMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 7. Geographic Demand: Based on ecp_shipping_rates (Egyptian Governorates & Cities)
    const shippingRates = await query(`
      SELECT id, city_name, city_code, shipping_fee, estimated_days, is_active
      FROM ecp_shipping_rates
      ORDER BY id ASC
    `);

    const normalizeArabic = (str) => {
      if (!str) return '';
      return String(str)
        .trim()
        .toLowerCase()
        .replace(/[\u064B-\u065F]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/^محافظه\s+/, '')
        .replace(/^محافظة\s+/, '')
        .replace(/^مدينة\s+/, '')
        .replace(/^مدينه\s+/, '');
    };

    // Initialize stats map for each configured rate
    const shippingStatsMap = {};
    for (const r of shippingRates) {
      shippingStatsMap[r.id] = {
        rate_id: r.id,
        city_name: r.city_name,
        city_code: r.city_code,
        shipping_fee: parseFloat(r.shipping_fee || 0),
        estimated_days: r.estimated_days || '2-4 أيام عمل',
        is_active: r.is_active,
        count: 0,
        revenue: 0,
        shipping_collected: 0
      };
    }

    let unclassifiedOrdersCount = 0;
    let unclassifiedRevenue = 0;

    for (const o of ecpOrders) {
      let addr = {};
      if (typeof o.shipping_address === 'string') {
        try { addr = JSON.parse(o.shipping_address || '{}'); } catch (e) { addr = {}; }
      } else if (o.shipping_address) {
        addr = o.shipping_address;
      }

      const govNorm = normalizeArabic(addr.governorate);
      const cityNorm = normalizeArabic(addr.city);

      // Match against shipping rates
      const matchedRate = shippingRates.find(r => {
        const rNorm = normalizeArabic(r.city_name);
        return (
          (govNorm && (govNorm.includes(rNorm) || rNorm.includes(govNorm))) ||
          (cityNorm && (cityNorm.includes(rNorm) || rNorm.includes(cityNorm))) ||
          (r.city_code && addr.governorate && r.city_code.toLowerCase() === String(addr.governorate).trim().toLowerCase())
        );
      });

      const ordAmt = parseFloat(o.total_amount || 0);
      const shipCost = parseFloat(o.shipping_cost || 0);

      if (matchedRate && shippingStatsMap[matchedRate.id]) {
        shippingStatsMap[matchedRate.id].count += 1;
        shippingStatsMap[matchedRate.id].revenue += ordAmt;
        shippingStatsMap[matchedRate.id].shipping_collected += shipCost || parseFloat(matchedRate.shipping_fee || 0);
      } else {
        unclassifiedOrdersCount += 1;
        unclassifiedRevenue += ordAmt;
      }
    }

    // Build top ordering cities from configured rates
    const topCities = Object.values(shippingStatsMap)
      .filter(item => item.count > 0)
      .map(item => ({
        city: item.city_name,
        city_code: item.city_code,
        shipping_fee: item.shipping_fee,
        estimated_days: item.estimated_days,
        count: item.count,
        revenue: parseFloat(item.revenue.toFixed(2)),
        shipping_collected: parseFloat(item.shipping_collected.toFixed(2)),
        percentage: ecpOrders.length > 0 ? parseFloat(((item.count / ecpOrders.length) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

    if (unclassifiedOrdersCount > 0) {
      topCities.push({
        city: 'محافظات ومناطق أخرى',
        city_code: 'OTH',
        shipping_fee: 0,
        estimated_days: '-',
        count: unclassifiedOrdersCount,
        revenue: parseFloat(unclassifiedRevenue.toFixed(2)),
        shipping_collected: 0,
        percentage: ecpOrders.length > 0 ? parseFloat(((unclassifiedOrdersCount / ecpOrders.length) * 100).toFixed(1)) : 0
      });
    }

    // Complete shipping rates performance for store manager
    const allConfiguredRates = Object.values(shippingStatsMap).map(item => ({
      ...item,
      percentage: ecpOrders.length > 0 ? parseFloat(((item.count / ecpOrders.length) * 100).toFixed(1)) : 0
    }));

    // 8. Smart Decision Insights
    const codItem = paymentMethods.find(p => p.key === 'cod');
    const codPct = codItem ? codItem.percentage : 0;
    const topCity = topCities[0] || null;

    const insights = [];

    if (topPerformer) {
      insights.push({
        type: 'success',
        title: `المنتج الأكثر طلباً: "${topPerformer.name}"`,
        description: `يمثل وحدك هذا المنتج ${topPerformer.revenue_percentage}% من إجمالي إيرادات المبيعات (${topPerformer.units_sold} قطعة). تأكد من تأمين مخزون إضافي منه لتفادي نفاده.`
      });
    }

    if (codPct > 40) {
      insights.push({
        type: 'warning',
        title: `نسبة الدفع عند الاستلام (COD) مرتفعة (${codPct}%)`,
        description: `يُنصح بتقديم عروض شحن مجاني أو خصومات صغيرة لتحفيز الدفع عبر إنستاباي والمحافظ الإلكترونية لتقليل مخاطر رفض الشحنات ومصاريف الارتجاع.`
      });
    } else {
      insights.push({
        type: 'info',
        title: `إقبال ممتاز على الدفع الإلكتروني والرقمي`,
        description: `توزيع وسائل الدفع الرقمية يحقق سيولة فورية للنشاط التجاري ويقلل دورة تحصيل الكاش مع مناديب الشحن.`
      });
    }

    if (topCity) {
      insights.push({
        type: 'info',
        title: `المدينة الأكثر كثافة بالطلبات: ${topCity.city}`,
        description: `سجلت ${topCity.count} طلب بنسبة ${topCity.percentage}% من إجمالي شحنات المتجر. يمكن استغلال ذلك في التعاقد مع مناديب شحن بسعر مخفض لهذه المنطقة.`
      });
    }

    // 9. Staff & Cashier Sales Performance
    let staffPerformance = [];
    if (branchFilter === 'ecom' || branchFilter === 'ecs' || String(branchFilter) === '2') {
      const ecomStaffSql = `
        SELECT COALESCE(u.full_name, u.username, 'مسؤول تجهيز المتجر') AS staff_name,
               u.username,
               u.role,
               b.branch_name,
               b.id AS branch_id,
               COUNT(o.id)::int AS invoice_count,
               COALESCE(SUM(o.total_amount), 0)::numeric(12,2) AS total_sales,
               (COALESCE(SUM(o.total_amount), 0) / NULLIF(COUNT(o.id), 0))::numeric(12,2) AS avg_ticket
        FROM users u
        JOIN branches b ON b.id = u.branch_id
        LEFT JOIN ecp_orders o ON o.packed_by_id = u.id
                              AND o.order_status NOT IN ('cancelled', 'refunded')
                              ${ecpDateCondition}
        WHERE u.status = 'active'
          AND (b.branch_type = 'ecom_warehouse' OR b.branch_code = 'BR-ECOM' OR b.id = 2)
        GROUP BY staff_name, u.username, u.role, b.branch_name, b.id
        ORDER BY total_sales DESC, invoice_count DESC
      `;
      staffPerformance = await query(ecomStaffSql, dateParams);
    } else {
      const staffPerformanceSql = `
        SELECT COALESCE(u.full_name, u.username, 'كاشير الفرع') AS staff_name,
               u.username,
               u.role,
               b.branch_name,
               b.id AS branch_id,
               COUNT(si.id)::int AS invoice_count,
               SUM(si.final_amount)::numeric(12,2) AS total_sales,
               (SUM(si.final_amount) / NULLIF(COUNT(si.id), 0))::numeric(12,2) AS avg_ticket
        FROM swm_sales_invoices si
        JOIN branches b ON b.id = si.branch_id
        LEFT JOIN users u ON u.id = si.salesperson_id
        WHERE si.status = 'completed'
        ${posDateCondition}
        ${posBranchCondition}
        GROUP BY staff_name, u.username, u.role, b.branch_name, b.id
        ORDER BY total_sales DESC
        LIMIT 12
      `;
      staffPerformance = await query(staffPerformanceSql, dateParams);
    }

    const staffRoleLabels = {
      super_admin: 'مدير عام',
      admin: 'مدير إداري',
      supervisor: 'مشرف مستودع / فرع',
      salesperson: 'مسؤول مبيعات وتجهيز',
      branch_account: 'حساب فرع'
    };

    staffPerformance = staffPerformance.map(st => ({
      ...st,
      role_label: staffRoleLabels[st.role] || st.role,
      share_percentage: totalRevenue > 0 ? parseFloat(((parseFloat(st.total_sales || 0) / totalRevenue) * 100).toFixed(1)) : 0
    }));

    // 10. Multi-Branch Performance Comparison (for Admin overview)
    const allBranches = await query(
      `SELECT id, branch_name, branch_code, branch_type, status
       FROM branches
       WHERE status = 'active'
       ORDER BY id ASC`
    );

    const branchPosSql = `
      SELECT b.id, b.branch_name, b.branch_code, b.branch_type,
             COALESCE(SUM(si.final_amount), 0)::numeric(12,2) AS pos_sales,
             COUNT(si.id)::int AS pos_invoices_count
      FROM branches b
      LEFT JOIN swm_sales_invoices si ON si.branch_id = b.id AND si.status = 'completed' ${posDateCondition}
      WHERE b.status = 'active'
      ${branchFilter === 'retail' ? "AND b.branch_type = 'retail_branch'" : ""}
      GROUP BY b.id, b.branch_name, b.branch_code, b.branch_type
      ORDER BY pos_sales DESC
    `;
    const rawBranchPos = await query(branchPosSql, dateParams);

    const branchEcpSql = `
      SELECT COALESCE(o.fulfilling_branch_id, 2) AS branch_id,
             COALESCE(SUM(o.total_amount), 0)::numeric(12,2) AS ecp_sales,
             COUNT(o.id)::int AS ecp_orders_count
      FROM ecp_orders o
      WHERE o.order_status NOT IN ('cancelled', 'refunded') ${ecpDateCondition}
      GROUP BY COALESCE(o.fulfilling_branch_id, 2)
    `;
    const rawBranchEcp = await query(branchEcpSql, dateParams);

    const branchMap = {};
    for (const b of rawBranchPos) {
      branchMap[b.id] = {
        branch_id: b.id,
        branch_name: b.branch_name,
        branch_code: b.branch_code,
        branch_type: b.branch_type,
        pos_sales: parseFloat(b.pos_sales || 0),
        pos_count: parseInt(b.pos_invoices_count || 0, 10),
        ecp_sales: 0,
        ecp_count: 0,
        total_sales: parseFloat(b.pos_sales || 0)
      };
    }

    if (branchFilter !== 'retail') {
      for (const e of rawBranchEcp) {
        if (!branchMap[e.branch_id]) {
          const bInfo = allBranches.find(b => b.id === e.branch_id);
          branchMap[e.branch_id] = {
            branch_id: e.branch_id,
            branch_name: bInfo ? bInfo.branch_name : `مستودع #${e.branch_id}`,
            branch_code: bInfo ? bInfo.branch_code : `BR-${e.branch_id}`,
            branch_type: bInfo ? bInfo.branch_type : 'warehouse',
            pos_sales: 0,
            pos_count: 0,
            ecp_sales: 0,
            ecp_count: 0,
            total_sales: 0
          };
        }
        const amt = parseFloat(e.ecp_sales || 0);
        branchMap[e.branch_id].ecp_sales += amt;
        branchMap[e.branch_id].ecp_count += parseInt(e.ecp_orders_count || 0, 10);
        branchMap[e.branch_id].total_sales += amt;
      }
    }

    const branchesComparison = Object.values(branchMap)
      .map(item => ({
        ...item,
        share_percentage: totalRevenue > 0 ? parseFloat(((item.total_sales / totalRevenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.total_sales - a.total_sales);

    let selectedBranchMeta = {
      id: branchFilter,
      name: branchFilter === 'retail'
        ? 'جميع فروع التجزئة'
        : (branchFilter === 'ecom' || branchFilter === 'ecs' || branchFilter === '2')
          ? 'المتجر الإلكتروني (E-Commerce / ECP)'
          : (branchFilter === 'all' ? 'جميع الفروع والمستودعات' : 'فرع محدد'),
      type: branchFilter === 'retail' ? 'retail' : ((branchFilter === 'ecom' || branchFilter === 'ecs' || branchFilter === '2') ? 'ecom_warehouse' : (branchFilter === 'all' ? 'all' : 'branch'))
    };

    if (branchFilter !== 'all' && branchFilter !== 'retail' && branchFilter !== 'ecom' && branchFilter !== 'ecs') {
      const found = allBranches.find(b => b.id === parseInt(branchFilter, 10));
      if (found) {
        selectedBranchMeta = {
          id: found.id,
          name: found.branch_name,
          code: found.branch_code,
          type: found.branch_type
        };
      }
    }

    if (staffPerformance.length > 0 && branchFilter !== 'all') {
      const topSeller = staffPerformance[0];
      if (parseFloat(topSeller.total_sales || 0) > 0) {
        const isEcom = branchFilter === 'ecom' || branchFilter === 'ecs' || String(branchFilter) === '2';
        insights.push({
          type: 'info',
          title: isEcom ? `أفضل مسؤول مبيعات وتجهيز أداءً: ${topSeller.staff_name}` : `أفضل كاشير / بائع أداءً: ${topSeller.staff_name}`,
          description: isEcom
            ? `حقق مبيعات وطلبات متجر بقيمة ${topSeller.total_sales} ج.م عبر ${topSeller.invoice_count} طلب بمتوسط ${topSeller.avg_ticket} ج.م لكل طلب.`
            : `حقق مبيعات بقيمة ${topSeller.total_sales} ج.م عبر ${topSeller.invoice_count} فاتورة بمتوسط ${topSeller.avg_ticket} ج.م لكل فاتورة.`
        });
      }
    }

    return res.json({
      success: true,
      data: {
        period_days: days || null,
        start_date: startDate || null,
        end_date: endDate || null,
        selected_branch: selectedBranchMeta,
        all_branches: allBranches,
        branches_comparison: branchesComparison,
        staff_performance: staffPerformance,
        kpi: {
          total_revenue: parseFloat(totalRevenue.toFixed(2)),
          total_orders: totalOrdersCount,
          average_order_value: parseFloat(averageOrderValue.toFixed(2)),
          total_units_sold: totalUnitsSold,
          fulfillment_rate: parseFloat(fulfillmentRate.toFixed(1)),
          top_product_name: topPerformer ? topPerformer.name : 'لا يوجد',
          ecp_revenue: parseFloat(totalEcpRevenue.toFixed(2)),
          pos_revenue: parseFloat(totalPosRevenue.toFixed(2)),
          total_shipping_revenue: parseFloat(topCities.reduce((acc, c) => acc + (c.shipping_collected || 0), 0).toFixed(2))
        },
        top_products: topProducts,
        payment_methods: paymentMethods,
        daily_sales_trend: dailySalesTrend,
        top_cities: topCities,
        all_shipping_zones: allConfiguredRates,
        insights: insights
      }
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
