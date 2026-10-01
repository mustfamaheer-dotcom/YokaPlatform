const router = require('express').Router();
const { query } = require('../../shared/db');
const { requireAuth, requireRole } = require('../../shared/authMiddleware');

/**
 * GET /api/swm/visitor-analytics
 * Strategic telemetry report on visitor behavior, geographic distribution (cities),
 * conversion funnel, and real-time live presence.
 */
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'supervisor', 'salesperson', 'cashier', 'branch_account']), async (req, res) => {
  try {
    const { days, startDate, endDate } = req.query;

    let dateCondition = '';
    const dateParams = [];

    if (startDate && endDate) {
      dateCondition = `AND s.started_at >= $1 AND s.started_at <= $2`;
      dateParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else if (startDate) {
      dateCondition = `AND s.started_at >= $1`;
      dateParams.push(`${startDate} 00:00:00`);
    } else if (endDate) {
      dateCondition = `AND s.started_at <= $1`;
      dateParams.push(`${endDate} 23:59:59`);
    } else if (days === 'today') {
      dateCondition = `AND s.started_at >= CURRENT_DATE`;
    } else if (days === 'yesterday') {
      dateCondition = `AND s.started_at >= CURRENT_DATE - INTERVAL '1 day' AND s.started_at < CURRENT_DATE`;
    } else if (days && days !== 'all') {
      const dayCount = parseInt(days, 10) || 30;
      dateCondition = `AND s.started_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL`;
      dateParams.push(dayCount);
    } else {
      // Default: Last 30 days if not specified
      dateCondition = `AND s.started_at >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    // 1. KPI Summary
    const [kpiRow] = await query(
      `SELECT COUNT(*) AS total_sessions,
              COUNT(DISTINCT s.visitor_id) AS unique_visitors,
              COALESCE(SUM(s.page_views_count), 0) AS total_pageviews,
              COALESCE(AVG(s.duration_seconds), 0) AS avg_duration_seconds,
              COUNT(CASE WHEN s.page_views_count <= 1 THEN 1 END) AS bounce_count,
              COUNT(CASE WHEN s.has_cart_activity THEN 1 END) AS cart_sessions_count,
              COUNT(CASE WHEN s.has_ordered THEN 1 END) AS ordered_sessions_count
       FROM ecp_visitor_sessions s
       WHERE 1=1 ${dateCondition}`,
      dateParams
    );

    // Live Visitors right now (active within the last 15 minutes)
    const [liveRow] = await query(
      `SELECT COUNT(DISTINCT session_id) AS live_count
       FROM ecp_visitor_sessions
       WHERE last_activity_at >= NOW() - INTERVAL '15 minutes'`
    );

    const totalSessions = parseInt(kpiRow?.total_sessions || 0, 10);
    const bounceRate = totalSessions > 0
      ? Math.round((parseInt(kpiRow.bounce_count || 0, 10) / totalSessions) * 100)
      : 0;
    const cartRate = totalSessions > 0
      ? Math.round((parseInt(kpiRow.cart_sessions_count || 0, 10) / totalSessions) * 100)
      : 0;
    const orderRate = totalSessions > 0
      ? Math.round((parseInt(kpiRow.ordered_sessions_count || 0, 10) / totalSessions) * 100)
      : 0;

    // 2. City & Governorate Distribution
    const citiesRows = await query(
      `SELECT COALESCE(s.city, 'غير محدد') AS city,
              COALESCE(s.region, 'محافظة القاهرة') AS region,
              COALESCE(s.country, 'مصر') AS country,
              COUNT(*) AS count,
              COUNT(DISTINCT s.visitor_id) AS unique_visitors,
              COUNT(CASE WHEN s.has_cart_activity THEN 1 END) AS cart_count,
              COUNT(CASE WHEN s.has_ordered THEN 1 END) AS orders_count
       FROM ecp_visitor_sessions s
       WHERE 1=1 ${dateCondition}
       GROUP BY s.city, s.region, s.country
       ORDER BY count DESC
       LIMIT 25`,
      dateParams
    );

    const cities = citiesRows.map((c) => {
      const cityTotal = parseInt(c.count, 10);
      const orders = parseInt(c.orders_count, 10);
      return {
        city: c.city,
        region: c.region,
        country: c.country,
        count: cityTotal,
        unique_visitors: parseInt(c.unique_visitors, 10),
        cart_count: parseInt(c.cart_count, 10),
        orders_count: orders,
        percentage: totalSessions > 0 ? parseFloat(((cityTotal / totalSessions) * 100).toFixed(1)) : 0,
        conversion_rate: cityTotal > 0 ? parseFloat(((orders / cityTotal) * 100).toFixed(1)) : 0
      };
    });

    // 3. Conversion Funnel Stages
    const [funnelEvents] = await query(
      `SELECT COUNT(DISTINCT CASE WHEN e.event_type = 'product_view' THEN e.session_id END) AS viewed_product,
              COUNT(DISTINCT CASE WHEN e.event_type = 'add_to_cart' THEN e.session_id END) AS added_to_cart,
              COUNT(DISTINCT CASE WHEN e.event_type = 'begin_checkout' THEN e.session_id END) AS started_checkout,
              COUNT(DISTINCT CASE WHEN e.event_type = 'purchase' THEN e.session_id END) AS completed_purchase
       FROM ecp_visitor_events e
       JOIN ecp_visitor_sessions s ON s.session_id = e.session_id
       WHERE 1=1 ${dateCondition}`,
      dateParams
    );

    const funnel = [
      {
        stage: 'total_visitors',
        title: 'زيارات المتجر (Store Visits)',
        count: totalSessions,
        percentage: 100,
        color: '#2563eb'
      },
      {
        stage: 'product_view',
        title: 'تصفح المنتجات (Browsed Products)',
        count: parseInt(funnelEvents?.viewed_product || 0, 10),
        percentage: totalSessions > 0 ? parseFloat(((parseInt(funnelEvents?.viewed_product || 0, 10) / totalSessions) * 100).toFixed(1)) : 0,
        color: '#8b5cf6'
      },
      {
        stage: 'add_to_cart',
        title: 'إضافة للسلة (Added to Cart)',
        count: parseInt(kpiRow?.cart_sessions_count || funnelEvents?.added_to_cart || 0, 10),
        percentage: totalSessions > 0 ? parseFloat(((parseInt(kpiRow?.cart_sessions_count || 0, 10) / totalSessions) * 100).toFixed(1)) : 0,
        color: '#f59e0b'
      },
      {
        stage: 'begin_checkout',
        title: 'بدء الدفع (Started Checkout)',
        count: parseInt(funnelEvents?.started_checkout || 0, 10),
        percentage: totalSessions > 0 ? parseFloat(((parseInt(funnelEvents?.started_checkout || 0, 10) / totalSessions) * 100).toFixed(1)) : 0,
        color: '#06b6d4'
      },
      {
        stage: 'purchase',
        title: 'إتمام الشراء (Completed Orders)',
        count: parseInt(kpiRow?.ordered_sessions_count || funnelEvents?.completed_purchase || 0, 10),
        percentage: totalSessions > 0 ? parseFloat(((parseInt(kpiRow?.ordered_sessions_count || 0, 10) / totalSessions) * 100).toFixed(1)) : 0,
        color: '#10b981'
      }
    ];

    // 4. Device & Browser Distributions
    const deviceRows = await query(
      `SELECT device_type, COUNT(*) AS count
       FROM ecp_visitor_sessions s
       WHERE 1=1 ${dateCondition}
       GROUP BY device_type
       ORDER BY count DESC`,
      dateParams
    );

    const osRows = await query(
      `SELECT COALESCE(os, 'Unknown') AS os, COUNT(*) AS count
       FROM ecp_visitor_sessions s
       WHERE 1=1 ${dateCondition}
       GROUP BY os
       ORDER BY count DESC
       LIMIT 6`,
      dateParams
    );

    const referrerRows = await query(
      `SELECT COALESCE(referrer, 'Direct') AS source, COUNT(*) AS count
       FROM ecp_visitor_sessions s
       WHERE 1=1 ${dateCondition}
       GROUP BY referrer
       ORDER BY count DESC
       LIMIT 8`,
      dateParams
    );

    // 5. Top Viewed Products
    const topViewedRows = await query(
      `SELECT p.id, p.product_name, p.slug, p.featured_image, p.selling_price, p.sale_price,
              COUNT(e.id) AS views_count,
              COUNT(DISTINCT e.session_id) AS unique_viewers
       FROM ecp_visitor_events e
       JOIN ecp_visitor_sessions s ON s.session_id = e.session_id
       JOIN products p ON p.id = e.product_id
       WHERE e.event_type = 'product_view' ${dateCondition}
       GROUP BY p.id, p.product_name, p.slug, p.featured_image, p.selling_price, p.sale_price
       ORDER BY views_count DESC
       LIMIT 10`,
      dateParams
    );

    // 6. Recent Real-Time Sessions Stream
    const recentSessions = await query(
      `SELECT s.id, s.session_id, s.city, s.region, s.country,
              s.device_type, s.browser, s.os, s.referrer,
              s.landing_page, s.exit_page, s.page_views_count,
              s.has_cart_activity, s.has_ordered, s.started_at,
              s.last_activity_at, s.duration_seconds
       FROM ecp_visitor_sessions s
       ORDER BY s.last_activity_at DESC
       LIMIT 30`
    );

    return res.json({
      success: true,
      data: {
        kpi: {
          total_sessions: totalSessions,
          unique_visitors: parseInt(kpiRow?.unique_visitors || 0, 10),
          total_pageviews: parseInt(kpiRow?.total_pageviews || 0, 10),
          live_visitors_now: parseInt(liveRow?.live_count || 0, 10),
          avg_duration_seconds: Math.round(parseFloat(kpiRow?.avg_duration_seconds || 0)),
          bounce_rate: bounceRate,
          cart_rate: cartRate,
          order_rate: orderRate
        },
        cities,
        funnel,
        devices: deviceRows.map((d) => ({
          device: d.device_type,
          count: parseInt(d.count, 10),
          percentage: totalSessions > 0 ? parseFloat(((parseInt(d.count, 10) / totalSessions) * 100).toFixed(1)) : 0
        })),
        operating_systems: osRows.map((o) => ({
          os: o.os,
          count: parseInt(o.count, 10),
          percentage: totalSessions > 0 ? parseFloat(((parseInt(o.count, 10) / totalSessions) * 100).toFixed(1)) : 0
        })),
        referrers: referrerRows.map((r) => ({
          source: r.source,
          count: parseInt(r.count, 10),
          percentage: totalSessions > 0 ? parseFloat(((parseInt(r.count, 10) / totalSessions) * 100).toFixed(1)) : 0
        })),
        top_viewed_products: topViewedRows.map((p) => ({
          ...p,
          views_count: parseInt(p.views_count, 10),
          unique_viewers: parseInt(p.unique_viewers, 10)
        })),
        recent_sessions: recentSessions
      }
    });
  } catch (err) {
    console.error('Visitor analytics route error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
