require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const branchRoutes = require('./routes/branches');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const supplierRoutes = require('./routes/suppliers');
const purchaseRoutes = require('./routes/purchases');
const posRoutes = require('./routes/pos');

const app = express();

// 1. Performance: Compression middleware (Gzip/Brotli)
app.use(compression());

// 2. Security: Hardened HTTP Headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
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
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 login/token attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const orderRoutes = require('./routes/orders');

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

// ECP (E-Commerce Platform) Public API Routes
const ecpCatalogRoutes = require('../ecp/routes/catalog');
const ecpCartRoutes = require('../ecp/routes/cart');
const ecpCheckoutRoutes = require('../ecp/routes/checkout');

app.use('/api/ecp/catalog', ecpCatalogRoutes);
app.use('/api/ecp/cart', ecpCartRoutes);
app.use('/api/ecp/checkout', ecpCheckoutRoutes);

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

// Serve images and public assets
app.use(express.static(path.join(__dirname, '../../img')));
app.use(express.static(path.join(__dirname, '../../client-swm/public')));
app.use(express.static(path.join(__dirname, '../../client-ecp/public')));

const ecpStaticDir = path.join(__dirname, '../../client-ecp/dist');
const swmStaticDir = path.join(__dirname, '../../client-swm/dist');

// Serve SWM (Admin Panel) on /swm-admin
if (fs.existsSync(path.join(swmStaticDir, 'index.html'))) {
  app.use('/swm-admin', express.static(swmStaticDir));
  app.get('/swm-admin/*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') return next();
    res.sendFile(path.join(swmStaticDir, 'index.html'));
  });
}

// Serve ECP (Public Customer Store) on Root '/'
if (fs.existsSync(path.join(ecpStaticDir, 'index.html'))) {
  app.use('/', express.static(ecpStaticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health' || req.path.startsWith('/swm-admin')) return next();
    res.sendFile(path.join(ecpStaticDir, 'index.html'));
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
  });
}

module.exports = app;
