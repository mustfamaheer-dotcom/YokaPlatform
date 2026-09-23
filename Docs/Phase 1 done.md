# Yoka Store Platform — Phase 1 (Bulk 1) Completed Scope & Progress Report

**Project:** Yoka Store — Enterprise Multi-Branch Store & Warehouse Management (SWM) + E-Commerce Platform  
**Architect & Lead:** Moustafa Maher (Project Lead & Full-Stack Architect)  
**Scope:** Bulk 1 — Infrastructure, Core Database, Shared Engine, SWM API, Client Admin Dashboard & Automated Deployment  
**Status:** ✅ **100% COMPLETE & DEPLOYED**  
**Live Testing URL:** [http://yokastore.runasp.net](http://yokastore.runasp.net)  
**Repository:** [https://github.com/mustfamaheer-dotcom/YokaPlatform](https://github.com/mustfamaheer-dotcom/YokaPlatform)  
**Database (Live Test):** PostgreSQL `db69837.public.databaseasp.net:5432` (`db69837`)  

---

## 1. Executive Summary

Phase 1 (Bulk 1) establishes the core technical foundation and unified infrastructure for the entire Yoka Store ecosystem. All scheduled deliverables assigned to Moustafa Maher have been designed, coded, rigorously tested, and deployed to both local and live cloud staging environments with automated CI/CD pipelines.

The platform provides multi-branch data isolation, role-based access control (RBAC), an automated variant matrix generator (size/color/SKU/barcode), an atomic database transaction engine, an asynchronous audit logging service, and an Arabic RTL administrative web client.

---

## 2. Completed Sub-Tasks Breakdown

### Sub-Task MM-1.1: Hostinger VPS Provisioning & System Hardening
- **Automated Provisioning Automation:** Authored [`scripts/provision-vps.sh`](scripts/provision-vps.sh) targeting Ubuntu 24.04 LTS.
- **System Security & Hardening:**
  - Configured UFW firewall: open ports `22` (SSH), `80` (HTTP), `443` (HTTPS); default deny for all other incoming ports.
  - Disabled root password login; enforced ED25519 SSH key authentication.
  - Fail2ban configured with strict brute-force bans for SSH and web requests.
- **Runtimes & Process Management:**
  - Installed Node.js v20 LTS, `pnpm`, `pm2`, and TypeScript.
  - Authored [`ecosystem.config.js`](ecosystem.config.js) running Node.js in PM2 cluster mode across available CPU cores, with automatic restart on 1GB memory threshold and structured log rotation.
- **Database Servers & Caching:**
  - Production configuration for MySQL 8.0 / PostgreSQL with dual-engine Knex driver support.
  - Applied [`scripts/my.cnf`](scripts/my.cnf) tuning (InnoDB Buffer Pool 4GB, max connections 300, UTF8MB4 collation).
  - Authored [`scripts/redis.conf`](scripts/redis.conf) with `allkeys-lru` eviction policy and 1GB memory ceiling.

---

### Sub-Task MM-1.2: Core Database Schema & Migrations
- **Dual-Engine Knex Configuration:** Created [`knexfile.js`](knexfile.js) with dynamic switching between PostgreSQL (`pg`) and MySQL 8 (`mysql2`), connection pooling (`min: 2, max: 20`), and SSL support.
- **Complete Relational Schema ([`migrations/001_initial_schema.js`](migrations/001_initial_schema.js)):**
  Constructed 35+ fully relational, indexed tables supporting the entire enterprise lifecycle:
  1. `branches` — Multi-branch stores and warehouse centers with branch isolation (`is_active`, `branch_code`).
  2. `roles` & `permissions` & `role_permissions` — Granular Role-Based Access Control matrix.
  3. `users` & `user_sessions` — Identity management, bcrypt password hashing, branch assignment, and refresh tokens.
  4. `categories` — Hierarchical product categorization with nested `parent_id` and slugs.
  5. `products` — Base catalog master data (name, brand, base cost, base price, tax rate, status).
  6. `product_variants` — Multi-dimensional matrix (size, color, SKU, unique barcode, cost price, sale price, weight).
  7. `product_images` — Image gallery with primary image flags and display order.
  8. `inventory_items` — Branch-level stock isolation with `quantity_on_hand`, `quantity_reserved`, and safety alert thresholds.
  9. `inventory_transactions` — Immutable audit trail of every stock movement (IN, OUT, TRANSFER, ADJUSTMENT).
  10. `stock_transfers` & `stock_transfer_items` — Inter-branch transfer workflows with transit tracking and approval status.
  11. `suppliers` & `purchase_orders` & `purchase_order_items` — Procurement, vendor tracking, and receiving.
  12. `orders` & `order_items` — Multi-channel sales engine (POS, Online, Wholesale) with discount and tax calculations.
  13. `payments` — Multi-method tender processing (Cash, Visa, Instapay, Vodafone Cash).
  14. `order_returns` & `return_items` — Return processing, restock tracking, and refund balancing.
  15. `cash_registers` & `cash_drawer_transactions` & `daily_cash_reconciliation` — POS register shifts, cash floats, drops, and EOD reconciliation.
  16. `audit_logs` — System-wide security and mutation audit history.
- **Database Seeder ([`seeders/seed.js`](seeders/seed.js)):**
  Populated live database with:
  - Main Central Store (`BR-MAIN`) & E-Commerce Virtual Warehouse (`BR-ECOM`).
  - Super Admin role and user (`admin` / `Yoka@Admin2026!`).
  - Base clothing categories (Men, Women, Kids, Accessories).
  - Main cash register (`CR-MAIN-01`).

---

### Sub-Task MM-1.3: Shared Architecture Engine & Core Services
- **Atomic Transaction Runner ([`server/shared/db.js`](server/shared/db.js)):**
  - Implemented `runTransaction(callback)` wrapper guaranteeing ACID compliance and automatic rollbacks on unhandled errors.
- **Asynchronous Audit Logger ([`server/shared/activityLogger.js`](server/shared/activityLogger.js)):**
  - Fire-and-forget `logActivity({ userId, branchId, action, entity, entityId, details, ipAddress, userAgent })` that logs operational activity without blocking API latency.
- **Redis Cache & Memory Fallback ([`server/shared/redis.js`](server/shared/redis.js)):**
  - High-performance caching layer with automatic fallback to an in-memory Map store when Redis is unavailable, ensuring high availability in both cloud and testing environments.
- **Authentication & RBAC Middleware ([`server/shared/authMiddleware.js`](server/shared/authMiddleware.js)):**
  - JWT Access Token verification (`authenticateToken`).
  - Strict role authorization (`requireRoles(['super_admin', 'manager'])`).
  - Granular permission checks (`requirePermissions(['inventory:write'])`).
- **Production Security & Optimization:**
  - Rate limiting (`express-rate-limit`): 100 requests per 15-minute window for standard APIs; 10 attempts for login.
  - Security headers via `helmet()`.
  - HTTP compression via `compression()`.

---

### Sub-Task MM-1.4: SWM Backend API Endpoints
Constructed RESTful API server ([`server/swm/app.js`](server/swm/app.js)) with comprehensive controllers:
- `POST /api/auth/login` — Authenticates user, verifies bcrypt hash, issues signed JWT access & refresh tokens.
- `POST /api/auth/refresh` — Token rotation for session renewal.
- `POST /api/auth/logout` — Revokes refresh tokens.
- `GET /api/auth/me` — Fetches current authenticated profile and permissions.
- `GET /api/swm/branches` & `POST /api/swm/branches` — Branch management.
- `GET /api/swm/categories` & `POST /api/swm/categories` — Product categories hierarchy.
- `GET /api/swm/products` & `POST /api/swm/products` — Product catalog and automated variant matrix creation.
- `GET /api/swm/users` & `POST /api/swm/users` — Staff account management and role assignment.
- `GET /health` — Diagnostic health check reporting uptime, database connectivity, and environment status.

---

### Sub-Task MM-1.5: Modern Arabic RTL Admin Dashboard (React 18 + Vite)
- **Design System & Typography:**
  - Styled with Ant Design 5 + custom CSS tokens tailored for Arabic RTL reading flow with `Cairo` & `Inter` Google Fonts.
- **Official Branding:**
  - Incorporated official high-resolution transparent Yoka Store branding (`yokaStoreTransparent.png`) across the login screen, navigation sidebar, and browser favicon.
- **Interactive Modules:**
  - **Login Page ([`client-swm/src/pages/Login.jsx`](client-swm/src/pages/Login.jsx)):** Secure authentication with real-time feedback and default credentials helper.
  - **Dashboard Overview ([`client-swm/src/pages/Dashboard.jsx`](client-swm/src/pages/Dashboard.jsx)):** Real-time KPI statistics cards (products, branches, users, system health).
  - **Products & Variant Matrix ([`client-swm/src/pages/Products.jsx`](client-swm/src/pages/Products.jsx) & [`VariantMatrix.jsx`](client-swm/src/components/VariantMatrix.jsx)):** Live product creation modal with dynamic size/color matrix multiplication, SKU preview, and barcode generation.
  - **Branches Manager ([`client-swm/src/pages/Branches.jsx`](client-swm/src/pages/Branches.jsx)):** Store locations and warehouse listing with branch codes and contact details.
  - **Users & Staff Manager ([`client-swm/src/pages/Users.jsx`](client-swm/src/pages/Users.jsx)):** Employee management, role assignment, and branch assignment.

---

### Sub-Task MM-1.6: CI/CD & Automated Cloud Deployment
- **Automated Packaging ([`scripts/package_monster.ps1`](scripts/package_monster.ps1)):**
  - Bundles the Express backend into a standalone `server.js` using `esbuild`.
  - Compiles the React client with Vite.
  - Copies production `web.config` configuring IIS `httpPlatformHandler` for Node.js execution.
- **Automated Deployment Workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):**
  - Triggered on push to `main`.
  - **Job 1: Build & Verify Architecture:** Executes automated verification test suite ([`scripts/test_bulk1.js`](scripts/test_bulk1.js)) validating database connection, migration integrity, seeder verification, and JWT security gates.
  - **Job 2: Automated MSDeploy to MonsterASP.NET:** Synchronizes the full-stack package directly to IIS over HTTPS port 8172 using `msdeploy.exe` with `-enableRule:AppOffline` and log preservation rules to guarantee zero-downtime deployments without file locks.
- **Verification:**
  - Latest pipeline run succeeded with 100% green checks:
    - Build & Verify Architecture: `✓ 1m 10s`
    - Deploy to Monster Test Server: `✓ 19s`

---

## 3. Verification & Live Endpoints

| Resource | URL | Expected Response |
| :--- | :--- | :--- |
| **Admin Web App** | [http://yokastore.runasp.net](http://yokastore.runasp.net) | Arabic RTL Admin Dashboard |
| **System Health API** | [http://yokastore.runasp.net/health](http://yokastore.runasp.net/health) | `{"status":"ok","service":"yoka-swm-api","dbClient":"pg"}` |
| **Auth Login API** | `POST http://yokastore.runasp.net/api/auth/login` | Returns JWT accessToken, refreshToken, and user object |
| **Official Logo** | [http://yokastore.runasp.net/yokaStoreTransparent.png](http://yokastore.runasp.net/yokaStoreTransparent.png) | High-resolution transparent PNG logo |

### Default Admin Credentials (For Team Testing)
- **Username:** `admin`
- **Password:** `Yoka@Admin2026!`
- **Role:** `super_admin`

---

## 4. Handoff to Yassen Ahmed (Bulk 2: Catalog, Inventory & Warehouse Operations)

The architecture is now clean, hardened, and ready for Yassen Ahmed to begin Bulk 2 on schedule:
1. **Database Schema:** All tables (`products`, `product_variants`, `inventory_items`, `inventory_transactions`, `stock_transfers`, `stock_transfer_items`) are already migrated and indexed.
2. **Shared Engine:** Import `runTransaction` from `server/shared/db.js` for any multi-table inventory mutations.
3. **Audit Logging:** Call `logActivity()` from `server/shared/activityLogger.js` on stock adjustments, transfers, and barcode scans.
4. **Auth & Branch Scoping:** Use `req.user.branchId` from `authenticateToken` to enforce warehouse-level stock isolation.
5. **Git Repository:** Single unified commit history on `origin/main`.
