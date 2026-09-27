/**
 * Yoka Store Client-Side Telemetry & Visitor Behavior Tracker
 * - Non-blocking beacon transmission (Zero impact on page load & FPS)
 * - Session & Visitor persistence across navigation
 * - Device & OS auto-detection
 */

const VISITOR_KEY = 'yoka_visitor_id';
const SESSION_KEY = 'yoka_session_id';
const SESSION_LAST_ACTIVE = 'yoka_session_last_active';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
}

export function getVisitorId() {
  if (typeof window === 'undefined') return '';
  let vid = localStorage.getItem(VISITOR_KEY);
  if (!vid) {
    vid = generateId('v');
    localStorage.setItem(VISITOR_KEY, vid);
  }
  return vid;
}

export function getSessionId() {
  if (typeof window === 'undefined') return '';
  const now = Date.now();
  const lastActive = parseInt(localStorage.getItem(SESSION_LAST_ACTIVE) || '0', 10);
  let sid = localStorage.getItem(SESSION_KEY);

  // If session expired or missing, create fresh session
  if (!sid || (lastActive && now - lastActive > SESSION_TIMEOUT_MS)) {
    sid = generateId('s');
    localStorage.setItem(SESSION_KEY, sid);
  }
  localStorage.setItem(SESSION_LAST_ACTIVE, String(now));
  return sid;
}

export function detectDevice() {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  const ua = navigator.userAgent || '';
  if (/mobile|android|touch|webos|iphone|ipod/i.test(ua) || width <= 768) {
    return 'mobile';
  }
  if (/ipad|tablet/i.test(ua) || (width > 768 && width <= 1024)) {
    return 'tablet';
  }
  return 'desktop';
}

export function detectBrowser() {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Other';
}

export function detectOS() {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}

export function detectReferrer() {
  if (typeof window === 'undefined') return 'Direct';
  const ref = document.referrer;
  if (!ref) return 'Direct';
  try {
    const url = new URL(ref);
    if (url.hostname.includes(window.location.hostname)) return 'Direct';
    if (/facebook|fb\.com/i.test(url.hostname)) return 'Facebook';
    if (/instagram/i.test(url.hostname)) return 'Instagram';
    if (/tiktok/i.test(url.hostname)) return 'TikTok';
    if (/google/i.test(url.hostname)) return 'Google';
    if (/whatsapp/i.test(url.hostname)) return 'WhatsApp';
    if (/t\.co|twitter|x\.com/i.test(url.hostname)) return 'Twitter/X';
    return url.hostname;
  } catch (e) {
    return 'Direct';
  }
}

const API_BASE = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
  ? ''
  : 'http://localhost:3001';

/**
 * Send event payload safely without stalling the browser
 */
function sendPayload(events) {
  if (typeof window === 'undefined') return;

  const payload = {
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    device_type: detectDevice(),
    browser: detectBrowser(),
    os: detectOS(),
    referrer: detectReferrer(),
    events
  };

  const endpoint = `${API_BASE}/api/ecp/track`;
  const jsonStr = JSON.stringify(payload);

  // 1. Try navigator.sendBeacon (ideal for analytics, 0 latency, lives through page unloads)
  if (navigator.sendBeacon) {
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const ok = navigator.sendBeacon(endpoint, blob);
      if (ok) return;
    } catch (e) {
      // Fall through to fetch
    }
  }

  // 2. Fetch fallback with keepalive
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStr,
    keepalive: true
  }).catch(() => {
    // Non-critical telemetry, silently absorb
  });
}

/**
 * Public Trackers
 */
export function trackPageView(pageUrl, pageTitle = '') {
  sendPayload([
    {
      event_type: 'pageview',
      page_url: pageUrl || window.location.pathname,
      page_title: pageTitle || document.title,
      created_at: new Date().toISOString()
    }
  ]);
}

export function trackEvent(eventType, metadata = {}, productId = null) {
  sendPayload([
    {
      event_type: eventType,
      page_url: window.location.pathname,
      page_title: document.title,
      product_id: productId,
      metadata,
      created_at: new Date().toISOString()
    }
  ]);
}

export function trackProductView(product) {
  if (!product) return;
  trackEvent('product_view', {
    product_name: product.product_name,
    selling_price: product.sale_price || product.selling_price,
    slug: product.slug
  }, product.id);
}

export function trackAddToCart(item) {
  if (!item) return;
  trackEvent('add_to_cart', {
    product_name: item.product_name,
    unit_price: item.sale_price || item.selling_price || item.unit_price,
    quantity: item.quantity || 1,
    variant_id: item.variant_id || null
  }, item.product_id || item.id);
}

export function trackBeginCheckout(cart) {
  trackEvent('begin_checkout', {
    items_count: cart?.items_count || 0,
    subtotal: cart?.subtotal || 0
  });
}

export function trackPurchase(orderNumber, totalAmount) {
  trackEvent('purchase', {
    order_number: orderNumber,
    total_amount: totalAmount
  });
}
