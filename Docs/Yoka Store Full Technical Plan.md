# Yoka Store — Full Technical Plan
### Integrated Sales & Warehouse Management + E-Commerce Platform

> **Version:** 1.1 | **Date:** September 2026 | **Infrastructure:** Hostinger VPS

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Hostinger VPS Infrastructure Plan](#4-hostinger-vps-infrastructure-plan)
5. [Database Design — Complete Schema](#5-database-design--complete-schema)
6. [API Architecture Design](#6-api-architecture-design)
7. [Integration Layer — Sync Engine](#7-integration-layer--sync-engine)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Security Plan](#9-security-plan)
10. [File Storage & Media Management](#10-file-storage--media-management)
11. [Caching Strategy](#11-caching-strategy)
12. [Background Jobs & Queue System](#12-background-jobs--queue-system)
13. [Reporting & Analytics Engine](#13-reporting--analytics-engine)
14. [Backup & Disaster Recovery](#14-backup--disaster-recovery)
15. [Scalability Plan](#15-scalability-plan)
16. [Development Phases & Roadmap](#16-development-phases--roadmap)
17. [Environment Setup Guide](#17-environment-setup-guide-hostinger-vps)
18. [Cost Estimation](#18-cost-estimation)
19. [System Activity Log](#19-system-activity-log)

---

## 1. Executive Summary

Yoka Store requires a **dual-system platform** operating as one integrated entity:

| System | Purpose |
|--------|---------|
| **Sales & Warehouse Management (SWM)** | Internal multi-branch POS, inventory control, supplier management, financial tracking |
| **E-Commerce Platform (ECP)** | Public-facing online store connected in real-time to SWM inventory & catalog |

### Core Design Principles

- **Single Source of Truth** — One master product/inventory database shared by both systems
- **Real-Time Sync** — Inventory deducted instantly whether sold in-branch or online
- **Role-Based Isolation** — Each user type sees only their permitted data scope
- **Hostinger VPS Optimized** — Efficient resource use with planned vertical/horizontal scaling
- **Scalable by Design** — Architecture supports 3 to 50+ branches, 100 to 100,000+ online users

---

## 2. System Architecture Overview

### High-Level Architecture

```
+---------------------------------------------------------------------+
|                       YOKA STORE PLATFORM                           |
+-----------------------------+---------------------------------------+
|   INTERNAL SYSTEM (SWM)     |    PUBLIC SYSTEM (E-Commerce)         |
|                             |                                       |
|  [Admin Dashboard]          |   [E-Commerce Frontend - Next.js]     |
|  [Supervisor Dashboard]     |   [Product / Cart / Checkout Pages]   |
|         |                   |               |                       |
|  [SWM Backend - Node.js]    |   [ECP Backend - Node.js]             |
+-----------------------------+---------------------------------------+
               |                              |
               +----------[INTEGRATION LAYER]-+
                          |  BullMQ + Redis  |
                          +--------+---------+
                                   |
                    +--------------+--------------+
                    |     DATA LAYER (MySQL 8.0)  |
                    |  [Core DB]   [Redis Cache]  |
                    +-----------------------------+
```

### Deployment on Hostinger VPS

```
Internet
    |
    v
[Cloudflare CDN/WAF]  <-- DDoS protection + SSL termination
    |
    v
[Hostinger VPS -- Ubuntu 22.04 LTS]
    |
    +-- [Nginx Reverse Proxy]  <-- Port 80/443
    |       +-- /api/swm/*     --> Node.js SWM App  (Port 3001)
    |       +-- /api/ecom/*    --> Node.js ECP App  (Port 3002)
    |       +-- /*             --> Next.js / React Static
    |
    +-- [MySQL 8.0]            <-- Port 3306 (internal only)
    +-- [Redis 7]              <-- Port 6379 (internal only)
    +-- [PM2 Process Manager]  <-- Keeps Node.js alive
```

---

## 3. Technology Stack

### Backend

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Runtime** | Node.js 20 LTS | High concurrency, async I/O |
| **Framework** | Express.js 5 | Lightweight, highly compatible |
| **API Style** | REST API (v1) | Simple, well-documented |
| **Auth** | JWT + Refresh Tokens | Stateless, scalable |
| **Query Builder** | Knex.js | SQL builder + migrations |
| **Validation** | Zod | Runtime type-safe validation |
| **Queue** | BullMQ (Redis-backed) | Reliable job queue for sync |
| **Mailer** | Nodemailer + SMTP | Transactional emails |
| **PDF** | PDFKit | Invoice & report generation |
| **Barcode** | bwip-js | Server-side barcode generation |
| **Images** | Sharp.js | Image resize/convert to WebP |

### Frontend — SWM Internal Dashboard

| Component | Technology |
|-----------|-----------|
| **Framework** | React 18 + Vite |
| **State** | Zustand |
| **UI Library** | Ant Design (Pro tables, forms) |
| **Charts** | Recharts |
| **Router** | React Router v6 |
| **API Client** | Axios + TanStack Query |

### Frontend — E-Commerce Website

| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 14 (App Router, SSR/SSG) |
| **Styling** | Tailwind CSS |
| **State** | Zustand (cart state) |
| **Payments** | Stripe.js / PayPal JS SDK |
| **SEO** | Next.js built-in meta + sitemap |

### Infrastructure

| Component | Technology |
|-----------|-----------|
| **Server OS** | Ubuntu 22.04 LTS |
| **Web Server** | Nginx |
| **Process Manager** | PM2 Cluster Mode |
| **Database** | MySQL 8.0 |
| **Cache** | Redis 7 |
| **SSL** | Let's Encrypt (Certbot) |
| **CDN/WAF** | Cloudflare (free tier) |
| **Backups** | Automated scripts to Hostinger Object Storage |

---

## 4. Hostinger VPS Infrastructure Plan

### Recommended VPS Plan

| Spec | Phase 1 (Min) | Phase 2+ (Recommended) |
|------|--------------|------------------------|
| **VPS Plan** | Hostinger KVM 2 | Hostinger KVM 4 |
| **vCPU** | 2 cores | 4 cores |
| **RAM** | 8 GB | 16 GB |
| **NVMe Storage** | 100 GB | 200 GB |
| **Bandwidth** | 8 TB/month | 8 TB/month |
| **Cost** | ~$12-18/month | ~$25-40/month |

> Hostinger KVM VPS = **dedicated** resources (not shared), critical for database-heavy workloads.

### Directory Structure on VPS

```
/var/www/yoka/
+-- swm-backend/          <- SWM Node.js API
+-- ecom-backend/         <- E-Commerce Node.js API
+-- swm-frontend/dist/    <- React SWM Dashboard (Vite build)
+-- ecom-frontend/.next/  <- Next.js E-Commerce
+-- uploads/
    +-- products/
    +-- invoices/
    +-- barcodes/

/var/backups/yoka/
+-- daily/
+-- incremental/
```

### Nginx Configuration

```nginx
# SWM Internal Dashboard
server {
    listen 443 ssl;
    server_name admin.yokastore.com;
    ssl_certificate /etc/letsencrypt/live/yokastore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yokastore.com/privkey.pem;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
    }
    location / {
        root /var/www/yoka/swm-frontend/dist;
        try_files $uri /index.html;
        gzip on; expires 1d;
    }
}

# E-Commerce Public Store
server {
    listen 443 ssl;
    server_name www.yokastore.com;
    location /api/ { proxy_pass http://localhost:3002; }
    location / { proxy_pass http://localhost:3000; } # Next.js
}
```

### PM2 Ecosystem File

```javascript
module.exports = {
  apps: [
    { name: 'swm-api', script: '/var/www/yoka/swm-backend/src/app.js',
      instances: 2, exec_mode: 'cluster',
      env_production: { NODE_ENV: 'production', PORT: 3001 } },
    { name: 'ecom-api', script: '/var/www/yoka/ecom-backend/src/app.js',
      instances: 2, exec_mode: 'cluster',
      env_production: { NODE_ENV: 'production', PORT: 3002 } },
    { name: 'ecom-frontend', script: 'node_modules/.bin/next', args: 'start',
      cwd: '/var/www/yoka/ecom-frontend',
      env_production: { PORT: 3000 } },
    { name: 'queue-worker',
      script: '/var/www/yoka/swm-backend/src/workers/index.js', instances: 1 }
  ]
};
```

---

## 5. Database Design — Complete Schema

### 5.1 Database Architecture Strategy

**Strategy: Unified Single Database with Logical Prefixing**

```
yoka_db (Single MySQL database — utf8mb4 charset for Arabic support)
+-- Core/Shared Tables  --> no prefix   (users, branches, products, inventory_balances)
+-- SWM Tables          --> swm_ prefix (swm_sales_invoices, swm_sales_invoice_items)
+-- E-Commerce Tables   --> ecp_ prefix (ecp_orders, ecp_customers)
+-- Cross-cutting       --> (audit_logs, sync_events, notifications)
```

**Why a single database?**
- Zero network latency between systems
- Atomic transactions (deduct inventory + create order in ONE transaction)
- Full foreign key integrity across systems
- Simpler backup and restore

#### MySQL 8.0 Performance Config (my.cnf for 8 GB RAM)

```ini
[mysqld]
innodb_buffer_pool_size        = 4G     # 60% of RAM
innodb_buffer_pool_instances   = 4
innodb_log_file_size           = 512M
max_connections                = 300
slow_query_log                 = 1
long_query_time                = 2
default_time_zone              = '+03:00'
log_bin                        = /var/lib/mysql/mysql-bin
binlog_expire_logs_seconds     = 604800  # 7 days
```

---

### 5.2 Core Shared Tables

#### `branches`

```sql
CREATE TABLE branches (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    branch_code     VARCHAR(20)     NOT NULL,
    branch_name     VARCHAR(255)    NOT NULL,
    branch_type     ENUM('main_warehouse','retail_branch','ecom_warehouse')
                                    NOT NULL DEFAULT 'retail_branch',
    address         TEXT,
    phone           VARCHAR(20),
    supervisor_id   INT UNSIGNED,
    working_hours   JSON,
    status          ENUM('active','inactive','temporary_closed')
                                    NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_branch_code (branch_code),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `users`

```sql
CREATE TABLE users (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    username        VARCHAR(100)    NOT NULL,
    email           VARCHAR(150),
    password_hash   VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(255)    NOT NULL,
    phone           VARCHAR(25),
    national_id     VARCHAR(20),
    role            ENUM('super_admin','admin','supervisor','salesperson',
                         'content_manager','customer_service',
                         'inventory_manager','data_analyst','system_admin')
                                    NOT NULL,
    branch_id       INT UNSIGNED,       -- NULL = admin (all branches)
    permissions     JSON,               -- Fine-grained permission overrides
    salary          DECIMAL(10,2),
    hire_date       DATE,
    last_login      DATETIME,
    login_attempts  TINYINT         NOT NULL DEFAULT 0,
    locked_until    DATETIME,
    refresh_token   VARCHAR(512),
    status          ENUM('active','inactive','suspended')
                                    NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_national_id (national_id),
    KEY idx_role (role),
    KEY idx_branch (branch_id),
    KEY idx_status (status),
    FOREIGN KEY fk_user_branch (branch_id) REFERENCES branches(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `product_categories`

```sql
CREATE TABLE product_categories (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    parent_id       INT UNSIGNED,
    category_name   VARCHAR(255)    NOT NULL,
    slug            VARCHAR(255)    NOT NULL,
    description     TEXT,
    image_url       VARCHAR(512),
    display_order   SMALLINT        NOT NULL DEFAULT 0,
    is_ecom_visible BOOLEAN         NOT NULL DEFAULT TRUE,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_slug (slug),
    KEY idx_parent (parent_id),
    KEY idx_order (display_order),
    FOREIGN KEY fk_cat_parent (parent_id) REFERENCES product_categories(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `products` (Master Record — shared by SWM and ECP)

```sql
CREATE TABLE products (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    product_code        VARCHAR(100)    NOT NULL,
    barcode             VARCHAR(255),
    product_name        VARCHAR(255)    NOT NULL,
    slug                VARCHAR(300)    NOT NULL,   -- E-commerce URL slug
    brand               VARCHAR(100),
    category_id         INT UNSIGNED    NOT NULL,
    sub_category_id     INT UNSIGNED,

    -- Physical Attributes
    material            VARCHAR(100),
    color               VARCHAR(50),
    size                VARCHAR(50),
    model_number        VARCHAR(100),
    weight_grams        DECIMAL(10,3),
    dimensions          JSON,           -- {"length":0,"width":0,"height":0}

    -- Pricing
    cost_price          DECIMAL(12,4)   NOT NULL,
    selling_price       DECIMAL(12,4)   NOT NULL,
    wholesale_price     DECIMAL(12,4),
    sale_price          DECIMAL(12,4),
    sale_price_start    DATETIME,
    sale_price_end      DATETIME,
    tax_percentage      DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    alternative_prices  JSON,           -- {"price_b": 0, "price_c": 0}

    -- Media
    featured_image      VARCHAR(512),
    gallery_images      JSON,           -- ["url1","url2","url3"]

    -- SEO (E-Commerce)
    meta_title          VARCHAR(255),
    meta_description    VARCHAR(500),
    meta_keywords       VARCHAR(300),
    short_description   VARCHAR(1000),
    description         LONGTEXT,

    -- E-Commerce Flags
    is_ecom_listed      BOOLEAN         NOT NULL DEFAULT FALSE,
    ecom_visibility     ENUM('public','private','draft') DEFAULT 'public',
    is_featured         BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Stock Thresholds
    reorder_level       SMALLINT        NOT NULL DEFAULT 5,
    low_stock_threshold SMALLINT        NOT NULL DEFAULT 10,

    -- Aggregated Stats (updated by background jobs)
    average_rating      DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
    rating_count        INT             NOT NULL DEFAULT 0,
    total_sold          INT             NOT NULL DEFAULT 0,

    status              ENUM('active','inactive','discontinued')
                                        NOT NULL DEFAULT 'active',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_product_code (product_code),
    UNIQUE KEY uk_barcode (barcode),
    UNIQUE KEY uk_slug (slug),
    KEY idx_category (category_id),
    KEY idx_brand (brand),
    KEY idx_status (status),
    KEY idx_ecom (is_ecom_listed, ecom_visibility),
    KEY idx_featured (is_featured),
    FULLTEXT KEY ft_search (product_name, brand, short_description, meta_keywords),
    FOREIGN KEY fk_prod_cat (category_id) REFERENCES product_categories(id),
    FOREIGN KEY fk_prod_subcat (sub_category_id) REFERENCES product_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `product_variants`

```sql
CREATE TABLE product_variants (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    product_id      INT UNSIGNED    NOT NULL,
    variant_sku     VARCHAR(150)    NOT NULL,
    color           VARCHAR(50),
    size            VARCHAR(50),
    material        VARCHAR(100),
    additional_attrs JSON,
    price_modifier  DECIMAL(10,4)   NOT NULL DEFAULT 0.00,
    image_url       VARCHAR(512),
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    PRIMARY KEY (id),
    UNIQUE KEY uk_variant_sku (variant_sku),
    KEY idx_product (product_id),
    FOREIGN KEY fk_var_prod (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `inventory_balances` (Real-time stock per location — CRITICAL TABLE)

```sql
CREATE TABLE inventory_balances (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    branch_id       INT UNSIGNED    NOT NULL,
    product_id      INT UNSIGNED    NOT NULL,
    variant_id      INT UNSIGNED,

    available_qty   INT             NOT NULL DEFAULT 0,
    reserved_qty    INT             NOT NULL DEFAULT 0,  -- In carts/pending orders
    on_order_qty    INT             NOT NULL DEFAULT 0,  -- Awaiting distribution
    sold_qty        INT             NOT NULL DEFAULT 0,
    returned_qty    INT             NOT NULL DEFAULT 0,

    -- MySQL 8.0 Generated Column (no trigger needed)
    total_qty       INT GENERATED ALWAYS AS (available_qty + reserved_qty) STORED,

    last_movement_at DATETIME,
    last_updated    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_branch_product_variant (branch_id, product_id, variant_id),
    KEY idx_product_avail (product_id, available_qty),
    FOREIGN KEY fk_inv_branch (branch_id) REFERENCES branches(id),
    FOREIGN KEY fk_inv_product (product_id) REFERENCES products(id),
    FOREIGN KEY fk_inv_variant (variant_id) REFERENCES product_variants(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5.3 Sales & Warehouse Management Tables

#### `suppliers`

```sql
CREATE TABLE suppliers (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    supplier_code       VARCHAR(50)     NOT NULL,
    supplier_name       VARCHAR(255)    NOT NULL,
    contact_person      VARCHAR(255),
    phone               VARCHAR(25),
    email               VARCHAR(150),
    address             TEXT,
    tax_id              VARCHAR(50),
    opening_balance     DECIMAL(14,4)   NOT NULL DEFAULT 0.0000,
    current_balance     DECIMAL(14,4)   NOT NULL DEFAULT 0.0000,
    credit_limit        DECIMAL(14,4),
    payment_terms_days  TINYINT,
    status              ENUM('active','inactive','blacklisted')
                                        NOT NULL DEFAULT 'active',
    notes               TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_supplier_code (supplier_code),
    KEY idx_status (status),
    KEY idx_balance (current_balance)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `purchase_invoices`

```sql
CREATE TABLE purchase_invoices (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    invoice_number      VARCHAR(50)     NOT NULL,   -- PO-2026-00001
    supplier_id         INT UNSIGNED    NOT NULL,
    warehouse_branch_id INT UNSIGNED    NOT NULL,
    invoice_date        DATE            NOT NULL,
    due_date            DATE,
    subtotal            DECIMAL(14,4)   NOT NULL,
    discount_amount     DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    tax_amount          DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    shipping_cost       DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    final_amount        DECIMAL(14,4)   NOT NULL,
    paid_amount         DECIMAL(14,4)   NOT NULL DEFAULT 0.0000,
    payment_method      ENUM('cash','credit','bank_transfer','mixed')
                                        NOT NULL DEFAULT 'cash',
    payment_status      ENUM('unpaid','partial','paid')
                                        NOT NULL DEFAULT 'unpaid',
    notes               TEXT,
    status              ENUM('draft','pending','completed','cancelled')
                                        NOT NULL DEFAULT 'pending',
    created_by          INT UNSIGNED    NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_invoice_number (invoice_number),
    KEY idx_supplier (supplier_id),
    KEY idx_date (invoice_date),
    KEY idx_status (status),
    KEY idx_payment_status (payment_status),
    FOREIGN KEY fk_pi_supplier (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY fk_pi_branch (warehouse_branch_id) REFERENCES branches(id),
    FOREIGN KEY fk_pi_user (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `purchase_invoice_items`

```sql
CREATE TABLE purchase_invoice_items (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    invoice_id      INT UNSIGNED    NOT NULL,
    product_id      INT UNSIGNED    NOT NULL,
    variant_id      INT UNSIGNED,
    quantity        INT             NOT NULL,
    unit_cost       DECIMAL(12,4)   NOT NULL,
    discount_pct    DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    final_unit_cost DECIMAL(12,4)   NOT NULL,
    line_total      DECIMAL(14,4)   NOT NULL,
    product_name    VARCHAR(255),   -- Snapshot
    product_code    VARCHAR(100),   -- Snapshot
    PRIMARY KEY (id),
    KEY idx_invoice (invoice_id),
    KEY idx_product (product_id),
    FOREIGN KEY fk_pii_invoice (invoice_id) REFERENCES purchase_invoices(id)
        ON DELETE CASCADE,
    FOREIGN KEY fk_pii_product (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `supplier_payments`

```sql
CREATE TABLE supplier_payments (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    payment_ref     VARCHAR(50)     NOT NULL,
    supplier_id     INT UNSIGNED    NOT NULL,
    invoice_id      INT UNSIGNED,
    amount          DECIMAL(14,4)   NOT NULL,
    payment_method  ENUM('cash','bank_transfer','cheque') NOT NULL,
    payment_date    DATE            NOT NULL,
    reference_no    VARCHAR(100),
    direction       ENUM('payment','receipt') NOT NULL DEFAULT 'payment',
    notes           TEXT,
    recorded_by     INT UNSIGNED    NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_ref (payment_ref),
    KEY idx_supplier (supplier_id),
    KEY idx_date (payment_date),
    FOREIGN KEY fk_sp_supplier (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY fk_sp_invoice (invoice_id) REFERENCES purchase_invoices(id)
        ON DELETE SET NULL,
    FOREIGN KEY fk_sp_user (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `distribution_orders` (Inter-branch stock transfers)

```sql
CREATE TABLE distribution_orders (
    id                      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    order_number            VARCHAR(50)     NOT NULL,   -- DO-2026-00001
    source_branch_id        INT UNSIGNED    NOT NULL,
    destination_branch_id   INT UNSIGNED    NOT NULL,
    order_date              DATETIME        NOT NULL,
    notes                   TEXT,
    status                  ENUM('draft','pending','in_transit','completed','cancelled')
                                            NOT NULL DEFAULT 'draft',
    approved_by             INT UNSIGNED,
    completed_at            DATETIME,
    created_by              INT UNSIGNED    NOT NULL,
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_number (order_number),
    KEY idx_source (source_branch_id),
    KEY idx_dest (destination_branch_id),
    KEY idx_date (order_date),
    KEY idx_status (status),
    FOREIGN KEY fk_do_src (source_branch_id) REFERENCES branches(id),
    FOREIGN KEY fk_do_dst (destination_branch_id) REFERENCES branches(id),
    FOREIGN KEY fk_do_user (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `distribution_order_items`

```sql
CREATE TABLE distribution_order_items (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    order_id    INT UNSIGNED    NOT NULL,
    product_id  INT UNSIGNED    NOT NULL,
    variant_id  INT UNSIGNED,
    quantity    INT             NOT NULL,
    notes       VARCHAR(500),
    PRIMARY KEY (id),
    KEY idx_order (order_id),
    KEY idx_product (product_id),
    FOREIGN KEY fk_doi_order (order_id) REFERENCES distribution_orders(id)
        ON DELETE CASCADE,
    FOREIGN KEY fk_doi_product (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `swm_sales_invoices` (In-branch POS sales)

```sql
CREATE TABLE swm_sales_invoices (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    invoice_number      VARCHAR(50)     NOT NULL,   -- SI-B01-2026-00001
    branch_id           INT UNSIGNED    NOT NULL,
    salesperson_id      INT UNSIGNED    NOT NULL,
    customer_name       VARCHAR(255),
    customer_ref        VARCHAR(50),
    customer_phone      VARCHAR(25),
    customer_address    TEXT,
    invoice_date        DATETIME        NOT NULL,
    subtotal            DECIMAL(14,4)   NOT NULL,
    discount_amount     DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    tax_amount          DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    final_amount        DECIMAL(14,4)   NOT NULL,
    -- Multi-payment JSON: {"cash":150.00,"visa":50.00,"transfer":0,"wallet":0}
    payment_breakdown   JSON,
    payment_status      ENUM('paid','partial','unpaid') NOT NULL DEFAULT 'paid',
    notes               TEXT,
    status              ENUM('completed','cancelled','returned')
                                        NOT NULL DEFAULT 'completed',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_invoice_number (invoice_number),
    KEY idx_branch_date_status (branch_id, invoice_date, status),
    KEY idx_salesperson (salesperson_id),
    FOREIGN KEY fk_si_branch (branch_id) REFERENCES branches(id),
    FOREIGN KEY fk_si_user (salesperson_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `swm_sales_invoice_items`

```sql
CREATE TABLE swm_sales_invoice_items (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    invoice_id          INT UNSIGNED    NOT NULL,
    product_id          INT UNSIGNED    NOT NULL,
    variant_id          INT UNSIGNED,
    quantity            INT             NOT NULL,
    unit_price          DECIMAL(12,4)   NOT NULL,
    discount_pct        DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    discount_amount     DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    final_unit_price    DECIMAL(12,4)   NOT NULL,
    line_total          DECIMAL(14,4)   NOT NULL,
    cost_at_sale        DECIMAL(12,4),  -- Cost snapshot for profit calculation
    product_name        VARCHAR(255),   -- Snapshot
    product_code        VARCHAR(100),   -- Snapshot
    PRIMARY KEY (id),
    KEY idx_invoice (invoice_id),
    KEY idx_product (product_id),
    FOREIGN KEY fk_sii_invoice (invoice_id) REFERENCES swm_sales_invoices(id)
        ON DELETE CASCADE,
    FOREIGN KEY fk_sii_product (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `cash_registers`

```sql
CREATE TABLE cash_registers (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    register_code   VARCHAR(50)     NOT NULL,
    branch_id       INT UNSIGNED    NOT NULL,
    register_name   VARCHAR(100)    NOT NULL,
    is_main         BOOLEAN         NOT NULL DEFAULT FALSE,  -- HQ main cashbox
    current_balance DECIMAL(14,4)   NOT NULL DEFAULT 0.0000,
    opening_balance DECIMAL(14,4)   NOT NULL DEFAULT 0.0000,
    last_transfer_at DATETIME,
    status          ENUM('open','closed') NOT NULL DEFAULT 'open',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_register_code (register_code),
    KEY idx_branch (branch_id),
    FOREIGN KEY fk_cr_branch (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `cash_transfers`

```sql
CREATE TABLE cash_transfers (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    transfer_ref        VARCHAR(50)     NOT NULL,
    from_register_id    INT UNSIGNED    NOT NULL,
    to_register_id      INT UNSIGNED    NOT NULL,
    amount              DECIMAL(14,4)   NOT NULL,
    transfer_method     ENUM('manual_cash','bank_transfer','system')
                                        NOT NULL DEFAULT 'manual_cash',
    reference_no        VARCHAR(100),
    notes               TEXT,
    transferred_by      INT UNSIGNED    NOT NULL,
    received_by         INT UNSIGNED,
    status              ENUM('pending','completed','reversed')
                                        NOT NULL DEFAULT 'pending',
    transfer_at         DATETIME        NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_transfer_ref (transfer_ref),
    KEY idx_from_register (from_register_id),
    KEY idx_to_register (to_register_id),
    KEY idx_date (transfer_at),
    FOREIGN KEY fk_ct_from (from_register_id) REFERENCES cash_registers(id),
    FOREIGN KEY fk_ct_to (to_register_id) REFERENCES cash_registers(id),
    FOREIGN KEY fk_ct_by (transferred_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `expenses`

```sql
CREATE TABLE expenses (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    expense_ref     VARCHAR(50)     NOT NULL,
    branch_id       INT UNSIGNED    NOT NULL,
    category        ENUM('sales_expense','utility_bill','admin','payroll',
                         'maintenance','marketing','other') NOT NULL,
    subcategory     VARCHAR(100),
    amount          DECIMAL(12,4)   NOT NULL,
    description     TEXT,
    receipt_image   VARCHAR(512),
    expense_date    DATE            NOT NULL,
    recorded_by     INT UNSIGNED    NOT NULL,
    status          ENUM('pending','approved','rejected')
                                    NOT NULL DEFAULT 'pending',
    approved_by     INT UNSIGNED,
    approved_at     DATETIME,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_expense_ref (expense_ref),
    KEY idx_branch_date (branch_id, expense_date),
    KEY idx_category (category),
    KEY idx_status (status),
    FOREIGN KEY fk_exp_branch (branch_id) REFERENCES branches(id),
    FOREIGN KEY fk_exp_user (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `inventory_counts` (Stock-take sessions)

```sql
CREATE TABLE inventory_counts (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    count_session   VARCHAR(50)     NOT NULL,
    branch_id       INT UNSIGNED    NOT NULL,
    product_id      INT UNSIGNED    NOT NULL,
    variant_id      INT UNSIGNED,
    system_qty      INT             NOT NULL,
    actual_qty      INT             NOT NULL,
    difference      INT GENERATED ALWAYS AS (actual_qty - system_qty) STORED,
    discrepancy_type ENUM('match','shortage','surplus') GENERATED ALWAYS AS (
        CASE
            WHEN actual_qty = system_qty THEN 'match'
            WHEN actual_qty < system_qty THEN 'shortage'
            ELSE 'surplus'
        END
    ) STORED,
    notes           TEXT,
    counted_by      INT UNSIGNED    NOT NULL,
    count_date      DATE            NOT NULL,
    status          ENUM('draft','submitted','verified','adjusted')
                                    NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_session (count_session, branch_id),
    KEY idx_product (product_id),
    KEY idx_discrepancy (discrepancy_type),
    FOREIGN KEY fk_ic_branch (branch_id) REFERENCES branches(id),
    FOREIGN KEY fk_ic_product (product_id) REFERENCES products(id),
    FOREIGN KEY fk_ic_user (counted_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `inventory_movements` (Append-only audit trail — every stock change)

```sql
CREATE TABLE inventory_movements (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       INT UNSIGNED    NOT NULL,
    product_id      INT UNSIGNED    NOT NULL,
    variant_id      INT UNSIGNED,
    movement_type   ENUM(
        'purchase_in',       -- Received from supplier
        'distribution_out',  -- Sent to another branch
        'distribution_in',   -- Received from another branch
        'sale_out',          -- Sold in-branch POS
        'ecom_sale_out',     -- Sold via e-commerce
        'return_in',         -- Customer return
        'adjustment_in',     -- Inventory count surplus
        'adjustment_out',    -- Inventory count shortage
        'reserve',           -- Reserved for pending order
        'release'            -- Reservation released
    ) NOT NULL,
    quantity_change INT             NOT NULL,   -- Delta (+/-)
    quantity_before INT             NOT NULL,   -- Snapshot before change
    quantity_after  INT             NOT NULL,   -- Snapshot after change
    reference_type  VARCHAR(50),               -- 'purchase_invoice', 'ecom_order'
    reference_id    INT UNSIGNED,
    notes           VARCHAR(500),
    created_by      INT UNSIGNED,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_branch_product (branch_id, product_id),
    KEY idx_type (movement_type),
    KEY idx_reference (reference_type, reference_id),
    KEY idx_date (created_at),
    FOREIGN KEY fk_im_branch (branch_id) REFERENCES branches(id),
    FOREIGN KEY fk_im_product (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- NOTE: Partition by year when > 1M rows (see Section 5.5)
```

---

### 5.4 E-Commerce Tables

#### `ecp_customers`

```sql
CREATE TABLE ecp_customers (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    customer_code       VARCHAR(50)     NOT NULL,
    email               VARCHAR(150)    NOT NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    first_name          VARCHAR(100)    NOT NULL,
    last_name           VARCHAR(100)    NOT NULL,
    phone               VARCHAR(25),
    gender              ENUM('male','female','other'),
    date_of_birth       DATE,
    default_billing_addr  INT UNSIGNED,
    default_shipping_addr INT UNSIGNED,
    loyalty_points      INT             NOT NULL DEFAULT 0,
    loyalty_level       ENUM('bronze','silver','gold','platinum')
                                        NOT NULL DEFAULT 'bronze',
    lifetime_spend      DECIMAL(14,4)   NOT NULL DEFAULT 0.0000,
    email_verified      BOOLEAN         NOT NULL DEFAULT FALSE,
    verify_token        VARCHAR(255),
    reset_token         VARCHAR(255),
    reset_token_expires DATETIME,
    last_login          DATETIME,
    login_attempts      TINYINT         NOT NULL DEFAULT 0,
    locked_until        DATETIME,
    newsletter_subscribed BOOLEAN       NOT NULL DEFAULT FALSE,
    status              ENUM('active','inactive','suspended')
                                        NOT NULL DEFAULT 'active',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_customer_code (customer_code),
    KEY idx_loyalty (loyalty_level),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_customer_addresses`

```sql
CREATE TABLE ecp_customer_addresses (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    customer_id         INT UNSIGNED    NOT NULL,
    label               VARCHAR(50),
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    phone               VARCHAR(25),
    street_address      VARCHAR(300)    NOT NULL,
    apartment           VARCHAR(100),
    city                VARCHAR(100)    NOT NULL,
    state_province      VARCHAR(100),
    postal_code         VARCHAR(20),
    country             VARCHAR(100)    NOT NULL DEFAULT 'Egypt',
    is_default_billing  BOOLEAN         NOT NULL DEFAULT FALSE,
    is_default_shipping BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_customer (customer_id),
    FOREIGN KEY fk_addr_cust (customer_id) REFERENCES ecp_customers(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_shopping_carts`

```sql
CREATE TABLE ecp_shopping_carts (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    customer_id INT UNSIGNED,
    session_id  VARCHAR(255),   -- Guest session identifier
    expires_at  DATETIME        NOT NULL,
    coupon_code VARCHAR(50),
    notes       TEXT,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_customer (customer_id),
    KEY idx_session (session_id),
    KEY idx_expires (expires_at),
    FOREIGN KEY fk_cart_cust (customer_id) REFERENCES ecp_customers(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_cart_items`

```sql
CREATE TABLE ecp_cart_items (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    cart_id     INT UNSIGNED    NOT NULL,
    product_id  INT UNSIGNED    NOT NULL,
    variant_id  INT UNSIGNED,
    quantity    INT             NOT NULL,
    unit_price  DECIMAL(12,4)   NOT NULL,   -- Price at time of adding to cart
    added_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cart_product_variant (cart_id, product_id, variant_id),
    KEY idx_product (product_id),
    FOREIGN KEY fk_ci_cart (cart_id) REFERENCES ecp_shopping_carts(id)
        ON DELETE CASCADE,
    FOREIGN KEY fk_ci_product (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_orders`

```sql
CREATE TABLE ecp_orders (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    order_number        VARCHAR(50)     NOT NULL,   -- ECO-2026-00001
    customer_id         INT UNSIGNED,
    guest_email         VARCHAR(150),
    billing_address     JSON            NOT NULL,   -- Snapshot at order time
    shipping_address    JSON            NOT NULL,   -- Snapshot at order time
    subtotal            DECIMAL(14,4)   NOT NULL,
    tax_amount          DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    shipping_cost       DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    discount_amount     DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    coupon_code         VARCHAR(50),
    total_amount        DECIMAL(14,4)   NOT NULL,
    order_status        ENUM('pending','processing','ready_to_ship',
                             'shipped','in_transit','delivered',
                             'completed','cancelled','returned')
                                        NOT NULL DEFAULT 'pending',
    payment_status      ENUM('pending','paid','failed','refunded','partial_refund')
                                        NOT NULL DEFAULT 'pending',
    payment_method      VARCHAR(100),
    payment_gateway     VARCHAR(50),    -- 'stripe','paypal','cod'
    payment_gateway_txn VARCHAR(255),
    shipping_carrier    VARCHAR(100),
    shipping_method     VARCHAR(100),
    tracking_number     VARCHAR(255),
    tracking_url        VARCHAR(512),
    estimated_delivery  DATE,
    shipped_at          DATETIME,
    delivered_at        DATETIME,
    fulfilling_branch_id INT UNSIGNED,
    customer_notes      TEXT,
    admin_notes         TEXT,
    swm_order_ref       VARCHAR(50),    -- Link to SWM system if needed
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_number (order_number),
    KEY idx_customer (customer_id),
    KEY idx_status_date (order_status, created_at),
    KEY idx_payment_status (payment_status),
    KEY idx_branch (fulfilling_branch_id),
    FOREIGN KEY fk_ord_cust (customer_id) REFERENCES ecp_customers(id)
        ON DELETE SET NULL,
    FOREIGN KEY fk_ord_branch (fulfilling_branch_id) REFERENCES branches(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_order_items`

```sql
CREATE TABLE ecp_order_items (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    order_id        INT UNSIGNED    NOT NULL,
    product_id      INT UNSIGNED    NOT NULL,
    variant_id      INT UNSIGNED,
    product_name    VARCHAR(255)    NOT NULL,   -- Snapshot (names can change)
    product_sku     VARCHAR(100)    NOT NULL,   -- Snapshot
    variant_desc    VARCHAR(255),               -- e.g. "Red / Large"
    quantity        INT             NOT NULL,
    unit_price      DECIMAL(12,4)   NOT NULL,
    unit_cost       DECIMAL(12,4),              -- For profit calculation
    discount_amount DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    line_total      DECIMAL(14,4)   NOT NULL,
    PRIMARY KEY (id),
    KEY idx_order (order_id),
    KEY idx_product (product_id),
    FOREIGN KEY fk_oi_order (order_id) REFERENCES ecp_orders(id)
        ON DELETE CASCADE,
    FOREIGN KEY fk_oi_product (product_id) REFERENCES products(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_payments`

```sql
CREATE TABLE ecp_payments (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    order_id        INT UNSIGNED    NOT NULL,
    payment_ref     VARCHAR(50)     NOT NULL,
    amount          DECIMAL(14,4)   NOT NULL,
    currency        CHAR(3)         NOT NULL DEFAULT 'EGP',
    payment_method  VARCHAR(100)    NOT NULL,
    gateway         VARCHAR(50),
    gateway_txn_id  VARCHAR(255),
    gateway_response JSON,
    status          ENUM('pending','processing','completed','failed',
                         'refunded','partially_refunded')
                                    NOT NULL DEFAULT 'pending',
    refund_amount   DECIMAL(14,4)   NOT NULL DEFAULT 0.0000,
    processed_at    DATETIME,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_ref (payment_ref),
    KEY idx_order (order_id),
    KEY idx_status (status),
    FOREIGN KEY fk_pay_order (order_id) REFERENCES ecp_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_returns`

```sql
CREATE TABLE ecp_returns (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    return_number   VARCHAR(50)     NOT NULL,
    order_id        INT UNSIGNED    NOT NULL,
    customer_id     INT UNSIGNED,
    reason          VARCHAR(255)    NOT NULL,
    description     TEXT,
    images          JSON,
    return_label    VARCHAR(512),
    tracking_number VARCHAR(255),
    refund_amount   DECIMAL(14,4),
    refund_method   VARCHAR(100),
    refund_status   ENUM('pending','processing','completed','rejected')
                                    NOT NULL DEFAULT 'pending',
    status          ENUM('requested','approved','in_transit',
                         'received','completed','rejected')
                                    NOT NULL DEFAULT 'requested',
    processed_by    INT UNSIGNED,
    notes           TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_return_number (return_number),
    KEY idx_order (order_id),
    KEY idx_status (status),
    FOREIGN KEY fk_ret_order (order_id) REFERENCES ecp_orders(id),
    FOREIGN KEY fk_ret_cust (customer_id) REFERENCES ecp_customers(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_reviews`

```sql
CREATE TABLE ecp_reviews (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    product_id      INT UNSIGNED    NOT NULL,
    customer_id     INT UNSIGNED    NOT NULL,
    order_id        INT UNSIGNED,   -- Verified purchase link
    rating          TINYINT         NOT NULL,   -- 1-5
    title           VARCHAR(255),
    content         TEXT,
    images          JSON,
    helpful_count   INT             NOT NULL DEFAULT 0,
    unhelpful_count INT             NOT NULL DEFAULT 0,
    admin_reply     TEXT,
    admin_reply_at  DATETIME,
    status          ENUM('pending','approved','rejected')
                                    NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_customer_product (customer_id, product_id),
    KEY idx_product_rating (product_id, rating),
    KEY idx_status (status),
    FOREIGN KEY fk_rev_product (product_id) REFERENCES products(id),
    FOREIGN KEY fk_rev_customer (customer_id) REFERENCES ecp_customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_coupons`

```sql
CREATE TABLE ecp_coupons (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    code                VARCHAR(50)     NOT NULL,
    description         TEXT,
    discount_type       ENUM('percentage','fixed','free_shipping','bogo') NOT NULL,
    discount_value      DECIMAL(10,4)   NOT NULL,
    max_discount_amount DECIMAL(12,4),
    minimum_order       DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    usage_limit         INT,
    usage_per_customer  TINYINT         NOT NULL DEFAULT 1,
    usage_count         INT             NOT NULL DEFAULT 0,
    applicable_products JSON,
    applicable_categories JSON,
    excluded_products   JSON,
    valid_from          DATETIME        NOT NULL,
    valid_until         DATETIME,
    status              ENUM('active','inactive','expired')
                                        NOT NULL DEFAULT 'active',
    created_by          INT UNSIGNED,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_code (code),
    KEY idx_status_dates (status, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_promotions`

```sql
CREATE TABLE ecp_promotions (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    banner_image        VARCHAR(512),
    promotion_type      ENUM('percentage','fixed_amount','bogo','free_shipping') NOT NULL,
    discount_value      DECIMAL(10,4),
    minimum_purchase    DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    applicable_products JSON,
    applicable_categories JSON,
    excluded_products   JSON,
    start_date          DATETIME        NOT NULL,
    end_date            DATETIME        NOT NULL,
    max_discount        DECIMAL(12,4),
    usage_limit         INT,
    usage_count         INT             NOT NULL DEFAULT 0,
    priority            TINYINT         NOT NULL DEFAULT 0,
    status              ENUM('active','inactive','scheduled')
                                        NOT NULL DEFAULT 'scheduled',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_dates (start_date, end_date),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_wishlist`

```sql
CREATE TABLE ecp_wishlist (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    customer_id INT UNSIGNED    NOT NULL,
    product_id  INT UNSIGNED    NOT NULL,
    variant_id  INT UNSIGNED,
    added_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cust_product (customer_id, product_id, variant_id),
    FOREIGN KEY fk_wl_cust (customer_id) REFERENCES ecp_customers(id)
        ON DELETE CASCADE,
    FOREIGN KEY fk_wl_prod (product_id) REFERENCES products(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ecp_messages` (Support tickets)

```sql
CREATE TABLE ecp_messages (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    ticket_ref      VARCHAR(50)     NOT NULL,
    customer_id     INT UNSIGNED,
    order_id        INT UNSIGNED,
    guest_email     VARCHAR(150),
    subject         VARCHAR(255),
    message         TEXT            NOT NULL,
    message_type    ENUM('inquiry','complaint','return_request','feedback')
                                    NOT NULL DEFAULT 'inquiry',
    priority        ENUM('low','medium','high','urgent')
                                    NOT NULL DEFAULT 'medium',
    assigned_to     INT UNSIGNED,
    status          ENUM('open','in_progress','waiting_customer','resolved','closed')
                                    NOT NULL DEFAULT 'open',
    resolved_at     DATETIME,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ticket_ref (ticket_ref),
    KEY idx_customer (customer_id),
    KEY idx_status (status),
    KEY idx_priority (priority),
    FOREIGN KEY fk_msg_cust (customer_id) REFERENCES ecp_customers(id)
        ON DELETE SET NULL,
    FOREIGN KEY fk_msg_order (order_id) REFERENCES ecp_orders(id)
        ON DELETE SET NULL,
    FOREIGN KEY fk_msg_agent (assigned_to) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5.5 Integration & Cross-Cutting Tables

#### `sync_events`

```sql
CREATE TABLE sync_events (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_type      VARCHAR(100)    NOT NULL,
    source_system   ENUM('swm','ecom','system') NOT NULL,
    payload         JSON            NOT NULL,
    status          ENUM('pending','processing','completed','failed','retrying')
                                    NOT NULL DEFAULT 'pending',
    retry_count     TINYINT         NOT NULL DEFAULT 0,
    error_message   TEXT,
    processed_at    DATETIME,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_event_type (event_type),
    KEY idx_status (status),
    KEY idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `audit_logs`

```sql
CREATE TABLE audit_logs (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED,
    user_role       VARCHAR(50),
    action          VARCHAR(100)    NOT NULL,
    resource_type   VARCHAR(50)     NOT NULL,
    resource_id     VARCHAR(50),
    old_values      JSON,
    new_values      JSON,
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user (user_id),
    KEY idx_action (action, resource_type),
    KEY idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `notifications`

```sql
CREATE TABLE notifications (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    recipient_type  ENUM('user','customer') NOT NULL,
    recipient_id    INT UNSIGNED    NOT NULL,
    channel         ENUM('in_app','email','sms') NOT NULL DEFAULT 'in_app',
    title           VARCHAR(255)    NOT NULL,
    message         TEXT            NOT NULL,
    action_url      VARCHAR(512),
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at         DATETIME,
    sent_at         DATETIME,
    status          ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_recipient (recipient_type, recipient_id, is_read),
    KEY idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5.6 Partitioning Strategy (Apply when tables exceed 1M rows)

```sql
-- inventory_movements: partition by year
ALTER TABLE inventory_movements
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p2027 VALUES LESS THAN (2028),
    PARTITION p2028 VALUES LESS THAN (2029),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- audit_logs: partition by year
ALTER TABLE audit_logs
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p2027 VALUES LESS THAN (2028),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

---

## 6. API Architecture Design

### SWM Internal API Endpoints

```
POST   /api/v1/auth/login               Login (returns JWT + refresh token)
POST   /api/v1/auth/refresh             Refresh access token
POST   /api/v1/auth/logout              Invalidate session

GET    /api/v1/branches                 List branches
POST   /api/v1/branches                 Create branch
GET    /api/v1/users                    List users
POST   /api/v1/users                    Create user (admin only)

GET    /api/v1/products                 List products (filter: category, brand, status)
POST   /api/v1/products                 Create product
PUT    /api/v1/products/:id             Update product
GET    /api/v1/products/:id/barcode     Generate barcode PDF/PNG
POST   /api/v1/products/import          Bulk import from Excel
GET    /api/v1/products/export          Export to Excel/CSV

GET    /api/v1/inventory                Stock per branch/product
GET    /api/v1/inventory/low-stock      Items below reorder level
GET    /api/v1/inventory/movements      Movement history

GET    /api/v1/suppliers                List suppliers
POST   /api/v1/suppliers                Create supplier
GET    /api/v1/suppliers/:id/statement  Detailed account statement
POST   /api/v1/suppliers/:id/pay        Record payment

GET    /api/v1/purchases                List purchase invoices
POST   /api/v1/purchases                Create invoice + auto inventory update
GET    /api/v1/purchases/:id/print      PDF invoice

GET    /api/v1/distributions            List distribution orders
POST   /api/v1/distributions            Create transfer
PUT    /api/v1/distributions/:id/status Confirm/complete

GET    /api/v1/sales                    List POS sales
POST   /api/v1/sales                    Create POS sale (multi-payment)
POST   /api/v1/sales/:id/cancel         Cancel (restores inventory)
GET    /api/v1/sales/:id/print          PDF receipt

GET    /api/v1/cash-registers           List cashboxes
POST   /api/v1/cash-transfers           Record branch -> HQ transfer
GET    /api/v1/expenses                 List expenses
POST   /api/v1/expenses                 Create expense
PUT    /api/v1/expenses/:id/approve     Approve/reject expense

POST   /api/v1/inventory-counts/start   Begin stock-take session
POST   /api/v1/inventory-counts/submit  Submit count data
GET    /api/v1/inventory-counts/:session/report  Discrepancy report

GET    /api/v1/reports/daily-summary    Daily branch summary
GET    /api/v1/reports/sales            Sales report (date range, branch)
GET    /api/v1/reports/inventory        Stock report
GET    /api/v1/reports/profit-loss      P&L report
GET    /api/v1/reports/supplier-balances  Supplier account balances
GET    /api/v1/reports/cash-flow        Cash flow by branch
```

### E-Commerce Public API Endpoints

```
POST   /api/v1/auth/register            Customer registration
POST   /api/v1/auth/login               Customer login
POST   /api/v1/auth/forgot-password     Send reset email
POST   /api/v1/auth/reset-password      Reset with token
POST   /api/v1/auth/verify-email        Email verification

GET    /api/v1/products                 Paginated product listing with filters
GET    /api/v1/products/:slug           Product detail by URL slug
GET    /api/v1/products/search?q=       Full-text product search
GET    /api/v1/categories               Category tree
GET    /api/v1/products/featured        Homepage featured products
GET    /api/v1/products/new-arrivals    Newest products
GET    /api/v1/products/on-sale         Active sale products

GET    /api/v1/cart                     Get current cart
POST   /api/v1/cart/add                 Add item (triggers 15-min reservation)
PUT    /api/v1/cart/:item_id            Update quantity
DELETE /api/v1/cart/:item_id            Remove item
POST   /api/v1/cart/apply-coupon        Apply discount code
DELETE /api/v1/cart/coupon              Remove coupon

POST   /api/v1/checkout/calculate       Estimate shipping + tax
POST   /api/v1/checkout/place-order     Atomic: create order + deduct inventory
POST   /api/v1/checkout/stripe/intent   Create Stripe Payment Intent
POST   /api/v1/checkout/stripe/confirm  Confirm Stripe payment
POST   /api/v1/checkout/paypal/create   Create PayPal order
POST   /api/v1/checkout/paypal/capture  Capture PayPal payment
POST   /api/v1/checkout/cod             Cash on Delivery order

GET    /api/v1/orders                   Customer order history
GET    /api/v1/orders/:order_number     Order detail + tracking
POST   /api/v1/orders/:id/cancel        Cancel pending order
POST   /api/v1/orders/:id/return        Create return request

GET    /api/v1/account/profile          Get profile
PUT    /api/v1/account/profile          Update profile
GET    /api/v1/account/addresses        List addresses
POST   /api/v1/account/addresses        Add address
GET    /api/v1/account/wishlist         Get wishlist
POST   /api/v1/account/wishlist/:pid    Add product to wishlist

GET    /api/v1/products/:id/reviews     Reviews (paginated)
POST   /api/v1/products/:id/reviews     Submit review (verified purchase)

POST   /api/v1/support/ticket           Create support ticket
GET    /api/v1/support/tickets          My tickets
```

---

## 7. Integration Layer — Sync Engine

### Sync Architecture

```
Event Occurs (e.g. E-Com order placed)
         |
         v
  [BullMQ Job Queue] -- Backed by Redis
         |
         v
   [Queue Worker Process]
         |
   +-----+------+----------+
   |            |           |
Inventory   Product      Email
 Handler     Handler     Handler
   |
MySQL Transaction
(Row-level LOCK + atomic update + movement log)
```

### Core Sync Workers

#### 1. E-Commerce Order -> Inventory Deduction

```javascript
async function handleNewEcomOrder(job) {
  const { orderId, items } = job.data;

  await db.transaction(async (trx) => {
    for (const item of items) {
      // Row-level lock prevents race with simultaneous POS sales
      const inv = await trx('inventory_balances')
        .where({ product_id: item.product_id, branch_id: process.env.ECOM_BRANCH_ID })
        .forUpdate()
        .first();

      if (!inv || inv.available_qty < item.quantity) {
        throw new Error(`Insufficient stock: product ${item.product_id}`);
      }

      await trx('inventory_balances')
        .where({ product_id: item.product_id, branch_id: process.env.ECOM_BRANCH_ID })
        .update({
          available_qty: inv.available_qty - item.quantity,
          sold_qty: inv.sold_qty + item.quantity
        });

      await trx('inventory_movements').insert({
        branch_id: process.env.ECOM_BRANCH_ID,
        product_id: item.product_id,
        movement_type: 'ecom_sale_out',
        quantity_change: -item.quantity,
        quantity_before: inv.available_qty,
        quantity_after: inv.available_qty - item.quantity,
        reference_type: 'ecom_order',
        reference_id: orderId
      });
    }
  });
}
```

#### 2. Cart Reservation (15-min inventory hold)

```javascript
async function reserveCartItem(cartId, productId, variantId, qty) {
  await db.transaction(async (trx) => {
    const inv = await trx('inventory_balances')
      .where({ product_id: productId, branch_id: process.env.ECOM_BRANCH_ID })
      .forUpdate().first();

    if (!inv || inv.available_qty < qty) throw new Error('Out of stock');

    await trx('inventory_balances')
      .where({ product_id: productId, branch_id: process.env.ECOM_BRANCH_ID })
      .update({
        available_qty: trx.raw(`available_qty - ${qty}`),
        reserved_qty:  trx.raw(`reserved_qty + ${qty}`)
      });
  });

  // Release after 15 minutes via delayed BullMQ job
  await releaseQueue.add('release-reservation',
    { cartId, productId, variantId, qty },
    { delay: 15 * 60 * 1000 }
  );
}
```

#### 3. Price Propagation (SWM -> ECP)

```javascript
async function broadcastPriceChange(productId, newPrice, slug) {
  await db('products')
    .where('id', productId)
    .update({ selling_price: newPrice, updated_at: new Date() });

  // Invalidate Redis cache
  await redis.del(`product:${productId}`, `product:slug:${slug}`);

  await db('sync_events').insert({
    event_type: 'product.price_changed',
    source_system: 'swm',
    payload: JSON.stringify({ product_id: productId, new_price: newPrice }),
    status: 'completed'
  });
}
```

---

## 8. Authentication & Authorization

### JWT Token Flow

```
Login -> Validate credentials -> bcrypt compare
  |
  +-- SUCCESS -> Generate:
  |              - Access Token (JWT, 15 min)
  |              - Refresh Token (UUID, hashed+stored in DB, 7 days)
  |
  +-- FAILURE -> Increment login_attempts
                 If >= 5 -> Lock account 15 minutes
                 Return HTTP 401
```

### Permission Matrix

| Permission | super_admin | admin | supervisor | salesperson | content_manager | customer_service |
|-----------|:-----------:|:-----:|:----------:|:-----------:|:---------------:|:----------------:|
| All branches data | YES | YES | NO | NO | NO | NO |
| Own branch only | YES | YES | YES | YES | -- | -- |
| Create purchase invoices | YES | YES | NO | NO | NO | NO |
| Create POS sales | YES | YES | YES | YES | NO | NO |
| Approve expenses | YES | YES | YES | NO | NO | NO |
| Full financial reports | YES | YES | Branch only | NO | NO | NO |
| Manage products (SWM) | YES | YES | NO | NO | NO | NO |
| Manage products (ECP) | YES | YES | NO | NO | YES | NO |
| Process customer returns | YES | YES | NO | NO | NO | YES |
| Inventory transfers | YES | YES | NO | NO | NO | NO |
| User management | YES | YES | NO | NO | NO | NO |

### Middleware

```javascript
// middleware/auth.js
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token expired' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, error: 'Forbidden' });
  next();
};

const requireBranchAccess = (req, res, next) => {
  const { role, branch_id } = req.user;
  if (['super_admin', 'admin'].includes(role)) return next();
  const requested = req.params.branchId || req.query.branch_id;
  if (requested && parseInt(requested) !== branch_id)
    return res.status(403).json({ success: false, error: 'Branch access denied' });
  next();
};
```

---

## 9. Security Plan

### Encryption Standards

| Data | Method |
|------|--------|
| Passwords (users & customers) | bcrypt cost=12 |
| Payment card data | NOT stored (Stripe tokenization only) |
| JWT refresh tokens | SHA-256 hashed before DB storage |
| Sensitive PII fields | AES-256 |
| Data in transit | TLS 1.3 (Cloudflare + Nginx) |
| MySQL at rest | InnoDB tablespace encryption |

### Rate Limiting

```javascript
// General: 200 req/15min
app.use('/api/', rateLimit({ windowMs: 900000, max: 200 }));

// Auth endpoints: 10 req/15min
app.use('/api/*/auth/login', rateLimit({
  windowMs: 900000, max: 10,
  message: { success: false, error: 'Too many login attempts, try again later' }
}));
```

### Security Headers (Nginx)

```nginx
add_header X-Frame-Options            "SAMEORIGIN" always;
add_header X-Content-Type-Options     "nosniff" always;
add_header X-XSS-Protection           "1; mode=block" always;
add_header Referrer-Policy            "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security  "max-age=31536000; includeSubDomains" always;
```

### PCI Compliance

- **Never** store raw card numbers or CVVs
- Use **Stripe Payment Intents** — card data never touches our servers
- Stripe.js iframe handles card input (isolated from our code)
- 3D Secure 2 (SCA) required for all card transactions

---

## 10. File Storage & Media Management

### Image Pipeline

```
Upload (admin) -> Max 10 MB, JPG/PNG/WebP
     |
     v
Sharp.js Processing:
  +-- Resize 800x800 (large)
  +-- Resize 400x400 (medium)
  +-- Resize 150x150 (thumbnail)
  +-- Convert all to WebP
     |
     v
Store: /var/www/yoka/uploads/products/{product_id}/
     |
     v
Nginx serves static files directly (no Node.js overhead)
     |
     v
Cloudflare CDN caches globally (edge distribution)
```

### PDF Generation

```javascript
// PDFKit with Arabic font support (Cairo / Amiri font)
const generateInvoicePDF = async (invoiceId) => {
  const data = await getInvoiceData(invoiceId);
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const path = `/var/www/yoka/uploads/invoices/${invoiceId}.pdf`;
  doc.pipe(fs.createWriteStream(path));
  // Build PDF with Arabic RTL text
  doc.end();
  return path;
};
```

---

## 11. Caching Strategy

### Redis Cache TTL Table

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| `product:{id}` | 30 min | Product updated |
| `product:slug:{slug}` | 30 min | Product updated |
| `products:cat:{id}:page:{n}` | 15 min | Any product in category updated |
| `categories:tree` | 2 hours | Category CRUD |
| `inventory:{branch}:{product}` | 5 min | Sale / transfer made |
| `cart:{cart_id}` | 24 hours | Cart modified |
| `report:daily:{date}:{branch}` | 1 hour | Manual invalidation only |
| `coupon:{code}` | 5 min | Coupon updated |
| `homepage:featured` | 30 min | Promotion updated |

---

## 12. Background Jobs & Queue System

### Job Catalog

| Job | Trigger | Description |
|-----|---------|-------------|
| `inventory.ecom.deduct` | Order placed | Deduct stock, log movement |
| `inventory.cart.reserve` | Item added to cart | Reserve for 15 min |
| `inventory.cart.release` | Cart expired | Release reservation |
| `email.order.confirmation` | Order placed | Customer email |
| `email.order.status` | Order status changed | Customer notification |
| `email.low.stock.alert` | Cron: every 30 min | Alert admin |
| `report.daily.generate` | Cron: 23:59 daily | Pre-generate reports |
| `coupon.expire.check` | Cron: 00:01 daily | Mark expired coupons |
| `cart.cleanup` | Cron: every 5 min | Delete expired carts |
| `backup.database` | Cron: 03:00 daily | MySQL dump + upload |

### BullMQ Worker

```javascript
import { Worker } from 'bullmq';

const connection = { host: 'localhost', port: 6379, password: process.env.REDIS_PASS };

const inventoryWorker = new Worker('inventory-sync', async (job) => {
  switch (job.name) {
    case 'ecom.deduct':   return handleEcomDeduction(job.data);
    case 'cart.reserve':  return handleCartReservation(job.data);
    case 'cart.release':  return handleCartRelease(job.data);
  }
}, { connection, concurrency: 5 });

const emailWorker = new Worker('email', async (job) => {
  return sendEmail(job.data.template, job.data.to, job.data.data);
}, { connection, concurrency: 10 });
```

---

## 13. Reporting & Analytics Engine

### SWM Reports

| Report | Filters | Export |
|--------|---------|--------|
| Daily Branch Summary | Branch, Date | PDF, Excel |
| Sales by Period | Branch, Salesperson, Date Range | PDF, Excel |
| Profit & Loss | Branch, Date Range | PDF |
| Inventory Balance | Branch, Category | PDF, Excel |
| Inventory Movement History | Branch, Product, Date | Excel |
| Supplier Account Statement | Supplier, Date Range | PDF |
| Cash Flow | Branch, Date Range | Excel |
| Salesperson Performance | Branch, Date | PDF |
| Stock-take Discrepancy | Branch, Session | PDF |

### E-Commerce Reports

| Report | Export |
|--------|--------|
| Orders Summary (daily/weekly/monthly) | Excel |
| Revenue Report | PDF, Excel |
| Best / Worst Selling Products | Excel |
| Customer Analysis (new vs returning) | Excel |
| Coupon Performance | PDF |
| Return Rate Analysis | Excel |
| Cart Abandonment Rate | Charts |

### Database Views for Fast Reporting

```sql
-- Daily branch sales summary view
CREATE VIEW v_daily_branch_sales AS
SELECT
    si.branch_id,
    b.branch_name,
    DATE(si.invoice_date)    AS sale_date,
    COUNT(si.id)             AS invoice_count,
    SUM(si.final_amount)     AS total_revenue,
    SUM(si.discount_amount)  AS total_discounts,
    SUM(sii.line_total - (sii.quantity * COALESCE(sii.cost_at_sale, 0))) AS gross_profit
FROM swm_sales_invoices si
JOIN branches b ON b.id = si.branch_id
JOIN swm_sales_invoice_items sii ON sii.invoice_id = si.id
WHERE si.status = 'completed'
GROUP BY si.branch_id, b.branch_name, DATE(si.invoice_date);

-- Inventory health view
CREATE VIEW v_inventory_health AS
SELECT
    p.product_code, p.product_name, p.brand,
    pc.category_name, b.branch_name,
    ib.available_qty, ib.reserved_qty, p.reorder_level,
    CASE
        WHEN ib.available_qty = 0 THEN 'out_of_stock'
        WHEN ib.available_qty <= p.reorder_level THEN 'reorder_needed'
        WHEN ib.available_qty <= p.low_stock_threshold THEN 'low_stock'
        ELSE 'in_stock'
    END AS stock_status,
    (ib.available_qty * p.cost_price) AS stock_value_at_cost
FROM inventory_balances ib
JOIN products p ON p.id = ib.product_id
JOIN branches b ON b.id = ib.branch_id
JOIN product_categories pc ON pc.id = p.category_id;
```

---

## 14. Backup & Disaster Recovery

### Backup Schedule (cron)

```bash
# Full DB dump: 3:00 AM daily
0 3 * * * root /var/www/yoka/scripts/backup_full.sh

# Binary log backup: every 30 minutes (for point-in-time recovery)
*/30 * * * * root /var/www/yoka/scripts/backup_binlog.sh

# File uploads backup: 2:00 AM daily
0 2 * * * root /var/www/yoka/scripts/backup_uploads.sh
```

### Backup Script

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/yoka/daily"

mysqldump --single-transaction --routines --triggers --hex-blob \
  -u $DB_USER -p$DB_PASS yoka_db | gzip > "${BACKUP_DIR}/yoka_${DATE}.sql.gz"

# Upload to Hostinger Object Storage
rclone copy "${BACKUP_DIR}/yoka_${DATE}.sql.gz" "remote:yoka-backups/daily/"

# Keep only last 30 days locally
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
echo "[$(date)] Backup completed: yoka_${DATE}.sql.gz"
```

### Recovery Time Objectives

| Scenario | RTO |
|----------|-----|
| Single table recovery | < 30 min |
| Full database loss | < 2 hours |
| Server failure (new VPS rebuild) | < 4 hours |
| Point-in-time recovery | < 1 hour |

---

## 15. Scalability Plan

### Phase 1: Single VPS (Launch)

```
1x Hostinger KVM 2 (2 vCPU, 8 GB RAM)
All services on one machine
Capacity: ~50 concurrent users, 10 branches, 1,000 orders/day
```

### Phase 2: Database Separation (When MySQL CPU > 70%)

```
VPS 1 (App + Cache)         VPS 2 (Database)
+-- Nginx                   +-- MySQL Primary (writes)
+-- Node.js Apps (PM2)      +-- MySQL Replica (reads)
+-- Redis 7
Capacity: ~200 concurrent, 20 branches, 5,000 orders/day
```

### Phase 3: Full Horizontal Scaling

```
[Cloudflare Load Balancing]
    +------ App VPS 1 ------+
    +------ App VPS 2 ------+  (identical)
           |
    [MySQL Cluster]    [Redis Sentinel]
    +-- Primary (W)    +-- Master
    +-- Replica 1 (R)  +-- Replica
    +-- Replica 2 (R)
Capacity: ~2,000 concurrent, 50+ branches, 50,000 orders/day
```

### Scaling Milestones

| Trigger | Action |
|---------|--------|
| inventory_movements > 1M rows | Enable partitioning |
| MySQL CPU > 70% sustained | Add read replica |
| Redis memory > 4 GB | Upgrade instance |
| Response time > 500ms avg | Profile + optimize queries |

---

## 16. Development Phases & Roadmap

### Phase 0: Setup & Foundation (Week 1-2)

```
[ ] Provision Hostinger VPS (Ubuntu 22.04)
[ ] Install: Nginx, MySQL 8.0, Redis 7, PM2, Node.js 20
[ ] Configure SSL with Let's Encrypt + Cloudflare DNS
[ ] Create yoka_db with all migration scripts
[ ] Set up Git repositories + GitHub Actions CI/CD
[ ] Configure .env files and secrets management
[ ] Set up automated backup cron jobs
```

### Phase 1: SWM Core (Week 3-8)

```
[ ] JWT Authentication (role-based, branch-scoped)
[ ] Branches & Users management
[ ] Suppliers management + account statement reports
[ ] Product catalog CRUD (barcode generation, Excel import/export)
[ ] Purchase invoices (auto inventory update, PDF generation)
[ ] Distribution orders (inter-branch stock transfers)
[ ] POS sales interface (multi-payment, keyboard shortcuts F1/F2/F12)
[ ] Cash register & transfer system
[ ] Expenses module (categories, approval workflow)
[ ] SWM Admin dashboard (KPI cards, Recharts)
[ ] Core reports (daily summary, sales, inventory)
```

### Phase 2: E-Commerce Core (Week 9-14)

```
[ ] Product catalog sync from SWM products
[ ] Customer auth (register, login, email verify, reset password)
[ ] Product listing (filters, sort, pagination, full-text search)
[ ] Product detail (variants, gallery, reviews)
[ ] Shopping cart (session + logged-in, 15-min reservation)
[ ] Checkout flow (address -> shipping -> payment)
[ ] Stripe payment integration + Stripe webhook handler
[ ] Cash on Delivery option
[ ] Order management (create, track, cancel)
[ ] Customer account dashboard (orders, addresses, wishlist)
[ ] Transactional emails (order confirmation, status updates)
```

### Phase 3: Integration Engine (Week 12-15, parallel)

```
[ ] BullMQ queue setup + all workers
[ ] E-Com order -> inventory deduction (atomic with row locking)
[ ] Price change propagation (SWM -> Redis cache invalidation)
[ ] Cart reservation + automatic release (delayed jobs)
[ ] Race condition testing and fix
[ ] Sync event logging and monitoring dashboard
[ ] Retry logic with exponential backoff
```

### Phase 4: Advanced Features (Week 16-20)

```
[ ] Inventory Count / Stock-take module (session-based, PDF report)
[ ] Advanced reports (P&L, cash flow, supplier statements)
[ ] Coupons & Promotions engine
[ ] Product reviews & ratings (with verified purchase check)
[ ] Customer loyalty points system
[ ] Support ticket system with agent assignment
[ ] Admin E-Commerce panel (order fulfillment, review moderation)
```

### Phase 5: Polish & Launch (Week 21-24)

```
[ ] Load testing with k6 (target: 200 concurrent users)
[ ] Security review (OWASP Top 10)
[ ] Arabic RTL UI testing and fixes
[ ] UAT with client
[ ] Staff training documentation and videos
[ ] Production DNS cutover
[ ] Monitoring: PM2 + UptimeRobot uptime checks
[ ] Go-live!
```

### Phase 6: Post-Launch (Month 3-4)

```
[ ] PWA (Progressive Web App) for storefront
[ ] Shipment tracking integration (Aramex / Bosta)
[ ] WhatsApp notification integration
[ ] Advanced analytics dashboard
[ ] Additional payment gateways (Fawry, Paymob for Egypt)
[ ] Mobile app evaluation (React Native)
```

---

## 17. Environment Setup Guide (Hostinger VPS)

### Step-by-Step Server Setup

```bash
# 1. Update system
apt update && apt upgrade -y
apt install -y curl git nginx ufw certbot python3-certbot-nginx rclone

# 2. Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# 3. MySQL 8.0
apt install -y mysql-server
mysql_secure_installation   # Follow prompts: set root password, remove anon users

# 4. Redis 7
apt install -y redis-server
# Edit /etc/redis/redis.conf: requirepass YOUR_REDIS_PASSWORD
systemctl restart redis

# 5. Create database and user
mysql -u root -p <<EOF
CREATE DATABASE yoka_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'yoka_user'@'localhost' IDENTIFIED BY 'StrongP@ssword!';
GRANT ALL PRIVILEGES ON yoka_db.* TO 'yoka_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# 6. Directory structure
mkdir -p /var/www/yoka/{swm-backend,ecom-backend,swm-frontend,ecom-frontend,uploads}
mkdir -p /var/www/yoka/uploads/{products,invoices,barcodes,receipts}
chown -R www-data:www-data /var/www/yoka/uploads

# 7. Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# 8. SSL certificates
certbot --nginx -d yokastore.com -d www.yokastore.com -d admin.yokastore.com

# 9. PM2 auto-start on reboot
pm2 startup systemd -u root --hp /root
```

### Environment Variables

```bash
# ---- swm-backend/.env.production ----
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=yoka_db
DB_USER=yoka_user
DB_PASS=StrongP@ssword!
REDIS_URL=redis://:YourRedisPass@localhost:6379
JWT_SECRET=your_jwt_secret_at_least_32_characters
JWT_REFRESH_SECRET=another_different_32_char_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=noreply@yokastore.com
SMTP_PASS=your_email_password
APP_URL=https://admin.yokastore.com
UPLOADS_PATH=/var/www/yoka/uploads

# ---- ecom-backend/.env.production ----
NODE_ENV=production
PORT=3002
DB_HOST=localhost
DB_PORT=3306
DB_NAME=yoka_db
DB_USER=yoka_user
DB_PASS=StrongP@ssword!
REDIS_URL=redis://:YourRedisPass@localhost:6379
JWT_SECRET=your_jwt_secret_at_least_32_characters
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
APP_URL=https://www.yokastore.com
ECOM_BRANCH_ID=1
```

---

## 18. Cost Estimation

### Monthly Infrastructure Costs

| Item | Provider | Cost/Month |
|------|----------|-----------|
| VPS KVM 2 (Phase 1, 2 vCPU, 8 GB) | Hostinger | ~$12-18 |
| VPS KVM 4 (Phase 2+, 4 vCPU, 16 GB) | Hostinger | ~$25-40 |
| Domain (.com) | Any registrar | ~$1 |
| SSL Certificate | Let's Encrypt | FREE |
| CDN / WAF | Cloudflare Free Plan | FREE |
| Email Hosting | Hostinger (bundled) | FREE |
| Backup Storage | Hostinger Object Storage | ~$3-5 |
| Stripe (payment processing) | Stripe | 2.9% + $0.30/txn |
| **Total Phase 1** | | **~$16-24/month** |
| **Total Phase 2+** | | **~$30-50/month** |

### Development Estimate

| Phase | Duration | Team Size |
|-------|----------|-----------|
| Phase 0 — Setup | 2 weeks | 1 developer |
| Phase 1 — SWM Core | 6 weeks | 2 developers |
| Phase 2 — E-Commerce Core | 6 weeks | 2 developers |
| Phase 3 — Integration Engine | 4 weeks | 1-2 developers |
| Phase 4 — Advanced Features | 5 weeks | 2 developers |
| Phase 5 — Polish & Launch | 4 weeks | 2 developers |
| **Total** | **~27 weeks** | **2 developers** |

---

## Appendix: Complete Database Schema Summary

```
SHARED CORE TABLES (no prefix)
  branches              -- physical locations (main warehouse, retail, ecom)
  users                 -- all staff: admin, supervisor, salesperson, CS, etc.
  product_categories    -- hierarchical (parent/child), shared by SWM & ECP
  products              -- master product: pricing, media, SEO, thresholds
  product_variants      -- color / size / material variants per product
  inventory_balances    -- real-time stock quantity per branch per product

SWM TABLES
  suppliers             -- vendor records + running balance
  supplier_payments     -- payments to / receipts from suppliers
  purchase_invoices     -- goods received + financial recording
  purchase_invoice_items
  distribution_orders   -- inter-branch stock transfers
  distribution_order_items
  swm_sales_invoices    -- POS in-branch sales (multi-payment JSON)
  swm_sales_invoice_items
  cash_registers        -- per-branch cashboxes + HQ main cashbox
  cash_transfers        -- branch -> HQ daily cash handover
  expenses              -- branch expenses with approval workflow
  inventory_counts      -- stock-take session records with auto discrepancy

E-COMMERCE TABLES (ecp_)
  ecp_customers         -- online customer accounts + loyalty
  ecp_customer_addresses
  ecp_shopping_carts    -- active carts (registered + guest)
  ecp_cart_items
  ecp_orders            -- online orders (JSON address snapshots)
  ecp_order_items       -- with product/price snapshots
  ecp_payments          -- payment gateway records
  ecp_returns           -- return requests + refund tracking
  ecp_reviews           -- star ratings + comments + admin reply
  ecp_coupons           -- discount codes
  ecp_promotions        -- automatic promotions (BOGO, flash sales)
  ecp_wishlist
  ecp_messages          -- support tickets with agent assignment

CROSS-CUTTING TABLES
  inventory_movements   -- append-only audit trail of EVERY stock change
  sync_events           -- integration event log (SWM <-> ECP)
  audit_logs            -- user action trail across both systems
  notifications         -- in-app / email / SMS notification queue
```

---

## 19. System Activity Log

Every user action across the entire platform — SWM and ECP — is recorded in a centralized, queryable, tamper-evident log system. This provides full operational transparency, forensic accountability, security auditing, and compliance-ready reporting.

---

### 19.1 Log Architecture Overview

```
User performs action
       |
       v
[Express Middleware — logActivity()]
       |
       +-- Captures: user, role, branch, IP, device, action, before/after values
       |
       v
[BullMQ Log Queue]  <-- Async, non-blocking (never slows the response)
       |
       v
[Log Worker Process]
       |
       +-- Writes to: activity_logs table (MySQL)
       +-- Writes to: /var/log/yoka/activity-YYYY-MM-DD.log (flat file)
       +-- High-severity events --> alert_events table + Email/SMS to admin
       |
       v
[Log Viewer API]  <-- Searchable, filterable, exportable
[Log Viewer UI]   <-- Admin dashboard page with live tail
```

**Design Goals:**
- **Non-blocking:** Log writes are queued asynchronously — zero impact on response time
- **Immutable:** Logs are append-only; no update or delete permissions granted to the app user
- **Structured:** Every log entry is a complete, self-contained JSON-compatible record
- **Searchable:** Full indexed filtering by user, branch, action, resource, date range
- **Exportable:** CSV / Excel / PDF export for audits
- **Alertable:** Critical actions trigger real-time admin alerts

---

### 19.2 Database Schema — Activity Logs

#### Primary Table: `activity_logs`

```sql
CREATE TABLE activity_logs (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- WHO performed the action
    actor_type          ENUM('staff','customer','system','api_key')
                                        NOT NULL DEFAULT 'staff',
    actor_id            INT UNSIGNED,           -- FK to users.id or ecp_customers.id
    actor_username      VARCHAR(100),           -- Snapshot (user may be deleted later)
    actor_full_name     VARCHAR(255),           -- Snapshot
    actor_role          VARCHAR(50),            -- Snapshot of role at time of action
    actor_email         VARCHAR(150),           -- Snapshot

    -- WHERE (branch context)
    branch_id           INT UNSIGNED,           -- NULL = system/global action
    branch_name         VARCHAR(255),           -- Snapshot
    branch_code         VARCHAR(20),            -- Snapshot

    -- WHAT was done
    action_category     ENUM(
        -- Authentication
        'auth',
        -- User & access management
        'user_management',
        -- Product & catalog
        'product',
        -- Inventory operations
        'inventory',
        -- Purchase / supplier
        'purchasing',
        -- Inter-branch distribution
        'distribution',
        -- In-branch POS sales
        'pos_sales',
        -- Cash & financial
        'cash_finance',
        -- Expenses
        'expenses',
        -- E-Commerce orders
        'ecom_orders',
        -- E-Commerce customers
        'ecom_customers',
        -- E-Commerce promotions
        'ecom_promotions',
        -- Reporting
        'reports',
        -- System & settings
        'system_settings',
        -- Inventory count / stock-take
        'inventory_count',
        -- Support tickets
        'support',
        -- Data export / import
        'data_transfer'
    ) NOT NULL,

    action_type         ENUM(
        'login', 'logout', 'login_failed', 'password_reset',
        'account_locked', 'account_unlocked', 'token_refreshed',
        'create', 'read', 'update', 'delete', 'restore',
        'approve', 'reject', 'cancel', 'complete',
        'export', 'import', 'print', 'download',
        'transfer', 'adjust', 'reserve', 'release',
        'send', 'assign', 'escalate',
        'bulk_create', 'bulk_update', 'bulk_delete'
    ) NOT NULL,

    -- The resource that was affected
    resource_type       VARCHAR(80)     NOT NULL,
    -- e.g. 'product', 'purchase_invoice', 'ecom_order', 'user', 'cash_register'
    resource_id         VARCHAR(50),            -- ID of the affected record
    resource_ref        VARCHAR(100),           -- Human-readable ref (invoice no, order no)
    resource_label      VARCHAR(255),           -- Friendly name (product name, customer name)

    -- CHANGE snapshot (what changed)
    old_values          JSON,                   -- State before the action
    new_values          JSON,                   -- State after the action
    changed_fields      JSON,                   -- Array of field names that changed
    -- e.g. ["selling_price", "status"]

    -- REQUEST context
    ip_address          VARCHAR(45)     NOT NULL,  -- IPv4 or IPv6
    ip_country          VARCHAR(50),               -- Geo-lookup (optional)
    user_agent          VARCHAR(500),
    device_type         ENUM('desktop','mobile','tablet','api','unknown')
                                        NOT NULL DEFAULT 'unknown',
    session_id          VARCHAR(255),              -- To group actions in one session
    request_id          VARCHAR(36),               -- UUID for distributed tracing
    api_endpoint        VARCHAR(200),              -- e.g. PUT /api/v1/products/42
    http_method         ENUM('GET','POST','PUT','PATCH','DELETE') DEFAULT 'POST',

    -- OUTCOME
    status              ENUM('success','failure','partial')
                                        NOT NULL DEFAULT 'success',
    error_message       TEXT,                   -- If status = failure
    duration_ms         SMALLINT UNSIGNED,      -- How long the action took (ms)

    -- SEVERITY (for alerting)
    severity            ENUM('info','warning','critical')
                                        NOT NULL DEFAULT 'info',

    -- NOTES
    notes               TEXT,                   -- Admin-added annotation (post-hoc)
    flagged             BOOLEAN         NOT NULL DEFAULT FALSE,  -- Manual flag for review
    flagged_by          INT UNSIGNED,
    flagged_at          DATETIME,
    flag_reason         VARCHAR(500),

    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    -- Core lookup indexes
    KEY idx_actor          (actor_type, actor_id),
    KEY idx_actor_username (actor_username),
    KEY idx_branch         (branch_id),
    KEY idx_category       (action_category),
    KEY idx_action_type    (action_type),
    KEY idx_resource       (resource_type, resource_id),
    KEY idx_status         (status),
    KEY idx_severity       (severity),
    KEY idx_date           (created_at),
    KEY idx_ip             (ip_address),
    KEY idx_flagged        (flagged),

    -- Composite indexes for common dashboard queries
    KEY idx_branch_date    (branch_id, created_at),
    KEY idx_actor_date     (actor_id, created_at),
    KEY idx_category_date  (action_category, created_at),
    KEY idx_severity_date  (severity, created_at),

    -- Foreign keys (soft references — logs survive user deletion)
    FOREIGN KEY fk_al_branch  (branch_id) REFERENCES branches(id)
        ON DELETE SET NULL,
    FOREIGN KEY fk_al_flagger (flagged_by) REFERENCES users(id)
        ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- NOTE: Partition by month when table exceeds 2M rows
```

#### Partitioning for Long-Term Log Storage

```sql
-- Partition activity_logs by month (logs grow fast)
ALTER TABLE activity_logs
PARTITION BY RANGE (MONTH(created_at)) (
    PARTITION p01 VALUES LESS THAN (2),
    PARTITION p02 VALUES LESS THAN (3),
    PARTITION p03 VALUES LESS THAN (4),
    PARTITION p04 VALUES LESS THAN (5),
    PARTITION p05 VALUES LESS THAN (6),
    PARTITION p06 VALUES LESS THAN (7),
    PARTITION p07 VALUES LESS THAN (8),
    PARTITION p08 VALUES LESS THAN (9),
    PARTITION p09 VALUES LESS THAN (10),
    PARTITION p10 VALUES LESS THAN (11),
    PARTITION p11 VALUES LESS THAN (12),
    PARTITION p12 VALUES LESS THAN MAXVALUE
);
```

#### Supporting Table: `alert_events` (Critical log alerts)

```sql
CREATE TABLE alert_events (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    log_id              BIGINT UNSIGNED NOT NULL,   -- References activity_logs.id
    alert_type          VARCHAR(100)    NOT NULL,
    -- e.g. 'multiple_login_failures', 'large_discount_applied',
    --      'bulk_delete', 'after_hours_access', 'unusual_ip'
    alert_message       TEXT            NOT NULL,
    acknowledged        BOOLEAN         NOT NULL DEFAULT FALSE,
    acknowledged_by     INT UNSIGNED,
    acknowledged_at     DATETIME,
    resolution_notes    TEXT,
    notified_channels   JSON,   -- ["email", "sms", "in_app"]
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_log (log_id),
    KEY idx_acknowledged (acknowledged),
    KEY idx_date (created_at),
    FOREIGN KEY fk_ae_log (log_id) REFERENCES activity_logs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Supporting Table: `log_annotations` (Admin notes on log entries)

```sql
CREATE TABLE log_annotations (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    log_id      BIGINT UNSIGNED NOT NULL,
    annotated_by INT UNSIGNED   NOT NULL,
    note        TEXT            NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_log (log_id),
    FOREIGN KEY fk_la_log  (log_id) REFERENCES activity_logs(id),
    FOREIGN KEY fk_la_user (annotated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 19.3 What Gets Logged — Action Catalog

#### Authentication Events

| Action | Severity | Details Captured |
|--------|----------|------------------|
| Successful login | info | user, IP, device, timestamp |
| Failed login attempt | warning | username tried, IP, attempt count |
| Account locked (5 fails) | critical | user, IP, lock expiry |
| Account manually unlocked | warning | actor (admin), unlocked user |
| Password reset requested | info | user, IP |
| Password changed | warning | user, IP, old hash (masked) |
| Token refreshed | info | user, session ID |
| Logout | info | user, session duration |
| Login from new/unusual IP | critical | user, old IPs vs new IP |

#### Product & Catalog Events

| Action | Severity | Details Captured |
|--------|----------|------------------|
| Product created | info | all fields, actor, branch |
| Product updated | info | changed fields only (old vs new) |
| Price changed | warning | old price, new price, % change |
| Product deactivated | warning | product, actor, reason |
| Product published to ECP | info | product, visibility setting |
| Bulk product import | info | count, file name, errors |
| Bulk product export | info | count, filters applied |
| Barcode generated/printed | info | product, actor |

#### Inventory Events

| Action | Severity | Details Captured |
|--------|----------|------------------|
| Stock adjusted (manual) | warning | product, branch, old qty, new qty, delta, reason |
| Inventory count submitted | info | session ID, branch, product count, discrepancy count |
| Discrepancy verified | warning | product, branch, shortage/surplus amount |
| Low stock alert triggered | info | product, branch, current qty, reorder level |
| Out-of-stock alert | warning | product, branch |

#### Purchasing Events

| Action | Severity | Details Captured |
|--------|----------|------------------|
| Purchase invoice created | info | supplier, invoice no, amount, items count |
| Purchase invoice completed | info | invoice no, total received |
| Purchase invoice cancelled | warning | invoice no, reason, actor |
| Supplier payment recorded | info | supplier, amount, method, reference |
| Supplier balance changed | info | old balance, new balance |

#### Distribution Events

| Action | Severity | Details Captured |
|--------|----------|------------------|
| Distribution order created | info | source branch, dest branch, items count |
| Distribution approved | info | order no, approved by |
| Distribution completed | info | order no, actual quantities received |
| Distribution cancelled | warning | order no, reason |

#### POS Sales Events

| Action | Severity | Details Captured |
|--------|----------|------------------|
| Sale created | info | invoice no, branch, salesperson, amount, payment breakdown |
| Sale cancelled | warning | invoice no, reason, cancelled by |
| Discount applied (> threshold) | warning | product, original price, discounted price, % |
| Sale with multiple payments | info | cash, visa, transfer amounts |
| Cash drawer opened | info | register, salesperson, timestamp |

#### Cash & Finance Events

| Action | Severity | Details Captured |
|--------|----------|------------------|
| Cash transfer created | warning | from register, to register, amount, transferred by |
| Cash transfer completed | info | transfer ref, received by |
| Cash transfer reversed | critical | transfer ref, reason, reversal by |
| Expense created | info | branch, category, amount, recorded by |
| Expense approved | info | expense ref, approved by |
| Expense rejected | warning | expense ref, rejection reason |
| Large expense (> threshold) | critical | amount, category, actor |

#### E-Commerce Events

| Action | Severity | Details Captured |
|--------|----------|------------------|
| Order placed | info | order no, customer, items, total, payment method |
| Order status changed | info | order no, old status, new status, changed by |
| Order cancelled | warning | order no, reason, cancelled by |
| Payment received | info | order no, amount, gateway, transaction ID |
| Payment failed | warning | order no, amount, gateway error |
| Refund processed | warning | order no, refund amount, method |
| Return approved | info | return no, order no, refund amount |
| Review approved/rejected | info | review ID, product, action by |
| Coupon created | info | code, discount type, value, valid range |
| Promotion activated | info | promo name, dates, discount |

#### System & Settings Events

| Action | Severity | Details Captured |
|--------|----------|------------------|
| User created | warning | new username, role, branch, created by |
| User role changed | critical | old role, new role, changed by |
| User deactivated/suspended | critical | user, reason, changed by |
| Branch created | info | branch name, code, type |
| Branch settings changed | warning | field, old value, new value |
| System config changed | critical | config key, old value, new value |
| Backup initiated | info | type (full/incremental), size |
| Data bulk deleted | critical | table, count, actor, reason |

---

### 19.4 Log Middleware Implementation

```javascript
// middleware/activityLogger.js

import { logQueue } from '../queues/logQueue.js';
import { detectDevice } from '../utils/deviceDetect.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Core log function — called from controllers after action completes.
 * Queued async so it NEVER blocks the HTTP response.
 */
export const logActivity = async ({
  req,                  // Express request object
  actorType = 'staff',  // 'staff' | 'customer' | 'system'
  actor,                // Full user object from req.user
  branchId,             // Branch context
  branchName,
  branchCode,
  actionCategory,       // e.g. 'pos_sales'
  actionType,           // e.g. 'create'
  resourceType,         // e.g. 'swm_sales_invoice'
  resourceId,
  resourceRef,          // e.g. 'SI-B01-2026-00001'
  resourceLabel,        // e.g. 'Invoice #SI-B01-2026-00001'
  oldValues = null,
  newValues = null,
  changedFields = null,
  status = 'success',
  errorMessage = null,
  durationMs = null,
  severity = 'info',
  notes = null
}) => {
  // Build the log payload
  const payload = {
    actor_type:      actorType,
    actor_id:        actor?.id ?? null,
    actor_username:  actor?.username ?? actor?.email ?? 'system',
    actor_full_name: actor?.full_name ?? actor?.first_name + ' ' + actor?.last_name ?? 'System',
    actor_role:      actor?.role ?? 'system',
    actor_email:     actor?.email ?? null,

    branch_id:    branchId ?? actor?.branch_id ?? null,
    branch_name:  branchName ?? null,
    branch_code:  branchCode ?? null,

    action_category: actionCategory,
    action_type:     actionType,

    resource_type:  resourceType,
    resource_id:    String(resourceId ?? ''),
    resource_ref:   resourceRef ?? null,
    resource_label: resourceLabel ?? null,

    old_values:     oldValues ? JSON.stringify(oldValues) : null,
    new_values:     newValues ? JSON.stringify(newValues) : null,
    changed_fields: changedFields ? JSON.stringify(changedFields) : null,

    ip_address:   req?.ip ?? req?.connection?.remoteAddress ?? '0.0.0.0',
    ip_country:   null,  // Populated asynchronously via IP lookup if configured
    user_agent:   req?.headers?.['user-agent']?.substring(0, 500) ?? null,
    device_type:  detectDevice(req?.headers?.['user-agent']),
    session_id:   req?.headers?.['x-session-id'] ?? null,
    request_id:   req?.headers?.['x-request-id'] ?? uuidv4(),
    api_endpoint: `${req?.method} ${req?.originalUrl}` ?? null,
    http_method:  req?.method ?? null,

    status,
    error_message: errorMessage,
    duration_ms:   durationMs,
    severity,
    notes
  };

  // Push to async BullMQ queue — non-blocking
  await logQueue.add('write-activity-log', payload, {
    removeOnComplete: true,
    attempts: 3
  });

  // If critical: also enqueue an alert immediately
  if (severity === 'critical') {
    await logQueue.add('process-alert', payload, { priority: 1 });
  }
};
```

#### Log Queue Worker

```javascript
// workers/logWorker.js
import { Worker } from 'bullmq';
import db from '../db.js';
import { checkAlertRules } from '../services/alertService.js';
import fs from 'fs';
import path from 'path';

const logWorker = new Worker('activity-log', async (job) => {
  if (job.name === 'write-activity-log') {
    // 1. Write to MySQL activity_logs table
    const [logId] = await db('activity_logs').insert(job.data);

    // 2. Write to daily flat log file (JSON Lines format)
    const date = new Date().toISOString().split('T')[0];
    const logFile = `/var/log/yoka/activity-${date}.log`;
    const line = JSON.stringify({ id: logId, ...job.data }) + '\n';
    fs.appendFileSync(logFile, line, 'utf8');

    // 3. Check alert rules
    await checkAlertRules(logId, job.data);
  }

  if (job.name === 'process-alert') {
    await handleCriticalAlert(job.data);
  }
}, {
  connection: redis,
  concurrency: 10
});

async function handleCriticalAlert(logData) {
  // Insert into alert_events
  const [alertId] = await db('alert_events').insert({
    log_id: logData.id,
    alert_type: `${logData.action_category}.${logData.action_type}`,
    alert_message: buildAlertMessage(logData),
    notified_channels: JSON.stringify(['email', 'in_app'])
  });

  // Send email to super_admin(s)
  const admins = await db('users').where({ role: 'super_admin', status: 'active' });
  for (const admin of admins) {
    await emailQueue.add('send', {
      template: 'critical_alert',
      to: admin.email,
      data: { alert: logData, alertId }
    });
  }

  // Create in-app notification for all admins
  const notifs = admins.map(a => ({
    recipient_type: 'user',
    recipient_id: a.id,
    channel: 'in_app',
    title: `[ALERT] ${logData.action_category} — ${logData.action_type}`,
    message: buildAlertMessage(logData),
    action_url: `/admin/logs/${logData.id}`
  }));
  await db('notifications').insert(notifs);
}
```

#### Helper: Auto-detect Changed Fields

```javascript
// utils/diffValues.js

/**
 * Compares two objects and returns:
 * - changedFields: array of field names that differ
 * - oldValues: subset of old object with only changed fields
 * - newValues: subset of new object with only changed fields
 */
export function diffObjects(oldObj, newObj, excludeFields = ['updated_at', 'created_at']) {
  const changedFields = [];
  const oldValues = {};
  const newValues = {};

  for (const key of Object.keys(newObj)) {
    if (excludeFields.includes(key)) continue;
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changedFields.push(key);
      oldValues[key] = oldObj[key];
      newValues[key] = newObj[key];
    }
  }

  return { changedFields, oldValues, newValues };
}
```

#### Usage in a Controller

```javascript
// controllers/productController.js

export const updateProduct = async (req, res) => {
  const startTime = Date.now();
  const { id } = req.params;

  // Fetch before-state
  const before = await db('products').where({ id }).first();

  // Apply the update
  await db('products').where({ id }).update(req.body);
  const after = await db('products').where({ id }).first();

  // Compute diff
  const { changedFields, oldValues, newValues } = diffObjects(before, after);

  // Determine severity (price change = warning, else info)
  const severity = changedFields.includes('selling_price') ? 'warning' : 'info';

  // Log the action (async — does not block response)
  await logActivity({
    req,
    actorType: 'staff',
    actor: req.user,
    branchId: req.user.branch_id,
    actionCategory: 'product',
    actionType: 'update',
    resourceType: 'product',
    resourceId: id,
    resourceRef: after.product_code,
    resourceLabel: after.product_name,
    oldValues,
    newValues,
    changedFields,
    status: 'success',
    durationMs: Date.now() - startTime,
    severity
  });

  return res.json({ success: true, data: after });
};
```

---

### 19.5 Alert Rules Engine

```javascript
// services/alertService.js

const ALERT_RULES = [
  {
    id: 'multiple_login_failures',
    description: 'Same IP fails login 5+ times in 10 minutes',
    check: async (log) => {
      if (log.action_type !== 'login_failed') return false;
      const count = await db('activity_logs')
        .where({ ip_address: log.ip_address, action_type: 'login_failed' })
        .where('created_at', '>=', db.raw('NOW() - INTERVAL 10 MINUTE'))
        .count('id as cnt').first();
      return count.cnt >= 5;
    },
    severity: 'critical'
  },
  {
    id: 'large_cash_transfer',
    description: 'Cash transfer exceeds threshold (5,000 EGP)',
    check: async (log) => {
      if (log.action_category !== 'cash_finance' || log.action_type !== 'transfer') return false;
      const amount = log.new_values?.amount ?? 0;
      return parseFloat(amount) >= 5000;
    },
    severity: 'critical'
  },
  {
    id: 'bulk_delete',
    description: 'Any bulk delete operation',
    check: (log) => log.action_type === 'bulk_delete',
    severity: 'critical'
  },
  {
    id: 'role_escalation',
    description: 'User role upgraded to admin or super_admin',
    check: (log) => {
      if (log.action_type !== 'update' || log.resource_type !== 'user') return false;
      const newRole = log.new_values?.role;
      return ['admin', 'super_admin'].includes(newRole);
    },
    severity: 'critical'
  },
  {
    id: 'after_hours_access',
    description: 'Staff login outside working hours (11PM-6AM)',
    check: (log) => {
      if (log.action_type !== 'login') return false;
      const hour = new Date().getHours();
      return hour >= 23 || hour < 6;
    },
    severity: 'warning'
  },
  {
    id: 'high_discount',
    description: 'Discount applied above 30% on a single item',
    check: (log) => {
      if (log.action_category !== 'pos_sales') return false;
      const discountPct = log.new_values?.discount_pct ?? 0;
      return parseFloat(discountPct) >= 30;
    },
    severity: 'warning'
  },
  {
    id: 'price_drop_gt_20pct',
    description: 'Product selling price reduced by more than 20%',
    check: (log) => {
      if (log.action_category !== 'product') return false;
      const oldPrice = parseFloat(log.old_values?.selling_price ?? 0);
      const newPrice = parseFloat(log.new_values?.selling_price ?? 0);
      if (!oldPrice || !newPrice) return false;
      return ((oldPrice - newPrice) / oldPrice) > 0.20;
    },
    severity: 'warning'
  },
  {
    id: 'unusual_export',
    description: 'Large data export (products/customers list)',
    check: (log) => log.action_type === 'export',
    severity: 'warning'
  }
];

export async function checkAlertRules(logId, logData) {
  for (const rule of ALERT_RULES) {
    try {
      const triggered = await rule.check(logData);
      if (triggered) {
        await db('alert_events').insert({
          log_id: logId,
          alert_type: rule.id,
          alert_message: `[${rule.severity.toUpperCase()}] ${rule.description}`,
          notified_channels: JSON.stringify(['in_app'])
        });
      }
    } catch (err) {
      console.error(`Alert rule [${rule.id}] check failed:`, err);
    }
  }
}
```

---

### 19.6 Log Viewer API Endpoints

```
-- All endpoints require authentication + 'super_admin' or 'admin' role

GET  /api/v1/logs
     Query params:
       - actor_id         (filter by specific user)
       - actor_username   (partial search)
       - branch_id        (filter by branch)
       - action_category  (filter by category)
       - action_type      (filter by action type)
       - resource_type    (filter by resource)
       - resource_ref     (search invoice number, order number, etc.)
       - severity         (info | warning | critical)
       - status           (success | failure)
       - ip_address       (filter by IP)
       - device_type      (desktop | mobile | api)
       - date_from        (ISO 8601 datetime)
       - date_to          (ISO 8601 datetime)
       - flagged          (true | false)
       - page             (pagination)
       - per_page         (default: 50, max: 200)
       - sort             (created_at_desc | created_at_asc)
     Response: paginated list of log entries

GET  /api/v1/logs/:id
     Full log entry detail including old_values/new_values diff

GET  /api/v1/logs/stats
     Query params: branch_id, date_from, date_to
     Response: summary counts by category, action type, severity

GET  /api/v1/logs/timeline
     Query params: actor_id, date
     Response: chronological timeline of one user's full day actions

GET  /api/v1/logs/alerts
     Response: paginated list of alert_events (unacknowledged first)

PUT  /api/v1/logs/alerts/:id/acknowledge
     Body: { resolution_notes }
     Marks alert as acknowledged + records who resolved it

POST /api/v1/logs/:id/flag
     Body: { flag_reason }
     Manually flags a log entry for follow-up review

DELETE /api/v1/logs/:id/flag
     Removes flag

POST /api/v1/logs/:id/annotate
     Body: { note }
     Adds admin annotation to a log entry

GET  /api/v1/logs/export
     Query params: (same filters as GET /logs)
     Format: CSV or Excel
     Returns: downloadable file of matching log entries
```

---

### 19.7 Log Viewer UI (Admin Dashboard)

The log viewer is embedded in the SWM Admin Dashboard as a dedicated page. Features:

**Filters Panel (sidebar)**
```
[ Branch dropdown          ]   [ Action Category        ]
[ User search (typeahead)  ]   [ Severity: info/warn/crit]
[ Date range picker        ]   [ Status: success/failure ]
[ IP address input         ]   [ Flagged only toggle     ]
[ Resource type dropdown   ]   [ Resource ref search     ]
                    [ Apply Filters ] [ Reset ]
```

**Log Table Columns**
```
| # | Timestamp (local) | Actor | Role | Branch | Category | Action | Resource | Status | Severity | IP | Device |
```

**Row Expansion** — clicking a log row reveals:
```
+-- Actor Details: full name, username, email, role at time
+-- Request: IP, device type, user agent, endpoint, request ID, duration
+-- Resource: type, ID, reference number, label
+-- Changes: side-by-side diff of old_values vs new_values
|   Field            | Before              | After
|   selling_price    | 250.00 EGP          | 199.00 EGP  (changed)
|   status           | active              | active
+-- Annotations: existing notes + add note form
+-- Actions: [Flag for Review] [Export This Entry]
```

**Live Tail Mode** — toggleable real-time log stream using Server-Sent Events (SSE):
```javascript
// SSE endpoint: GET /api/v1/logs/stream
// Pushes new critical/warning log entries in real time to the admin dashboard
app.get('/api/v1/logs/stream', authenticate, requireRole('super_admin', 'admin'), (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const intervalId = setInterval(async () => {
    const recent = await db('activity_logs')
      .where('severity', 'in', ['warning', 'critical'])
      .where('created_at', '>=', db.raw('NOW() - INTERVAL 5 SECOND'))
      .orderBy('created_at', 'desc')
      .limit(10);

    if (recent.length) {
      res.write(`data: ${JSON.stringify(recent)}\n\n`);
    }
  }, 5000);

  req.on('close', () => clearInterval(intervalId));
});
```

**Alert Center** — dedicated panel showing unacknowledged critical alerts:
```
[!] CRITICAL — Role Escalation
    user 'ahmed_store' was granted 'admin' role by 'moustafa_admin'
    Branch: Cairo HQ | 2026-09-23 01:15:33
    IP: 105.198.x.x | Device: Desktop
    [ Acknowledge ] [ View Full Log ] [ Contact User ]
```

---

### 19.8 Log Retention & Archival Policy

| Log Age | Storage Location | Action |
|---------|-----------------|--------|
| 0–3 months | MySQL `activity_logs` (hot, fully indexed) | Normal queries |
| 3–12 months | MySQL `activity_logs_archive` (less indexed) | Moved by cron job |
| 12–24 months | Compressed JSON files on VPS + Object Storage | Downloadable |
| 24+ months | Hostinger Object Storage (cold archive) | Retained for compliance |

#### Monthly Archival Cron

```bash
# /etc/cron.d/yoka-log-archive
# Run 1st of every month at 02:00 AM: archive logs older than 90 days
0 2 1 * * root /var/www/yoka/scripts/archive_logs.sh
```

```bash
#!/bin/bash
# archive_logs.sh

CUTOFF=$(date -d '90 days ago' +%Y-%m-%d)
ARCHIVE_FILE="/var/backups/yoka/logs/activity_logs_before_${CUTOFF}.json.gz"

# Export old records to compressed JSON file
mysql -u $DB_USER -p$DB_PASS yoka_db \
  -e "SELECT * FROM activity_logs WHERE created_at < '${CUTOFF}'" \
  | python3 -c "import sys,json; [print(json.dumps(r)) for r in json.load(sys.stdin)]" \
  | gzip > "${ARCHIVE_FILE}"

# Upload to Object Storage
rclone copy "${ARCHIVE_FILE}" "remote:yoka-backups/log-archive/"

# Delete archived records from hot table
mysql -u $DB_USER -p$DB_PASS yoka_db \
  -e "DELETE FROM activity_logs WHERE created_at < '${CUTOFF}' LIMIT 50000;"

echo "[$(date)] Log archival complete: before ${CUTOFF}"
```

---

### 19.9 Flat File Log Format (JSON Lines)

Every action is also written to daily rotating log files for easy grep, tail, and external SIEM integration:

```
/var/log/yoka/
+-- activity-2026-09-23.log   <- today (active)
+-- activity-2026-09-22.log
+-- activity-2026-09-21.log
+-- ...rotated automatically by logrotate
```

**Single log line format (JSON Lines — one JSON object per line):**

```json
{
  "id": 100291,
  "ts": "2026-09-23T01:15:33+03:00",
  "actor": { "id": 3, "username": "ahmed_cashier", "role": "salesperson", "name": "Ahmed Mostafa" },
  "branch": { "id": 2, "code": "BR-02", "name": "Maadi Branch" },
  "action": { "category": "pos_sales", "type": "create" },
  "resource": { "type": "swm_sales_invoice", "id": "4821", "ref": "SI-B02-2026-04821", "label": "Invoice #SI-B02-2026-04821" },
  "values": {
    "new": { "final_amount": 375.00, "payment_breakdown": { "cash": 200, "visa": 175 } }
  },
  "request": { "ip": "192.168.1.12", "device": "desktop", "endpoint": "POST /api/v1/sales", "duration_ms": 142 },
  "status": "success",
  "severity": "info"
}
```

**Logrotate config** (`/etc/logrotate.d/yoka`):

```
/var/log/yoka/activity-*.log {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    notifempty
    dateext
    dateformat -%Y-%m-%d
}
```

---

### 19.10 System Log Summary Table

| Attribute | Specification |
|-----------|---------------|
| **Log Storage** | MySQL `activity_logs` (hot) + JSON flat files (daily rotation) |
| **Log Categories** | 18 categories covering all system domains |
| **Fields per Entry** | 35+ fields (actor, branch, action, resource, diff, request, severity) |
| **Write Strategy** | Async via BullMQ (non-blocking, 3 retries) |
| **Indexing** | 12 indexes including 4 composite indexes for dashboard queries |
| **Partitioning** | Monthly (applied at 2M+ rows) |
| **Alert Rules** | 8 built-in rules (login failures, role escalation, bulk delete, etc.) |
| **Alert Channels** | In-app notification + Email to super_admin(s) |
| **Retention (hot)** | 90 days in MySQL |
| **Retention (archive)** | 12 months on VPS + 24 months on Object Storage |
| **Live Tail** | SSE endpoint pushes warning/critical events every 5 seconds |
| **Export** | CSV / Excel with full filter support |
| **Flat File Format** | JSON Lines — grep-friendly, SIEM-compatible |
| **Immutability** | App DB user has no DELETE/UPDATE on `activity_logs` |

---

> **Document:** Yoka Store Full Technical Plan v1.1  
> **Source Analysis Files:**  
> - نظام إدارة المبيعات والمخازن المتعددة (تحليل شامل)  
> - نظام متجر التجارة الإلكترونية (تحليل شامل)  
> **Infrastructure Target:** Hostinger VPS — Ubuntu 22.04 LTS  
> **Prepared:** September 2026
