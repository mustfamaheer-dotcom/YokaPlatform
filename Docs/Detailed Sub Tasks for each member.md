# Yoka Store — Detailed Sub-Tasks for Each Member
### Integrated Sales & Warehouse Management (SWM) + E-Commerce Platform (ECP)
**Full-Stack Sequential Relay Model — Timeline: September 25, 2026 to October 01, 2026**

---

## 1. Executive Summary & Team Allocation

Each developer operates as a **Full-Stack Engineer** responsible for delivering their entire bulk package end-to-end (Database schema, Backend APIs, Frontend UI, Activity Log instrumentation, and verification) before handing off to the next engineer.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       SEQUENTIAL RELAY TIMELINE                                        │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Sep 25, 08:00 AM - Sep 26, 02:00 PM] ──► Moustafa Maher  : Bulk 1 (Infra, DB, Auth & Master Data)    │
│ [Sep 26, 02:30 PM - Sep 27, 11:00 PM] ──► Yassen Ahmed    : Bulk 2 (Purchasing, Stock & POS Terminal)  │
│ [Sep 28, 08:00 AM - Sep 29, 02:00 PM] ──► Adel Ahmed      : Bulk 3 (Storefront, Sync & Checkout)       │
│ [Sep 29, 02:30 PM - Sep 30, 11:00 PM] ──► Boda Essam      : Bulk 4 (Portal, Logs UI, Reports & Crons)  │
│ [Oct 01, 08:00 AM - Oct 01, 08:00 PM] ──► ALL 4 MEMBERS   : Joint Day 7 (Stress Tests & Go-Live)       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Member 1: Moustafa Maher (Project Lead & Full-Stack Architect)

### Assigned Scope: Bulk 1 — Infrastructure, Core Database, Shared Engine, Auth & Master Data
**Window:** Sep 25, 2026 (08:00 AM) to Sep 26, 2026 (02:00 PM)  
**Total Allocated Hours:** 30 Hours  
**Handoff Target:** Yassen Ahmed at Sep 26, 2026 (02:00 PM)

---

#### Sub-Task MM-1.1: Hostinger VPS Provisioning & System Hardening
- **Domain:** DevOps & Infrastructure
- **Time Estimate:** 4 Hours (Sep 25, 08:00 AM – 12:00 PM)
- **Dependencies:** Hostinger VPS root access credentials.
- **Detailed Execution Steps:**
  1. SSH into Hostinger Ubuntu 24.04 LTS server with ED25519 key; disable root password login.
  2. Update packages (`apt update && apt upgrade -y`).
  3. Configure UFW firewall: allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS); deny all other incoming traffic.
  4. Install Node.js v20 LTS via NodeSource repository; install global tools: `pm2`, `pnpm`, `typescript`.
  5. Install MySQL 8.0 Server; run `mysql_secure_installation`; tune `my.cnf`:
     - `max_connections = 300`
     - `innodb_buffer_pool_size = 4G`
     - `innodb_log_file_size = 512M`
     - `innodb_flush_log_at_trx_commit = 2`
  6. Install Redis Server 7.2; configure `redis.conf`:
     - Set strong `requirepass`
     - `maxmemory 1gb`
     - `maxmemory-policy volatile-lru`
  7. Install and configure Nginx web server; enable gzip and basic rate-limiting configurations.
- **Deliverables:** Operational Ubuntu 24.04 VPS with hardened MySQL, secured Redis, Node.js 20, PM2, and Nginx.
- **Acceptance Criteria:** `systemctl status mysql`, `systemctl status redis-server`, and `systemctl status nginx` all return `active (running)`.

---

#### Sub-Task MM-1.2: Complete Database Schema Migration (35+ Tables) & Seeding
- **Domain:** Database Engineering
- **Time Estimate:** 8 Hours (Sep 25, 12:30 PM – 08:30 PM)
- **Dependencies:** MM-1.1 completed.
- **Detailed Execution Steps:**
  1. Create database `yoka_store_db` with `utf8mb4` character set and `utf8mb4_unicode_ci` collation.
  2. Write structured SQL migration files for all 35+ tables defined in the Technical Plan:
     - **Core & Org:** `branches`, `users`, `categories`, `brands`, `products`, `product_variants`, `inventory_balances`, `inventory_movements`.
     - **SWM Purchasing & Stock:** `suppliers`, `purchase_invoices`, `purchase_invoice_items`, `supplier_payments`, `inventory_counts`.
     - **SWM POS & Sales:** `swm_customers`, `cash_registers`, `cash_register_sessions`, `cash_transactions`, `swm_sales_invoices`, `swm_sales_invoice_items`, `expenses`.
     - **E-Commerce (ECP):** `ecp_customers`, `ecp_addresses`, `ecp_carts`, `ecp_cart_items`, `ecp_orders`, `ecp_order_items`, `ecp_payments`, `ecp_coupons`, `ecp_reviews`, `ecp_shipping_zones`.
     - **System & Logs:** `sync_events`, `audit_logs`, `activity_logs`, `alert_events`.
  3. Create composite indexes, foreign key constraints with `ON DELETE RESTRICT` for financial integrity.
  4. Build automated seeder script `seed.js`:
     - Default Main Branch ("الفرع الرئيسي")
     - Super Admin user (`admin@yokastore.com`) with bcrypt-hashed password (salt rounds = 12)
     - Base product categories and attribute sets (Sizes: S, M, L, XL, XXL; Colors: Black, White, Navy).
- **Deliverables:** `migrations/001_initial_schema.sql` and `seeders/seed.js` executed cleanly.
- **Acceptance Criteria:** `SHOW TABLES;` shows 35+ tables; foreign keys enforce referential integrity without errors.

---

#### Sub-Task MM-1.3: Monorepo Setup, Shared Database/Redis Connectors & Activity Log Engine
- **Domain:** Core Backend Infrastructure
- **Time Estimate:** 5 Hours (Sep 25, 09:00 PM – Sep 26, 02:00 AM)
- **Dependencies:** MM-1.2 completed.
- **Detailed Execution Steps:**
  1. Initialize Git repository with branches `main`, `staging`, and strict PR conventions.
  2. Implement `server/shared/db.js` using `mysql2/promise` connection pool (`connectionLimit: 50`, `waitForConnections: true`).
  3. Implement `server/shared/redis.js` using `ioredis` with auto-reconnect strategy and event listeners.
  4. Implement the Central Activity Logger `server/shared/activityLogger.js`:
     ```javascript
     async function logActivity({ userId, branchId, actionType, entityType, entityId, oldValue, newValue, ipAddress, userAgent, notes })
     ```
     - Handles serializing JSON snapshots of `oldValue` and `newValue`.
     - Asynchronous fire-and-forget query to `activity_logs` table preventing performance degradation.
  5. Implement `authMiddleware.js` for JWT verification and RBAC permission checks (`requireRole(['admin', 'manager'])`).
- **Deliverables:** Shared utility module exportable to all subsequent backend routes.
- **Acceptance Criteria:** Calling `logActivity()` writes an accurate row to `activity_logs` with JSON diffs within < 5ms.

---

#### Sub-Task MM-1.4: Master Data Backend APIs (Users, Branches, Categories, Products & Variants)
- **Domain:** Backend API Development
- **Time Estimate:** 6 Hours (Sep 26, 08:00 AM – 02:00 PM)
- **Dependencies:** MM-1.3 completed.
- **Detailed Execution Steps:**
  1. Build Auth API endpoints:
     - `POST /api/auth/login` (generates access token 1h + refresh token 7d in Redis)
     - `POST /api/auth/refresh`
     - `POST /api/auth/logout`
  2. Build Branch & User Management APIs:
     - `GET /api/swm/branches`, `POST /api/swm/branches`, `PUT /api/swm/branches/:id`
     - `GET /api/swm/users`, `POST /api/swm/users`, `PUT /api/swm/users/:id/role`
  3. Build Product Catalog & Variant APIs:
     - `POST /api/swm/products` (creates parent product + variants in a single transaction)
     - `GET /api/swm/products` (with branch inventory balance joins, pagination, and barcode search)
     - `PUT /api/swm/products/:id` (captures old vs new price, logs activity)
  4. Instrument all write operations with `logActivity()`.
- **Deliverables:** Tested REST endpoints documented with sample requests/responses.
- **Acceptance Criteria:** All endpoints return standard `{ success: true, data: ... }` format; 100% of mutations write to `activity_logs`.

---

#### Sub-Task MM-1.5: Master Data Admin UI & Authentication Screens (Full-Stack Component)
- **Domain:** Frontend Web Development (React + Vite SPA)
- **Time Estimate:** 7 Hours (Spread over Sep 25-26, finished by Sep 26, 02:00 PM)
- **Dependencies:** MM-1.4 endpoints ready.
- **Detailed Execution Steps:**
  1. Scaffold React + Vite application under `client-swm/`; configure Axios interceptors for JWT auto-refresh.
  2. Build Login Screen with responsive layout and error handling.
  3. Build User & Branch Management views with modal forms for creating and editing staff accounts.
  4. Build Product Catalog Management UI:
     - Product creation modal with dynamic variant generator (Matrix: Size x Color).
     - SKU and Barcode auto-generation.
     - Table listing with inline search, category filter, and branch balance indicators.
- **Deliverables:** Functional React dashboard with authentication and master data CRUD.
- **Hand-off Checklist to Yassen Ahmed:**
  - [x] Hostinger VPS accessible via Git and SSH.
  - [x] MySQL database migrated with all 35+ tables and seeded admin user.
  - [x] Shared `db.js`, `redis.js`, and `logActivity()` available in repository.
  - [x] Products and variants can be created and viewed in UI and DB.

---

## 3. Member 2: Yassen Ahmed (Full-Stack Engineer)

### Assigned Scope: Bulk 2 — Purchasing, Suppliers, Inventory Balances & POS Cashier Terminal
**Window:** Sep 26, 2026 (02:30 PM) to Sep 27, 2026 (11:00 PM)  
**Total Allocated Hours:** 32 Hours  
**Handoff Target:** Adel Ahmed at Sep 27, 2026 (11:00 PM)

---

#### Sub-Task YA-2.1: Supplier Management & Purchase Invoices API (Backend)
- **Domain:** Backend API Development
- **Time Estimate:** 6 Hours (Sep 26, 02:30 PM – 08:30 PM)
- **Dependencies:** MM-1.4 (Product and variant tables ready).
- **Detailed Execution Steps:**
  1. Build Supplier CRUD APIs:
     - `GET /api/swm/suppliers`, `POST /api/swm/suppliers`, `PUT /api/swm/suppliers/:id`
  2. Build Purchase Invoices API (`POST /api/swm/purchases`):
     - Wrap invoice creation, item insertion, and inventory balance updates inside a strict `db.beginTransaction()`.
     - Update or insert rows into `inventory_balances` (`quantity_on_hand += item.quantity`).
     - Recalculate Weighted Average Cost (WAC):
       $$\text{New Cost} = \frac{(\text{Current Qty} \times \text{Current Cost}) + (\text{Incoming Qty} \times \text{Unit Cost})}{\text{Current Qty} + \text{Incoming Qty}}$$
     - Insert audit row into `inventory_movements` with `movement_type = 'purchase'`.
     - Record supplier ledger payment/balance.
  3. Instrument every invoice creation in `logActivity()` recording supplier ID, total amount, and invoice number.
- **Deliverables:** Complete purchase processing API with automated stock & cost updates.
- **Acceptance Criteria:** Submitting a purchase invoice increases `inventory_balances.quantity_on_hand` and logs `movement_type = 'purchase'`.

---

#### Sub-Task YA-2.2: Supplier & Purchase Invoices Frontend UI
- **Domain:** Frontend Web Development (React)
- **Time Estimate:** 5 Hours (Sep 26, 09:00 PM – Sep 27, 02:00 AM)
- **Dependencies:** YA-2.1 completed.
- **Detailed Execution Steps:**
  1. Build Supplier Directory page with supplier balance cards and payment history modal.
  2. Build "New Purchase Invoice" screen:
     - Searchable product variant selector.
     - Dynamic row addition with quantity, unit cost, discount, and calculated line totals.
     - Destination branch selector.
     - Immediate validation preventing negative quantities or zero costs.
  3. Build Purchase Invoices history log with status badges (`received`, `pending`, `partial`).
- **Deliverables:** Integrated purchase workflow screens in `client-swm/`.
- **Acceptance Criteria:** User creates a purchase invoice on UI; stock balance is immediately updated in the database.

---

#### Sub-Task YA-2.3: POS Terminal Fast Sale Engine & Cash Drawer Sessions API (Backend)
- **Domain:** Backend API & Financial Transactions
- **Time Estimate:** 8 Hours (Sep 27, 08:00 AM – 04:00 PM)
- **Dependencies:** YA-2.1 (Inventory balances populated).
- **Detailed Execution Steps:**
  1. Cash Register Sessions API:
     - `POST /api/swm/pos/session/open`: Opens cashier drawer with opening cash balance (`opening_balance`).
     - `POST /api/swm/pos/session/close`: Closes session with expected vs actual cash audit, logs variance.
     - `POST /api/swm/pos/cash-transaction`: Cash in / Cash out (petty cash expense).
  2. High-Speed POS Sale Transaction API (`POST /api/swm/pos/sale`):
     - Uses `db.beginTransaction()` and `SELECT ... FOR UPDATE` row-level locks on `inventory_balances`.
     - Validates available stock; rejects transaction if `quantity_on_hand < requested_qty`.
     - Deducts inventory balance and records row in `inventory_movements` (`movement_type = 'sale'`).
     - Generates sequential invoice number: `INV-BR{branch_id}-{YYYYMMDD}-{XXXX}`.
     - Inserts invoice record into `swm_sales_invoices` and items into `swm_sales_invoice_items`.
     - Updates cash drawer session total.
     - Calls `logActivity()` with cashier ID, invoice number, and payment method (`cash`, `card`, `split`).
- **Deliverables:** POS backend controller handling concurrent checkout requests safely.
- **Acceptance Criteria:** Prevents overselling with atomic transactions; rollbacks completely on insufficient stock error.

---

#### Sub-Task YA-2.4: POS Fast Cashier Frontend UI & 80mm Thermal Receipt Printing
- **Domain:** Frontend Web Development (React POS UI)
- **Time Estimate:** 9 Hours (Sep 27, 04:00 PM – 10:30 PM)
- **Dependencies:** YA-2.3 completed.
- **Detailed Execution Steps:**
  1. Build high-speed POS layout:
     - Barcode scanner input field with automatic item insertion on barcode scan.
     - Quick product grid with search and category tabs.
     - Size/Color selector popover for multi-variant items.
     - Interactive cart table: change quantities with keyboard shortcuts (`+`, `-`, `Delete`).
  2. Build Payment Modal:
     - Total, discount input, tax display, and tender calculation (Cash received vs Change due).
     - Multi-payment support (Cash + Credit Card).
  3. Implement Thermal Receipt Printing (80mm CSS media query):
     - Store logo, invoice number, cashier name, date/time, itemized table, total, tax, barcode/QR code.
     - Auto-trigger `window.print()` upon sale confirmation.
  4. Build Session Opening/Closing UI with cash reconciliation form.
- **Deliverables:** High-speed POS interface operational in `client-swm/`.
- **Hand-off Checklist to Adel Ahmed:**
  - [x] Complete purchase cycle functioning (Supplier -> Invoice -> Stock increment).
  - [x] POS Cashier Terminal operational with instant stock deduction.
  - [x] Session cash control and thermal receipt printing working.
  - [x] All sales and purchases recorded in `inventory_movements` and `activity_logs`.

---

## 4. Member 3: Adel Ahmed (Full-Stack Engineer)

### Assigned Scope: Bulk 3 — ECP Storefront, Sync Engine, Cart Reservation & Checkout
**Window:** Sep 28, 2026 (08:00 AM) to Sep 29, 2026 (02:00 PM)  
**Total Allocated Hours:** 30 Hours  
**Handoff Target:** Boda Essam at Sep 29, 2026 (02:00 PM)

---

#### Sub-Task AA-3.1: Public Catalog & Cart APIs (Backend)
- **Domain:** Backend API Development
- **Time Estimate:** 6 Hours (Sep 28, 08:00 AM – 02:00 PM)
- **Dependencies:** Bulk 1 & Bulk 2 (Products and inventory populated).
- **Detailed Execution Steps:**
  1. Build ECP Catalog APIs:
     - `GET /api/ecp/catalog`: Paginated public products with category/price/size filters, only querying variants with active inventory.
     - `GET /api/ecp/catalog/:slug`: Detailed product view with images, variants, size chart, and available stock.
     - Redis caching for product catalog (`ttl: 300s`) invalidated upon product updates.
  2. Build Session/User Cart APIs (`/api/ecp/cart`):
     - Supports guest carts (via cookie UUID) and registered customer carts.
     - Add to cart, update quantity, remove item, sync cart on login.
     - Real-time stock validation against `inventory_balances` for the online store branch.
- **Deliverables:** High-performance public catalog and cart endpoints in `server/routes/ecp/`.
- **Acceptance Criteria:** Catalog queries respond in < 60ms with Redis cache enabled; out-of-stock variants cannot be added to cart.

---

#### Sub-Task AA-3.2: ECP Storefront Web Application (Next.js 14 Frontend)
- **Domain:** Frontend Web Development (Next.js App Router)
- **Time Estimate:** 9 Hours (Sep 28, 02:30 PM – 11:30 PM)
- **Dependencies:** AA-3.1 completed.
- **Detailed Execution Steps:**
  1. Scaffold Next.js 14 application under `client-ecp/` with Tailwind CSS and responsive layout.
  2. Build Homepage:
     - Hero banner, featured collections, new arrivals carousel.
  3. Build Catalog & Filter Page:
     - Faceted sidebar filters (Categories, Size, Color, Price Range).
     - Sort options (Price: Low to High, Popularity, Newest).
  4. Build Product Details Page (PDP):
     - Multi-image gallery with zoom preview.
     - Color and Size selector with instant out-of-stock visual indicators.
     - "Add to Cart" button with animated micro-interactions.
  5. Build Slide-over Cart Drawer:
     - Real-time total calculation, free shipping threshold progress bar.
- **Deliverables:** Modern, mobile-first responsive e-commerce storefront in `client-ecp/`.
- **Acceptance Criteria:** Mobile responsiveness verified; Lighthouse Performance score > 90.

---

#### Sub-Task AA-3.3: Temporary Inventory Reservation & BullMQ Sync Engine (Backend)
- **Domain:** Real-time Integration & Queue Processing
- **Time Estimate:** 7 Hours (Sep 29, 12:00 AM – 07:00 AM)
- **Dependencies:** AA-3.1 and YA-2.3 (POS inventory balances).
- **Detailed Execution Steps:**
  1. Implement Temporary Cart Reservation (15-minute hold):
     - When customer proceeds to checkout, create a temporary reservation key in Redis:
       `SET ecp:reserve:{variant_id}:{cart_id} {qty} EX 900`
     - Decrement available online inventory virtual counter.
     - BullMQ delayed job scheduled for 15 minutes to release hold if order not paid.
  2. Implement Distributed Mutex Lock:
     - Prevent race conditions using Redis Lock pattern (`SET lock:variant:{id} {uuid} NX EX 10`).
  3. Build Bi-directional Sync Worker:
     - BullMQ worker listening to SWM POS sales and ECP orders.
     - When POS sells an item in the branch designated for online fulfillment, trigger WebSocket/Redis PubSub event updating storefront stock display.
- **Deliverables:** Robust stock reservation and concurrency guard in `server/jobs/syncWorker.js`.
- **Acceptance Criteria:** Multiple users attempting to checkout the last available unit results in exactly one successful reservation; others receive "Item reserved by another shopper".

---

#### Sub-Task AA-3.4: One-Page Checkout Flow & Payment Gateway Integration (Full-Stack)
- **Domain:** Full-Stack E-Commerce Checkout
- **Time Estimate:** 7 Hours (Sep 29, 07:30 AM – 01:30 PM)
- **Dependencies:** AA-3.2 and AA-3.3 completed.
- **Detailed Execution Steps:**
  1. Build One-Page Checkout UI:
     - Shipping address form (Governorate dropdown with dynamic shipping cost calculation).
     - Delivery instructions and customer contact phone.
     - Payment method selector: Cash on Delivery (COD) vs Online Card Payment.
  2. Implement Payment Gateways:
     - Integrate Stripe Elements / Paymob iFrame securely.
     - Backend endpoint `POST /api/ecp/checkout/create-intent`.
     - Secure Webhook endpoint `POST /api/ecp/checkout/webhook` to handle `payment_intent.succeeded`.
  3. Implement Order Finalization inside `db.beginTransaction()`:
     - Convert cart to `ecp_orders` and `ecp_order_items`.
     - Release Redis temporary reservation and commit permanent deduction in `inventory_balances`.
     - Trigger `logActivity()` for online order placement.
  4. Build Order Confirmation Page with order tracking reference.
- **Deliverables:** Fully functioning checkout flow from cart to payment receipt.
- **Hand-off Checklist to Boda Essam:**
  - [x] Live e-commerce store with catalog, search, and variant filtering.
  - [x] Redis 15-minute temporary reservation active during checkout.
  - [x] Stripe/Paymob payment and COD orders successfully write to `ecp_orders`.
  - [x] Stock deductions sync smoothly between online purchases and warehouse balances.

---

## 5. Member 4: Boda Essam (Full-Stack Engineer)

### Assigned Scope: Bulk 4 — Customer Portal, Coupons, Activity Log Viewer, Reports & Automation
**Window:** Sep 29, 2026 (02:30 PM) to Sep 30, 2026 (11:00 PM)  
**Total Allocated Hours:** 32 Hours  
**Handoff Target:** Entire Team for Day 7 Joint Launch at Sep 30, 2026 (11:00 PM)

---

#### Sub-Task BE-4.1: Customer Portal, Order Tracking & WhatsApp Notifications (Full-Stack)
- **Domain:** Full-Stack Customer Portal
- **Time Estimate:** 7 Hours (Sep 29, 02:30 PM – 09:30 PM)
- **Dependencies:** Bulk 3 (Orders and checkout operational).
- **Detailed Execution Steps:**
  1. Backend Customer Account APIs (`/api/ecp/customer/`):
     - `GET /api/ecp/customer/orders`: List customer purchase history with shipping status.
     - `GET /api/ecp/customer/orders/:id`: Detailed invoice view.
     - `PUT /api/ecp/customer/profile`: Update address book and phone.
  2. Customer Portal Frontend UI in `client-ecp/`:
     - Order history list with visual timeline stepper (`Pending` -> `Confirmed` -> `Shipped` -> `Delivered`).
     - Address management card grid.
  3. WhatsApp Order Confirmation Integration:
     - Auto-generate formatted WhatsApp link with order ID, customer name, items summary, and total:
       `https://wa.me/{store_phone}?text={encoded_message}`.
     - Place "Share / Track via WhatsApp" button on order confirmation screen.
- **Deliverables:** Self-service customer account portal and WhatsApp order alert generator.
- **Acceptance Criteria:** Customer logs in, views their historical orders with current status, and can launch pre-filled WhatsApp confirmation.

---

#### Sub-Task BE-4.2: Coupons Engine, Promotions & Product Reviews (Full-Stack)
- **Domain:** Full-Stack Marketing Tools
- **Time Estimate:** 6 Hours (Sep 29, 10:00 PM – Sep 30, 04:00 AM)
- **Dependencies:** Bulk 3 & BE-4.1.
- **Detailed Execution Steps:**
  1. Coupons Engine:
     - Table `ecp_coupons` handling: `code`, `discount_type` (`percentage` or `fixed`), `discount_value`, `min_order_amount`, `max_discount`, `usage_limit`, `expires_at`.
     - Backend verification API: `POST /api/ecp/coupons/validate`.
     - Frontend checkout integration: instant coupon code application with discount line display.
  2. Admin Coupon Management:
     - SWM dashboard interface to create, activate, expire, and monitor coupon usages.
  3. Product Reviews Component:
     - Customer review submission modal with 1-5 star rating and comment.
     - Admin approval status toggle (`approved`, `pending`).
- **Deliverables:** Dynamic coupon engine and product review system.
- **Acceptance Criteria:** Expired or below-minimum coupons rejected with descriptive error; valid coupon deducts correct amount on checkout.

---

#### Sub-Task BE-4.3: Activity Log Explorer & Audit Trail UI (Full-Stack)
- **Domain:** Full-Stack Audit & Governance
- **Time Estimate:** 8 Hours (Sep 30, 08:00 AM – 04:00 PM)
- **Dependencies:** MM-1.3 (`activity_logs` data populated by all modules).
- **Detailed Execution Steps:**
  1. Backend Activity Log Explorer API (`GET /api/swm/activity-logs`):
     - Server-side pagination, sorting, and multi-parameter filtering:
       - By User ID / Employee
       - By Branch ID
       - By Action Type (`CREATE`, `UPDATE`, `DELETE`, `POS_SALE`, `LOGIN`, `PRICE_CHANGE`, `CASH_OUT`)
       - By Date range (From date - To date)
     - `GET /api/swm/activity-logs/:id`: Retrieves full snapshot data.
  2. Activity Log Explorer UI in `client-swm/`:
     - Clean data table with color-coded action badges (Green for Sales/Create, Yellow for Update, Red for Delete/Cash Out).
     - Filter toolbar with instant search.
     - Interactive **Diff Modal (Visual Comparison)**:
       - Displays `old_value` vs `new_value` in split-pane or highlighted JSON diff, showing exact price or quantity alterations.
  3. Export audit log to CSV/Excel format.
- **Deliverables:** Complete administrative governance console for auditing staff actions.
- **Acceptance Criteria:** Every modification in products, sales, cash sessions, and discounts is inspectable with old vs new values.

---

#### Sub-Task BE-4.4: Business Intelligence Reports & Automated Cron Jobs
- **Domain:** Backend Jobs & Frontend Reporting Dashboard
- **Time Estimate:** 8 Hours (Sep 30, 04:30 PM – 10:30 PM)
- **Dependencies:** All sales and inventory data operational.
- **Detailed Execution Steps:**
  1. Financial & Stock Reporting APIs:
     - Daily/Monthly sales revenue and net profit calculator.
     - Fast-moving vs Dead inventory report.
     - Low Stock Alert report (items below `reorder_point`).
  2. Reports Dashboard UI in `client-swm/`:
     - Interactive charts (Recharts/Chart.js) for revenue trends and top-selling variants.
     - Export to PDF and Excel buttons.
  3. Automated Cron Jobs (Scheduled via BullMQ / Node-Cron):
     - **Daily Database Backup Job (03:00 AM):** Executes `mysqldump`, compresses into `.sql.gz`, encrypts with AES-256, and stores in `/var/backups/yoka/`.
     - **Cart Abandonment Cleanup (Every 5 minutes):** Releases expired reservations.
     - **Low Stock Email Digest (Daily 09:00 AM):** Sends summary to store manager.
- **Deliverables:** Executive reports dashboard and production background automation scripts.
- **Hand-off Checklist to Entire Team:**
  - [x] Activity Log Viewer displays all historic events with visual diffs.
  - [x] Reports dashboard calculates accurate revenue, costs, and inventory values.
  - [x] Automated cron jobs tested and running via PM2.
  - [x] System ready for final day joint stress testing and live production release.

---

## 6. Joint Final Day: All 4 Members (Day 7 — October 01, 2026)

### Objective: End-to-End Stress Testing, Concurrency Verification, Production Deployment & Official Go-Live
**Window:** Oct 01, 2026 (08:00 AM) to Oct 01, 2026 (08:00 PM)  
**Lead Coordinator:** Moustafa Maher  
**Participants:** Moustafa Maher, Yassen Ahmed, Adel Ahmed, Boda Essam

---

### Hour-by-Hour Execution Plan:

| Time Slot | Primary Activity | Lead Member | Support Members | Verification Target |
| :---: | :--- | :---: | :---: | :--- |
| **08:00 AM – 11:30 AM** | **Concurrency & Race Condition Simulation** | **Moustafa Maher** | Yassen, Adel | Simulate 5 cashiers selling the last 5 items while 10 online shoppers attempt checkout simultaneously. Verify zero overselling and exact stock balance. |
| **11:30 AM – 01:00 PM** | **Load Testing (Autocannon / K6)** | **Yassen Ahmed** | Boda | Inject 200 concurrent requests/sec on catalog and POS APIs. Confirm average response latency < 120ms and memory remains < 65%. |
| **01:30 PM – 03:30 PM** | **Staging Sanitization & Initial Seed** | **Boda Essam** | Adel | Flush mock/dummy orders and test invoices. Seed actual physical store branches, real staff accounts, and initial physical stock balance. |
| **03:30 PM – 06:30 PM** | **Production Deployment & Domain Linking** | **Moustafa Maher** | All | Configure official DNS A-Records; issue Let's Encrypt Wildcard SSL certificates; configure PM2 Cluster mode (4 instances); tune Nginx reverse proxy. |
| **06:30 PM – 08:00 PM** | **Final Smoke Test & Executive Handover** | **All Members** | All | Execute 1 live purchase on POS and 1 live purchase on E-Commerce with real card payment. Confirm receipt print, SMS/WhatsApp alert, and live dashboard update. |

---

## 7. Member-by-Member Daily Responsibility Matrix

| Date | Moustafa Maher | Yassen Ahmed | Adel Ahmed | Boda Essam |
| :---: | :--- | :--- | :--- | :--- |
| **Sep 25** | **ACTIVE (Bulk 1):** VPS setup, MySQL & Redis tuning, 35+ DB tables migration & seeding | Code review of DB schema; local environment preparation | Reviewing ECP UI wireframes and Tailwind setup | Reviewing reporting metrics and Activity Log requirements |
| **Sep 26** | **ACTIVE (Bulk 1):** Finish Master Data APIs, Auth JWT & UI -> **Hand-off at 02:00 PM** | **ACTIVE (Bulk 2):** Takes hand-off at 02:30 PM; builds Supplier & Purchase APIs | Preparing Next.js store structure and API fetch clients | Preparing customer portal layouts and review schema |
| **Sep 27** | Code review on Bulk 2 PR; DB query indexing validation | **ACTIVE (Bulk 2):** Builds POS Fast Cashier UI & Thermal Print -> **Hand-off at 11:00 PM** | Testing POS sales data models and cart integration hooks | Preparing coupon rules engine and WhatsApp link logic |
| **Sep 28** | Infrastructure monitoring and Redis connection pool checks | Assisting Adel with inventory reservation queries | **ACTIVE (Bulk 3):** Takes hand-off; builds Next.js Catalog, PDP & Cart | Building Activity Log Explorer UI component layout |
| **Sep 29** | Database query analysis on high-frequency cart queries | Supporting checkout Webhooks verification | **ACTIVE (Bulk 3):** Finishes Checkout & Payment -> **Hand-off at 02:00 PM** | **ACTIVE (Bulk 4):** Takes hand-off at 02:30 PM; builds Customer Portal & WhatsApp |
| **Sep 30** | Security vulnerability scan and audit trail validation | Verifying Cron backup scripts and Redis memory usage | Assisting Boda with report chart integration | **ACTIVE (Bulk 4):** Finishes Activity Log UI, Reports & Backup -> **Hand-off at 11:00 PM** |
| **Oct 01** | **LEAD (Day 7):** Race condition test lead, SSL certs, PM2 cluster & Go-Live | Load testing lead, webhook verification, payment audit | Frontend smoke test lead, responsive & mobile audit | Real-data seeding verification, reports check, live demo |

---

## 8. Activity Log Implementation Standard (Mandatory for ALL Members)

Every member writing any mutation endpoint (`POST`, `PUT`, `DELETE`, `PATCH`) must include the following standard snippet:

```javascript
const { logActivity } = require('../shared/activityLogger');

// Inside your controller method:
await logActivity({
    userId: req.user.id,
    branchId: req.user.branchId || targetBranchId,
    actionType: 'UPDATE_PRODUCT_PRICE', // or 'POS_SALE', 'PURCHASE_RECEIVE', 'CASH_WITHDRAWAL'
    entityType: 'product_variants',
    entityId: variantId,
    oldValue: { price: previousPrice, cost: previousCost },
    newValue: { price: updatedPrice, cost: updatedCost },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    notes: 'Price adjustment by store manager'
});
```

> [!IMPORTANT]
> **Quality Gate:** A Pull Request will be rejected immediately if any state-changing function lacks `logActivity()` or fails to use atomic `db.beginTransaction()` for monetary and stock movements.
