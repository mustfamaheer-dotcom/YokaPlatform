const router = require('express').Router();
const { query } = require('../../shared/db');
const { resolveLocation } = require('../../shared/geoLookup');

/**
 * POST /api/ecp/track
 * Non-blocking high-speed ingestion endpoint for visitor telemetry
 */
router.post('/', async (req, res) => {
  // Respond immediately to the storefront so navigation and UI are 100% fluid (0ms stall)
  res.json({ success: true, timestamp: Date.now() });

  // Process session & events asynchronously in background
  try {
    const {
      visitor_id,
      session_id,
      device_type = 'mobile',
      browser,
      os,
      referrer,
      events = []
    } = req.body;

    if (!session_id || !visitor_id) return;

    const eventList = Array.isArray(events) ? events : [events];
    if (eventList.length === 0) return;

    // Resolve geo location (cached in memory)
    const geo = await resolveLocation(req);

    // Compute metrics from current batch
    const pageviews = eventList.filter((e) => e.event_type === 'pageview');
    const hasCart = eventList.some((e) => e.event_type === 'add_to_cart');
    const purchaseEvent = eventList.find((e) => e.event_type === 'purchase');
    const hasOrdered = !!purchaseEvent;
    const orderId = purchaseEvent?.metadata?.order_number || purchaseEvent?.metadata?.order_id || null;

    const currentUrl = eventList[eventList.length - 1]?.page_url || '/';

    // Mask IP for privacy (e.g. 197.38.xxx.xxx)
    const rawIp = geo.ip || '127.0.0.1';
    const maskedIp = rawIp.includes('.')
      ? rawIp.split('.').slice(0, 2).concat(['xxx', 'xxx']).join('.')
      : 'xxx:xxx';

    // 1. Upsert or update session
    const [existingSession] = await query(
      `SELECT id, page_views_count, events_count, has_cart_activity, has_ordered, started_at
       FROM ecp_visitor_sessions
       WHERE session_id = $1`,
      [session_id]
    );

    if (existingSession) {
      await query(
        `UPDATE ecp_visitor_sessions
         SET page_views_count = page_views_count + $1,
             events_count = events_count + $2,
             has_cart_activity = has_cart_activity OR $3,
             has_ordered = has_ordered OR $4,
             order_id = COALESCE($5, order_id),
             exit_page = $6,
             last_activity_at = NOW(),
             duration_seconds = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW() - started_at))))
         WHERE session_id = $7`,
        [
          pageviews.length,
          eventList.length,
          hasCart,
          hasOrdered,
          orderId,
          currentUrl,
          session_id
        ]
      );
    } else {
      await query(
        `INSERT INTO ecp_visitor_sessions (
          session_id, visitor_id, ip_address, country, region, city,
          device_type, browser, os, referrer, landing_page, exit_page,
          page_views_count, events_count, has_cart_activity, has_ordered, order_id,
          started_at, last_activity_at, duration_seconds
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17,
          NOW(), NOW(), 0
        )`,
        [
          session_id,
          visitor_id,
          maskedIp,
          geo.country || 'مصر',
          geo.region || 'محافظة القاهرة',
          geo.city || 'القاهرة',
          device_type || 'mobile',
          browser || 'Unknown',
          os || 'Unknown',
          referrer || 'Direct',
          eventList[0]?.page_url || currentUrl,
          currentUrl,
          Math.max(1, pageviews.length),
          eventList.length,
          hasCart,
          hasOrdered,
          orderId
        ]
      );
    }

    // 2. Batch insert individual events
    for (const ev of eventList) {
      if (!ev.event_type || !ev.page_url) continue;

      const metaStr = ev.metadata ? (typeof ev.metadata === 'string' ? ev.metadata : JSON.stringify(ev.metadata)) : null;

      await query(
        `INSERT INTO ecp_visitor_events (
          session_id, event_type, page_url, page_title, product_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          session_id,
          ev.event_type,
          ev.page_url.substring(0, 255),
          ev.page_title ? ev.page_title.substring(0, 255) : null,
          ev.product_id ? parseInt(ev.product_id, 10) : null,
          metaStr
        ]
      );
    }
  } catch (err) {
    console.error('⚠️ [ECP Tracking Ingestion Error]:', err.message);
  }
});

module.exports = router;
