require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Process-level resilience against unexpected remote DB/socket drops
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Process Uncaught Exception Handled]:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [Process Unhandled Rejection Handled]:', reason);
});


const authRoutes = require('./routes/auth');
const branchRoutes = require('./routes/branches');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const supplierRoutes = require('./routes/suppliers');
const purchaseRoutes = require('./routes/purchases');
const posRoutes = require('./routes/pos');
const attributeRoutes = require('./routes/attributes');

const app = express();

// 1. Performance: Compression middleware (Gzip/Brotli)
app.use(compression());

// 2. Security: Hardened HTTP Headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:*", "http://127.0.0.1:*"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "https://*.runasp.net",
        "http://*.runasp.net",
        "https://yokastore.runasp.net",
        "http://yokastore.runasp.net",
        "ws:",
        "wss:",
        "http://localhost:*",
        "http://127.0.0.1:*"
      ],
      manifestSrc: ["'self'"],
      frameSrc: ["'self'", "*"],
      frameAncestors: ["*"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));

// 3. Security: CORS configuration
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  process.env.ECP_ORIGIN || 'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3000'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Allow during dev
  },
  credentials: true
}));

// 4. Request Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Security & Rate Limiting: General API Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// 6. Security: Stricter Limiter for Authentication Endpoints (Brute Force Protection)
const isDev = process.env.NODE_ENV !== 'production';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 3000 : 100, // Generous limit in dev to prevent blocking valid user testing
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Never throttle session check or read queries
    if (req.method === 'GET') return true;
    if (req.path === '/logout') return true;
    return false;
  },
  message: { success: false, message: 'Too many authentication attempts. Please try again after a few minutes.' }
});

const orderRoutes = require('./routes/orders');
const expenseRoutes = require('./routes/expenses');
const transferRoutes = require('./routes/transfers');

// SWM API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/swm/branches', branchRoutes);
app.use('/api/swm/users', userRoutes);
app.use('/api/swm/categories', categoryRoutes);
app.use('/api/swm/products', productRoutes);
app.use('/api/swm/suppliers', supplierRoutes);
app.use('/api/swm/purchases', purchaseRoutes);
app.use('/api/swm/pos', posRoutes);
app.use('/api/swm/orders', orderRoutes);
app.use('/api/swm/expenses', expenseRoutes);
app.use('/api/swm/transfers', transferRoutes);
app.use('/api/swm/attributes', attributeRoutes);
const branchesDailyRoutes = require('./routes/branchesDaily');
app.use('/api/swm/branches-daily', branchesDailyRoutes);
const stockAuditRoutes = require('./routes/stockAudit');
app.use('/api/swm/stock-audit', stockAuditRoutes);
const inventoryCountsRoutes = require('./routes/inventoryCounts');
app.use('/api/swm/inventory-counts', inventoryCountsRoutes);
const stockAdjustmentRoutes = require('./routes/stockAdjustments');
app.use('/api/swm/stock-adjustments', stockAdjustmentRoutes);
const adminJournalsRoutes = require('./routes/adminJournals');
app.use('/api/swm/admin-journals', adminJournalsRoutes);
const wmPermissionsRoutes = require('./routes/warehouseManagerPermissions');
app.use('/api/swm/wm-permissions', wmPermissionsRoutes);
const treasuryRoutes = require('./routes/treasury');
app.use('/api/swm/treasury', treasuryRoutes);
app.use('/api/v1/treasury', treasuryRoutes);
app.use('/api/v1', treasuryRoutes); // mounts POST /api/v1/cash-transfers and GET /api/v1/cash-transfers
const analyticsRoutes = require('./routes/analytics');
app.use('/api/swm/analytics', analyticsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/reports', analyticsRoutes);
app.use('/api/swm/reports', analyticsRoutes);
const storeSettingsRoutes = require('./routes/storeSettings');
app.use('/api/swm/store-settings', storeSettingsRoutes);
const systemRoutes = require('./routes/systemBackup');
app.use('/api/swm/system', systemRoutes);
const visitorAnalyticsRoutes = require('./routes/visitorAnalytics');
app.use('/api/swm/visitor-analytics', visitorAnalyticsRoutes);
const uploadRoutes = require('./routes/uploads');
app.use('/api/swm/upload', uploadRoutes);
const branchShiftsMonitorRoutes = require('./routes/branchShiftsMonitor');
app.use('/api/swm/branch-shifts-monitor', branchShiftsMonitorRoutes);
app.use('/api/swm/branch-shifts', branchShiftsMonitorRoutes);
app.use('/api/branch-shifts-monitor', branchShiftsMonitorRoutes);
app.use('/api/branch-shifts', branchShiftsMonitorRoutes);
const loyaltyRoutes = require('./routes/loyalty');
app.use('/api/swm/loyalty', loyaltyRoutes);


// ECP (E-Commerce Platform) Public API Routes
const ecpCatalogRoutes = require('../ecp/routes/catalog');
const ecpCartRoutes = require('../ecp/routes/cart');
const ecpCheckoutRoutes = require('../ecp/routes/checkout');
const ecpTrackingRoutes = require('../ecp/routes/tracking');
const ecpSitemapRoutes = require('../ecp/routes/sitemap');

app.use('/api/ecp/catalog', ecpCatalogRoutes);
app.use('/api/ecp/cart', ecpCartRoutes);
app.use('/api/ecp/checkout', ecpCheckoutRoutes);
app.use('/api/ecp/track', ecpTrackingRoutes);
app.use('/', ecpSitemapRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'yoka-swm-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    dbClient: process.env.DB_CLIENT || 'pg'
  });
});

// Static frontend serving (Full-Stack single deployment)
const path = require('path');
const fs = require('fs');

// Helper to resolve first existing directory across development and production
function resolveFirstExisting(candidatePaths) {
  for (const candidate of candidatePaths) {
    if (!candidate) continue;
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch (e) {
      // Ignore permission or traversal errors on locked directories
    }
  }
  return null;
}

const ecpStaticDir = resolveFirstExisting([
  path.join(__dirname, 'client-ecp/dist'),
  path.join(__dirname, 'dist-ecp'),
  path.join(__dirname, '../../client-ecp/dist'),
  path.join(process.cwd(), 'client-ecp/dist'),
  path.join(process.cwd(), 'dist-deploy/client-ecp/dist')
]);

const swmStaticDir = resolveFirstExisting([
  path.join(__dirname, 'client-swm/dist'),
  path.join(__dirname, 'dist-swm'),
  path.join(__dirname, '../../client-swm/dist'),
  path.join(process.cwd(), 'client-swm/dist'),
  path.join(process.cwd(), 'dist-deploy/client-swm/dist')
]);

const imgDir = resolveFirstExisting([
  path.join(__dirname, 'img'),
  path.join(__dirname, '../../img'),
  path.join(process.cwd(), 'img')
]);

const swmPublicDir = resolveFirstExisting([
  path.join(__dirname, 'client-swm/public'),
  path.join(__dirname, '../../client-swm/public'),
  path.join(process.cwd(), 'client-swm/public')
]);

const ecpPublicDir = resolveFirstExisting([
  path.join(__dirname, 'client-ecp/public'),
  path.join(__dirname, '../../client-ecp/public'),
  path.join(process.cwd(), 'client-ecp/public')
]);

// Serve public static images & assets with performance caching headers
const uploadsDir = resolveFirstExisting([
  process.env.UPLOADS_DIR,
  path.join(process.cwd(), 'uploads'),
  path.join(__dirname, 'uploads'),
  path.join(__dirname, '../../uploads')
]) || path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {}
const uploadStaticOptions = {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  }
};
app.use('/uploads', express.static(uploadsDir, uploadStaticOptions));
app.use('/uploads', (req, res) => {
  res.status(404).type('text/plain').send('Image Not Found');
});

if (imgDir) app.use(express.static(imgDir, uploadStaticOptions));
if (swmPublicDir) app.use(express.static(swmPublicDir, uploadStaticOptions));
if (ecpPublicDir) app.use(express.static(ecpPublicDir, uploadStaticOptions));

// Helper for serving index.html without caching to ensure fresh deployments
const sendNoCacheFile = (res, filePath) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(filePath);
};

const staticOptions = {
  setHeaders: (res, filePath) => {
    if (filePath && filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (filePath && (filePath.includes('/assets/') || filePath.includes('\\assets\\'))) {
      // Hashed Vite production chunks: immutable 1 year cache
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
};

// Serve SWM (Admin Panel) on /swm-admin
if (swmStaticDir && fs.existsSync(path.join(swmStaticDir, 'index.html'))) {
  app.use((req, res, next) => {
    if (req.originalUrl === '/swm-admin' || req.path === '/swm-admin') {
      return res.redirect(302, '/swm-admin/');
    }
    next();
  });
  app.use('/swm-admin', express.static(swmStaticDir, staticOptions));
  app.get(['/swm-admin/', '/swm-admin/*'], (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') return next();
    sendNoCacheFile(res, path.join(swmStaticDir, 'index.html'));
  });
}

// Serve ECP (Public Customer Store) on Root '/'
if (ecpStaticDir && fs.existsSync(path.join(ecpStaticDir, 'index.html'))) {
  app.use('/', express.static(ecpStaticDir, staticOptions));

  // In-memory cache for ECP index.html template to prevent blocking disk I/O on every product visit
  let cachedEcpIndexHtml = null;
  const getEcpIndexHtml = () => {
    if (!cachedEcpIndexHtml) {
      try {
        cachedEcpIndexHtml = fs.readFileSync(path.join(ecpStaticDir, 'index.html'), 'utf8');
      } catch (e) {
        return '';
      }
    }
    return cachedEcpIndexHtml;
  };

  // Dynamic Server-Side Meta Injection for Products (WhatsApp, Facebook, Googlebot Rich Previews)
  app.get('/product/:slug', async (req, res, next) => {
    try {
      const slug = req.params.slug;
      const redis = require('../shared/redis');
      const cacheKey = `ecp:seo:product:${slug}`;
      let prod = null;

      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          prod = JSON.parse(cached);
        }
      } catch (e) {}

      if (!prod) {
        const { query } = require('../shared/db');
        const prodRes = await query(
          `SELECT p.product_name, p.description, p.selling_price, p.sale_price, p.featured_image, p.brand, p.product_code, p.slug,
                  COALESCE((SELECT SUM(ib.available_qty) FROM inventory_balances ib WHERE ib.product_id = p.id), 0) AS total_stock
           FROM products p
           WHERE p.slug = $1 OR p.id::text = $1
           LIMIT 1`,
          [slug]
        );
        prod = prodRes.rows?.[0] || prodRes?.[0];

        if (prod) {
          try {
            await redis.setex(cacheKey, 300, JSON.stringify(prod));
          } catch (e) {}
        }
      }

      if (prod) {
        const rawSelling = parseFloat(prod.selling_price) || 0;
        const rawSale = parseFloat(prod.sale_price) || 0;
        const hasDiscount = rawSale > 0 && rawSale < rawSelling;
        const price = hasDiscount ? rawSale : rawSelling;

        const baseUrl = process.env.PUBLIC_STORE_URL || 'https://yokastore.runasp.net';
        const pageTitle = `${prod.product_name} | يوكا ستور مصر`;
        const pageDesc = prod.description
          ? `${prod.description.substring(0, 150)}... - متوفر بسعر ${price.toLocaleString()} ج.م في يوكا ستور مع شحن سريع ومعاينة قبل الاستلام.`
          : `تسوق ${prod.product_name} بجودة استثنائية وسعر ${price.toLocaleString()} ج.م من يوكا ستور. شحن سريع لكافة محافظات مصر ومعاينة قبل الاستلام.`;

        let imageUrl = prod.featured_image || '/yokaStoreTransparent.png';
        if (imageUrl.startsWith('/')) {
          imageUrl = `${baseUrl}${imageUrl}`;
        }
        const pageUrl = `${baseUrl}/product/${slug}`;

        let html = getEcpIndexHtml();

        // Replace Title & Description
        html = html.replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`);
        html = html.replace(/<meta name="title" content=".*?" \/>/i, `<meta name="title" content="${pageTitle}" />`);
        html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${pageDesc}" />`);

        // Replace Open Graph Tags
        html = html.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${pageTitle}" />`);
        html = html.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${pageDesc}" />`);
        html = html.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${pageUrl}" />`);
        html = html.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${imageUrl}" />`);

        // Replace Twitter Tags
        html = html.replace(/<meta property="twitter:title" content=".*?" \/>/i, `<meta property="twitter:title" content="${pageTitle}" />`);
        html = html.replace(/<meta property="twitter:description" content=".*?" \/>/i, `<meta property="twitter:description" content="${pageDesc}" />`);
        html = html.replace(/<meta property="twitter:image" content=".*?" \/>/i, `<meta property="twitter:image" content="${imageUrl}" />`);

        // Inject Product Schema.org JSON-LD
        const jsonLd = {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": prod.product_name,
          "image": [imageUrl],
          "description": pageDesc,
          "sku": prod.product_code || slug,
          "brand": {
            "@type": "Brand",
            "name": prod.brand || "Yoka Store"
          },
          "offers": {
            "@type": "Offer",
            "url": pageUrl,
            "priceCurrency": "EGP",
            "price": price,
            "availability": parseInt(prod.total_stock, 10) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": {
              "@type": "Organization",
              "name": "Yoka Store"
            }
          }
        };

        const jsonLdScript = `\n    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>\n  </head>`;
        html = html.replace('</head>', jsonLdScript);

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.send(html);
      }
    } catch (ssrErr) {
      console.warn('Product SSR Meta Injection warning:', ssrErr.message);
    }
    sendNoCacheFile(res, path.join(ecpStaticDir, 'index.html'));
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health' || req.path.startsWith('/swm-admin') || req.path === '/sitemap.xml' || req.path === '/robots.txt') return next();
    sendNoCacheFile(res, path.join(ecpStaticDir, 'index.html'));
  });
} else {
  // Graceful API root handler when frontend has not been compiled yet
  app.get('/', (req, res) => {
    res.json({
      success: true,
      service: 'Yoka Store Enterprise Platform API',
      status: 'online',
      timestamp: new Date().toISOString(),
      note: 'Frontend dist not found. Run "npm run build:ecp" or "npm run build" to compile the storefront.',
      endpoints: {
        health: '/health',
        ecp_catalog: '/api/ecp/catalog',
        ecp_cart: '/api/ecp/cart',
        ecp_checkout: '/api/ecp/checkout',
        swm_api: '/api/swm/products'
      }
    });
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global structured error handler
app.use((err, req, res, next) => {
  console.error('Unhandled application error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

const PORT = parseInt(process.env.PORT || process.env.PORT_SWM || '3001', 10);
if (require.main === module || process.env.PORT) {
  app.listen(PORT, () => {
    console.log(`🚀 [Yoka SWM API] Hardened service running on port ${PORT} (Environment: ${process.env.NODE_ENV || 'development'})`);
    try {
      const { scheduleDaily1AmShiftClose } = require('./cron/shiftClosingJob');
      scheduleDaily1AmShiftClose();
    } catch (cronErr) {
      console.error('Failed to initialize shift closing cron job:', cronErr);
    }
  });
}

module.exports = app;
