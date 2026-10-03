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

    // 1. Upsert session atomically (prevents concurrent unique constraint race condition)
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
      )
      ON CONFLICT (session_id) DO UPDATE
      SET page_views_count = ecp_visitor_sessions.page_views_count + EXCLUDED.page_views_count,
          events_count = ecp_visitor_sessions.events_count + EXCLUDED.events_count,
          has_cart_activity = ecp_visitor_sessions.has_cart_activity OR EXCLUDED.has_cart_activity,
          has_ordered = ecp_visitor_sessions.has_ordered OR EXCLUDED.has_ordered,
          order_id = COALESCE(EXCLUDED.order_id, ecp_visitor_sessions.order_id),
          exit_page = EXCLUDED.exit_page,
          last_activity_at = NOW(),
          duration_seconds = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW() - ecp_visitor_sessions.started_at))))`,
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

    // 2. Batch insert individual events in a single multi-row query
    const validEvents = eventList.filter((ev) => ev.event_type && ev.page_url);
    if (validEvents.length > 0) {
      const valueClauses = [];
      const insertParams = [];
      let pIdx = 1;

      for (const ev of validEvents) {
        const metaStr = ev.metadata ? (typeof ev.metadata === 'string' ? ev.metadata : JSON.stringify(ev.metadata)) : null;
        valueClauses.push(`($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5}, NOW())`);
        insertParams.push(
          session_id,
          ev.event_type,
          ev.page_url.substring(0, 255),
          ev.page_title ? ev.page_title.substring(0, 255) : null,
          ev.product_id ? parseInt(ev.product_id, 10) : null,
          metaStr
        );
        pIdx += 6;
      }

      await query(
        `INSERT INTO ecp_visitor_events (
          session_id, event_type, page_url, page_title, product_id, metadata, created_at
        ) VALUES ${valueClauses.join(', ')}`,
        insertParams
      );
    }
  } catch (err) {
    console.error('⚠️ [ECP Tracking Ingestion Error]:', err.message);
  }
});

module.exports = router;
