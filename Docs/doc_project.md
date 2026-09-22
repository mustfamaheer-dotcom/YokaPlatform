# Yoka Store Order Management System (OMS) — Complete Project Documentation

> **Document Version**: 1.0.0  
> **Target Audience**: Software Engineers, Technical Architects, DevOps Engineers, and Product Auditors  
> **Source Repository**: `Yoka Store System`  
> **Generated**: September 2026

---

# Table of Contents
1. [Executive Summary & Project Overview](#1-executive-summary--project-overview)
   - [1.1 Purpose & Problem Statement](#11-purpose--problem-statement)
   - [1.2 Target Users & Roles](#12-target-users--roles)
   - [1.3 High-Level Architecture Summary](#13-high-level-architecture-summary)
   - [1.4 Technology Stack & Dependencies](#14-technology-stack--dependencies)
2. [Architecture & System Structure](#2-architecture--system-structure)
   - [2.1 Codebase Folder & File Breakdown](#21-codebase-folder--file-breakdown)
   - [2.2 System Architecture Diagram](#22-system-architecture-diagram)
   - [2.3 End-to-End Data Flow](#23-end-to-end-data-flow)
   - [2.4 Key Design Patterns](#24-key-design-patterns)
   - [2.5 Sequence Diagrams](#25-sequence-diagrams)
3. [Setup & Installation Guide](#3-setup--installation-guide)
   - [3.1 Prerequisites](#31-prerequisites)
   - [3.2 Windows Automated Setup (`setup-client.bat` & `start-all.bat`)](#32-windows-automated-setup-setup-clientbat--start-allbat)
   - [3.3 Step-by-Step Manual Installation](#33-step-by-step-manual-installation)
   - [3.4 Environment Variables Reference](#34-environment-variables-reference)
   - [3.5 Running the Test Suite](#35-running-the-test-suite)
4. [Core Modules & Business Logic](#4-core-modules--business-logic)
   - [4.1 Analytics Engine (`analyticsEngine.ts`)](#41-analytics-engine-analyticsenginets)
   - [4.2 Order Engine (`orderEngine.ts`)](#42-order-engine-orderenginets)
   - [4.3 Payment Engine (`paymentEngine.ts`)](#43-payment-engine-paymentenginets)
   - [4.4 Return Engine (`returnEngine.ts`)](#44-return-engine-returnenginets)
   - [4.5 Seller Engine (`sellerEngine.ts`)](#45-seller-engine-sellerenginets)
   - [4.6 Daily Close Engine (`dailyClose.ts`)](#46-daily-close-engine-dailyclosets)
   - [4.7 Frontend Design System & Architecture](#47-frontend-design-system--architecture)
5. [REST API Reference](#5-rest-api-reference)
   - [5.1 API Conventions & Security](#51-api-conventions--security)
   - [5.2 Authentication Endpoints (`/api/v1/auth`)](#52-authentication-endpoints-apiv1auth)
   - [5.3 Orders Endpoints (`/api/v1/orders`)](#53-orders-endpoints-apiv1orders)
   - [5.4 Returns Endpoints (`/api/v1/returns`)](#54-returns-endpoints-apiv1returns)
   - [5.5 Exchanges Endpoints (`/api/v1/exchanges`)](#55-exchanges-endpoints-apiv1exchanges)
   - [5.6 Analytics Endpoints (`/api/v1/analytics`)](#56-analytics-endpoints-apiv1analytics)
   - [5.7 Admin & Catalog Endpoints (`/api/v1/admin`)](#57-admin--catalog-endpoints-apiv1admin)
   - [5.8 Uploads & Reports Endpoints (`/api/v1/uploads`, `/api/v1/reports/export`)](#58-uploads--reports-endpoints-apiv1uploads-apiv1reportsexport)
6. [Database Schema & Data Models](#6-database-schema--data-models)
   - [6.1 Database Engine Strategy (SQLite dev vs. PostgreSQL prod)](#61-database-engine-strategy-sqlite-dev-vs-postgresql-prod)
   - [6.2 Entity-Relationship (ER) Diagram](#62-entity-relationship-er-diagram)
   - [6.3 Detailed Model Specifications](#63-detailed-model-specifications)
   - [6.4 Relational Constraints & Indexes](#64-relational-constraints--indexes)
7. [Configuration & Deployment](#7-configuration--deployment)
   - [7.1 Environment Differences](#71-environment-differences)
   - [7.2 Windows Intranet Deployment (PM2 Service)](#72-windows-intranet-deployment-pm2-service)
   - [7.3 PostgreSQL Migration Walkthrough](#73-postgresql-migration-walkthrough)
   - [7.4 Docker & Containerized Orchestration](#74-docker--containerized-orchestration)
   - [7.5 Nginx Reverse Proxy Configuration](#75-nginx-reverse-proxy-configuration)
   - [7.6 Security Hardening Checklist](#76-security-hardening-checklist)
8. [Known Issues, Technical Debt & Scaling Roadmap](#8-known-issues-technical-debt--scaling-roadmap)
   - [8.1 Database Concurrency & File Locks](#81-database-concurrency--file-locks)
   - [8.2 Orders Offset Pagination Latency](#82-orders-offset-pagination-latency)
   - [8.3 Catalog Metadata In-Memory Caching](#83-catalog-metadata-in-memory-caching)
   - [8.4 PDF Generation & Arabic Typography](#84-pdf-generation--arabic-typography)
   - [8.5 In-Process Auto-Close Scheduler](#85-in-process-auto-close-scheduler)
   - [8.6 Login Rate-Limiting Memory Lifecycle](#86-login-rate-limiting-memory-lifecycle)
9. [Domain Glossary & Core Invariants](#9-domain-glossary--core-invariants)
   - [9.1 Domain Terminology & Arabic Translations](#91-domain-terminology--arabic-translations)
   - [9.2 The Four Core Invariants Cheat-Sheet](#92-the-four-core-invariants-cheat-sheet)

---

# 1. Executive Summary & Project Overview

## 1.1 Purpose & Problem Statement
The **Yoka Store Order Management System (OMS)** is a proprietary retail and e-commerce platform designed to address the unique complexities of high-volume apparel, footwear, and consumer retail fulfillment in Egypt.

Generic e-commerce platforms (such as Shopify, Magento, or WooCommerce) model retail operations as simple transactions where an order is placed, fulfilled, and refunded if returned. In real-world Egyptian retail shipping, this model creates systemic failures:
1. **Packaging vs. Sold Goods Disconnect**: Logistics couriers charge and track parcels based on physical shipping bags (`Shipping Bag`), while sales agents, inventory stock, and commission targets operate strictly on individual garments or units (`Piece`).
2. **Catalog Price Volatility**: Catalog prices change frequently due to promotions, cost adjustments, or inflation. If a customer exchanges or returns an item weeks after purchase, evaluating the transaction against the *current* catalog price creates severe accounting errors.
3. **Reverse Logistics Fault Attribution**: Returns occur for divergent reasons. If a seller sends the wrong size or defective item (**Seller Fault**), the seller must absorb courier return fees. If a customer changes their mind or refuses delivery (**Customer Fault**), the seller should not be penalized.
4. **Exchange Continuity**: Exchanges in retail are frequent and complex. A single exchange involves selecting specific pieces to return (at their historical purchase price), choosing new replacement items from the current catalog, reconciling the price differential (via Cash on Delivery or electronic transfer), and creating a replacement shipment with full tracking lineage.

The Yoka OMS solves these operational challenges through specialized backend calculation engines and transactional database guarantees.

---

## 1.2 Target Users & Roles
The system enforces strict Role-Based Access Control (RBAC) with two user roles:
- **Sales Agents (`sales`)**: Primary operational staff. Responsible for:
  - Creating customer orders with flexible pricing per piece.
  - Recording delivery details across all 27 Egyptian governorates.
  - Processing full returns, itemized partial returns, and multi-step atomic exchanges.
  - Attaching payment proofs for electronic wallet or bank transfers.
- **Store Administrators (`admin`)**: Store owners and managers. In addition to sales capabilities, administrators have exclusive access to:
  - Executive KPI dashboards and daily trend analytics.
  - Comprehensive seller performance, commission tracking, and quota monitoring.
  - Catalog management: Sellers, Products, Shipping Carriers, Platforms, and Governorates.
  - Financial auditing and manual or automated Daily Close execution.
  - User administration (creating accounts, resetting passwords, deactivating users).
  - Multi-sheet accounting exports in Excel and order confirmation PDF generation.

---

## 1.3 High-Level Architecture Summary
The system is built as a client-server web application comprising:
1. **Frontend**: A React 18 Single-Page Application (SPA) bootstrapped via Vite. Built with zero external UI component libraries, utilizing a custom Pure CSS design system optimized for Arabic Right-to-Left (`direction: rtl`) readability and an "eye-comfort" palette.
2. **Backend**: An Express.js REST API written in strict TypeScript. Business logic is organized into pure, headless calculation engines decoupled from database I/O.
3. **ORM & Persistence**: Prisma ORM 6.x utilizing SQLite for zero-install local development, with a schema fully compatible with production PostgreSQL.

---

## 1.4 Technology Stack & Dependencies

### Backend Dependencies (`backend/package.json`)
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `>= 20.x` | Server runtime environment |
| **Express** | `^4.21.2` | HTTP web server and REST routing framework |
| **TypeScript** | `^5.6.0` | Strict static type checking |
| **Prisma ORM** | `^6.0.0` | Next-generation ORM and query builder |
| **Zod** | `^3.23.8` | Declarative schema validation for API payloads |
| **bcryptjs** | `^2.4.3` | Cryptographic password hashing (10 salt rounds) |
| **jsonwebtoken** | `^9.0.2` | JWT access token issuance and verification |
| **ExcelJS** | `^4.4.0` | Multi-worksheet Excel workbook generation |
| **PDFKit** | `^0.15.0` | Programmatic vector PDF order slip generation |
| **Multer** | `^2.4.0` | Multipart form-data handling for payment receipts |
| **Helmet** | `^8.0.0` | HTTP security headers and CORS protection |
| **Winston** | `^3.14.2` | Structured operational and error logging |
| **Jest & Supertest** | `^29.7.0` | Unit and integration test runner |

### Frontend Dependencies (`frontend/package.json`)
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **React** | `^18.3.1` | Declarative UI component tree |
| **React DOM** | `^18.3.1` | Browser DOM rendering |
| **Vite** | `^5.4.0` | Build engine and local development server |
| **React Router DOM** | `^6.26.0` | Client-side declarative routing and route guards |
| **Axios** | `^1.7.0` | HTTP client with automatic 401 token refresh |
| **Pure CSS** | Custom | Native RTL, zero-runtime overhead styling system |

---

# 2. Architecture & System Structure

## 2.1 Codebase Folder & File Breakdown

```
Yoka Store System/
├── backend/                         # Express.js REST API & Prisma Backend
│   ├── prisma/
│   │   ├── schema.prisma            # Master database schema definition
│   │   └── dev.db                   # Local SQLite development database
│   ├── src/
│   │   ├── index.ts                 # Express bootstrap, route mounting & cron
│   │   ├── seed.ts                  # Database seeder (users, catalogs, governorates)
│   │   ├── api.test.ts              # Supertest API integration test suite
│   │   ├── engines/                 # Pure calculation engines (zero side-effects)
│   │   │   ├── analyticsEngine.ts   # Unified KPI & financial metrics calculator
│   │   │   ├── orderEngine.ts       # Order pricing & piece summation
│   │   │   ├── paymentEngine.ts     # Payment validation (deposit, split, COD, proof)
│   │   │   ├── returnEngine.ts      # Net pieces math, partial refund & piece validation
│   │   │   ├── sellerEngine.ts      # Fault penalties & commission order preservation
│   │   │   └── engines.test.ts      # Unit tests for pure calculation engines
│   │   ├── lib/                     # Infrastructure & shared utilities
│   │   │   ├── prisma.ts            # Singleton PrismaClient instance
│   │   │   ├── auth.ts              # JWT signing/verifying & bcrypt hashing
│   │   │   ├── dailyClose.ts        # Cairo wall-clock snapshot & auto-close engine
│   │   │   ├── dailyClose.test.ts   # Daily close unit & timezone tests
│   │   │   ├── dateRange.ts         # Query string to Prisma DateTime filter parser
│   │   │   └── logger.ts            # Winston structured logger
│   │   ├── middleware/
│   │   │   └── auth.ts              # Express middleware: requireAuth & requireAdmin
│   │   ├── routes/                  # Express HTTP controllers (REST endpoints)
│   │   │   ├── admin.ts             # Catalogs, users, and manual daily close
│   │   │   ├── analytics.ts         # Dashboard KPIs, daily chart series, seller KPIs
│   │   │   ├── auth.ts              # Login, token refresh, logout, user list, /me
│   │   │   ├── exchanges.ts         # Lookup, validation, and atomic exchange execution
│   │   │   ├── export.ts            # Multi-sheet Excel export & PDF order slips
│   │   │   ├── orders.ts            # Order creation, listing, detail, completion
│   │   │   ├── returns.ts           # Full and partial return lookup and processing
│   │   │   └── uploads.ts           # Multer screenshot upload handler
│   │   └── validators/
│   │       └── schemas.ts           # Zod validation schemas for all incoming payloads
│   ├── uploads/                     # Local disk storage for uploaded payment receipts
│   ├── jest.config.js               # Jest configuration (ts-jest)
│   ├── package.json                 # Backend dependencies & npm scripts
│   └── tsconfig.json                # TypeScript compilation options
│
├── frontend/                        # React 18 Single-Page Application (Vite)
│   ├── src/
│   │   ├── main.tsx                 # React DOM mount point
│   │   ├── App.tsx                  # App shell, router definitions, navigation & guard
│   │   ├── api.ts                   # Axios client with automatic 401 token refresh
│   │   ├── auth.tsx                 # React Context for authentication state
│   │   ├── styles.css               # Comprehensive Pure CSS design system (Native RTL)
│   │   ├── components/              # Shared UI components
│   │   │   ├── charts.tsx           # Canvas/SVG bar and donut chart visualizations
│   │   │   ├── ScreenshotUpload.tsx # Drag-and-drop receipt image uploader
│   │   │   └── ui.tsx               # Toast system, modal dialogs, status badges
│   │   └── pages/                   # Application route views
│   │       ├── DailyClose.tsx       # Daily close audit log & manual snapshot trigger
│   │       ├── Dashboard.tsx        # Executive KPIs, today's operations, charts
│   │       ├── Exchanges.tsx        # 5-step interactive atomic exchange wizard
│   │       ├── Login.tsx            # Login screen with user selection dropdown
│   │       ├── Manage.tsx           # Generic CRUD manager for catalogs (sellers, etc.)
│   │       ├── NewOrder.tsx         # Multi-piece order entry with pricing & logistics
│   │       ├── OrderDetail.tsx      # Comprehensive order view with returns/exchanges
│   │       ├── Orders.tsx           # Filterable, searchable orders data table
│   │       ├── Performance.tsx      # Seller KPI dashboard, quota meter, fault meter
│   │       ├── Reports.tsx          # Export reports to Excel with date range filters
│   │       ├── Returns.tsx          # Full return and itemized partial return processing
│   │       └── Users.tsx            # User administration (roles, activation, passwords)
│   ├── package.json                 # Frontend dependencies & scripts
│   ├── tsconfig.json                # TypeScript compiler configuration
│   └── vite.config.ts               # Vite configuration with proxy rules
│
├── docs/                            # Modular documentation suite
│   └── adr/                         # Architectural Decision Records (0001 - 0005)
├── setup-client.bat                 # One-click automated setup script for Windows
├── start-all.bat                    # One-click dual server launcher for Windows
└── doc_project.md                   # Master consolidated project documentation
```

---

## 2.2 System Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Frontend Client (Browser)"]
        UI["React 18 SPA (Native RTL)"]
        AuthCtx["Auth Context & LocalStorage"]
        AxiosClient["Axios Interceptor (Silent Refresh)"]
        UI --> AxiosClient
        AuthCtx <--> AxiosClient
    end

    subgraph Server["Express Application (:4000)"]
        Router["Express Router (/api/v1)"]
        
        subgraph Middlewares["Middleware Pipeline"]
            CorsHelmet["CORS & Helmet Security"]
            AuthGuard["requireAuth / requireAdmin"]
            RateLimit["Login Brute-Force Limiter"]
            ZodVal["Zod Schema Validator"]
        end

        subgraph Routes["Route Controllers"]
            R_Auth["auth.ts"]
            R_Orders["orders.ts"]
            R_Returns["returns.ts"]
            R_Exchanges["exchanges.ts"]
            R_Analytics["analytics.ts"]
            R_Admin["admin.ts"]
            R_Export["export.ts"]
            R_Uploads["uploads.ts"]
        end

        subgraph DomainEngines["Pure Calculation Engines"]
            E_Analytics["analyticsEngine.ts"]
            E_Order["orderEngine.ts"]
            E_Payment["paymentEngine.ts"]
            E_Return["returnEngine.ts"]
            E_Seller["sellerEngine.ts"]
            E_Close["dailyClose.ts"]
        end

        subgraph DataLayer["Persistence & Storage"]
            PrismaClient["Prisma ORM 6.x Client"]
            DiskStorage["Disk Storage (/uploads)"]
        end
    end

    subgraph Database["Relational Database"]
        DB[(SQLite 'dev.db' / PostgreSQL)]
    end

    %% Wiring
    AxiosClient -- "HTTP Requests (Bearer JWT)" --> CorsHelmet
    CorsHelmet --> Router
    Router --> RateLimit
    RateLimit --> AuthGuard
    AuthGuard --> ZodVal
    ZodVal --> Routes

    R_Orders --> E_Order
    R_Orders --> E_Payment
    R_Returns --> E_Return
    R_Returns --> E_Seller
    R_Exchanges --> E_Order
    R_Analytics --> E_Analytics
    R_Analytics --> E_Seller
    R_Admin --> E_Close

    Routes --> PrismaClient
    R_Uploads --> DiskStorage
    PrismaClient -- "SQL Queries / Transactions" --> DB
```

---

## 2.3 End-to-End Data Flow

### 2.3.1 Order Lifecycle Data Flow
1. **Client Input**: The sales agent inputs customer details, chooses a seller, selects line items with negotiated prices, enters physical shipping bag counts, and specifies the payment method on `NewOrder.tsx`.
2. **Security & Validation**: Request passes through `requireAuth` (verifying the Bearer token) and `createOrderSchema.safeParse` (verifying field constraints and regexes).
3. **Engine Evaluation**:
   - `orderEngine.calculateOrderValue()` computes total order gross value from individual line items.
   - `paymentEngine.validatePayment()` verifies payment mode invariants and receipt screenshot requirements.
4. **Atomic Write**: A `prisma.$transaction()` block executes:
   - Creation of the `Order` record with unique order number (`ORD-YYYY-XXXXXX`).
   - Bulk insertion of `OrderItem` records locking `actualSellingPrice`.
   - Creation of initial `PaymentRecord`.
   - Creation of an `AuditLog` row.
5. **Response**: HTTP 201 returns the complete order entity.

---

## 2.4 Key Design Patterns

### Single Source of Truth Analytics Pattern (ADR 0002)
Prior to this architecture, dashboards, seller KPI tabs, and Excel exports risked calculating conflicting figures. The system routes all financial and volume analytics through a single pure function:
```typescript
dashboardMetrics(raw: RawMetrics): ComputedMetrics
```
This guarantees that:
- Fully returned orders leave sales and order count totals identically everywhere.
- Exchanged original orders are excluded from active sales while replacement orders count normally.
- Partial returns subtract from *Net Pieces* without decrementing the *Completed Orders* count.
- Physical shipping bags are decoupled from monetary figures.

### Historical Price Immutability Pattern
When products are added to an order, their selling price is not referenced dynamically from the `Product` table. Instead, it is written as `actualSellingPrice` into each `OrderItem` row. When a return or exchange is initiated months later, refunds and exchange credits are derived from this historical price:
```typescript
export function calculatePartialReturnValue(orderItems: PricedPiece[], selectedPieceNumbers: number[]): number {
  const selected = new Set(selectedPieceNumbers);
  return orderItems
    .filter((i) => selected.has(i.pieceNumber))
    .reduce((s, i) => s + i.actualSellingPrice, 0);
}
```
This prevents catalog price changes, seasonal discounts, or inflation adjustments from retroactively destabilizing accounting records.

### Fault-Attribution Ledger Pattern (ADR 0004)
The system separates operational responsibility from monetary deductions:
- **Seller Fault**: Attributed when an operator sends the wrong product, incorrect size, or a damaged item. The seller is penalized **strictly by deducting the return shipping fee** (`returnShippingCost`), preserving their net product commission.
- **Customer Fault**: Attributed when the customer refuses delivery or changes their mind. Deduction is **0 EGP**.

---

## 2.5 Sequence Diagrams

### 2.5.1 Atomic Exchange Workflow
```mermaid
sequenceDiagram
    autonumber
    actor Operator as Sales Agent
    participant Frontend as React Wizard (Exchanges.tsx)
    participant Route as Express Route (/exchanges)
    participant Engine as Order & Return Engines
    participant Prisma as Prisma Client
    participant DB as Relational Database

    Operator->>Frontend: Enter Order / Tracking Number
    Frontend->>Route: GET /api/v1/exchanges/lookup/:code
    Route->>Prisma: Find Order with items, returns, exchanges
    Prisma-->>Route: Order Record
    Route-->>Frontend: Eligible pieces (with historical prices)

    Operator->>Frontend: Select Pieces to return & New Catalog Items
    Operator->>Frontend: Choose settlement (COD, electronic transfer, store credit)
    Frontend->>Route: POST /api/v1/exchanges (payload)

    Route->>Route: Verify original order is not fully returned
    Route->>Route: Verify pieces are not already returned or exchanged
    Route->>Engine: calculateOrderValue(newItems)
    Route->>Route: Calculate Price Delta = newTotal - originalValue

    Route->>Prisma: Begin prisma.$transaction
    Prisma->>DB: 1. INSERT new Order (status: completed)
    Prisma->>DB: 2. INSERT new OrderItem records
    opt Delta > 0 (Customer owes money)
        Prisma->>DB: 3. INSERT PaymentRecord for difference
    end
    Prisma->>DB: 4. INSERT Exchange record linking originalOrderId & newOrderId
    Prisma->>DB: 5. INSERT ExchangeItem records (ORIGINAL & NEW sides)
    Prisma->>DB: 6. INSERT AuditLog entry
    Prisma-->>Route: Transaction Committed
    Route-->>Frontend: HTTP 201 { exchange, newOrder, difference }
    Frontend-->>Operator: Display Confirmation & Delta Receipt
```

### 2.5.2 Silent Token Refresh with Event Bus
```mermaid
sequenceDiagram
    participant UI as React Component
    participant Axios as Axios Interceptor
    participant Backend as Express /api/v1/auth/refresh
    participant LS as LocalStorage

    UI->>Axios: API Request (Expired Access Token)
    Axios->>Backend: Forward Request
    Backend-->>Axios: HTTP 401 Unauthorized
    Note over Axios: Trap 401 & check refreshToken
    Axios->>Backend: POST /auth/refresh { refreshToken }
    Backend-->>Axios: HTTP 200 { token, refreshToken }
    Axios->>LS: Save updated tokens
    Axios->>UI: Dispatch 'yoka:token' CustomEvent
    Axios->>Backend: Replay original failed request with new Token
    Backend-->>Axios: HTTP 200 (Success)
    Axios-->>UI: Return Data to Component
```

---

# 3. Setup & Installation Guide

## 3.1 Prerequisites
- **Node.js**: Version `20.16.0 LTS` or higher.
- **npm**: Version `10.x` or higher.
- **Operating System**: Windows 10/11, Windows Server (production Linux/macOS fully supported).
- **Available Ports**: `4000` (Backend Express API) and `5173` (Frontend Vite Client).

---

## 3.2 Windows Automated Setup (`setup-client.bat` & `start-all.bat`)

### First-Time Initialization
Run `setup-client.bat` once on a newly cloned workstation:
1. Installs backend npm dependencies.
2. Creates and syncs the SQLite database via `npx prisma db push`.
3. Seeds default user credentials and catalogs via `npm run seed`.
4. Compiles the TypeScript backend (`backend/dist/`).
5. Installs frontend dependencies and builds production assets.

### Everyday Launch
Run `start-all.bat` to launch both servers in dedicated background console windows:
- Backend: `http://127.0.0.1:4000`
- Frontend: `http://127.0.0.1:5173`
- Default Credentials:
  - **Administrator**: `admin` / `1558`
  - **Sales Agent**: `sales` / `1234`

---

## 3.3 Step-by-Step Manual Installation

### Backend Setup
```bash
# 1. Enter backend directory and copy environment template
cd backend
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Synchronize database schema
npx prisma db push

# 4. Seed default users and catalogs
npm run seed

# 5. Start development server
npm run dev
```

### Frontend Setup
```bash
# In a separate terminal
cd frontend
npm install
npm run dev
```
Access the application at `http://localhost:5173`.

---

## 3.4 Environment Variables Reference

Declared in `backend/.env`:

| Variable | Required | Default | Purpose |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `"file:./dev.db"` | Prisma connection string (SQLite file in dev; PostgreSQL in prod). |
| `JWT_SECRET` | **Yes** (Prod) | `"yoka-oms-dev-secret-change-in-prod"` | Cryptographic key used to sign and verify JWT access tokens. |
| `PORT` | No | `4000` | HTTP port the Express server binds to. |
| `NODE_ENV` | No | `development` | Runtime mode. When `production`, default `JWT_SECRET` is blocked. |

---

## 3.5 Running the Test Suite
The test suite utilizes Jest with `ts-jest` and Supertest:
```bash
cd backend
npm test
```
All 45 tests across 3 test suites should pass:
- `src/engines/engines.test.ts`: Unit tests for all pure calculation formulas.
- `src/lib/dailyClose.test.ts`: Timezone alignment and snapshot tests.
- `src/api.test.ts`: Full end-to-end integration tests over the REST API.

---

# 4. Core Modules & Business Logic

## 4.1 Analytics Engine (`analyticsEngine.ts`)

### Responsibility
Single source of truth for financial and inventory KPIs across Dashboard, Seller Performance, Daily Close, and Excel export.

### Signature
```typescript
export function dashboardMetrics(raw: RawMetrics): ComputedMetrics
```

### Key Formulas & Logic
- **Gross Orders**: All orders created in range where `status !== 'canceled'`.
- **Full Returns Count**: Count of orders completely returned.
- **Net Orders**: $\max(0, \text{grossOrders} - \text{fullReturnsCount})$.
- **Net Sold Pieces**:
  $$\text{netPieces} = \max(0, \text{grossPieces of non-fully returned orders} - \text{partialReturnedPieces})$$
- **Total Sales**: Sum of `finalValue` of completed, non-fully returned orders.
- **Seller Deductions**: Sum of `returnShippingCost` for all seller-fault partial returns.
- **Shipping Bags**: Aggregated for courier logistics; explicitly omitted from piece and money equations.

---

## 4.2 Order Engine (`orderEngine.ts`)
Computes the order valuation strictly as the sum of frozen individual line item selling prices:
```typescript
export function calculateOrderValue(items: PricedPiece[]): number {
  return items.reduce((sum, i) => sum + i.actualSellingPrice, 0);
}
```

---

## 4.3 Payment Engine (`paymentEngine.ts`)
Enforces payment rules:
- `remainingAfterPaid(finalValue, paidNow)`: Calculates balance due.
- `validatePayment(args)`:
  - Deposit amounts must be $> 0$ and $< \text{finalValue}$.
  - Deposit requires an attached transfer screenshot.
  - Electronic transfers (`instapay`, `vodafone_cash`, `etisalat_cash`, `bank_transfer`) require receipt screenshots.
  - COD requires no screenshot.

---

## 4.4 Return Engine (`returnEngine.ts`)
Governs reverse logistics:
- `calculateNetPieces(args)`: Net pieces = gross - full - partial (bags ignored).
- `calculatePartialReturnValue(orderItems, selectedPieceNumbers)`: Refunds calculated strictly from historical sold prices.
- `validatePartialReturn(args)`: Rejects returning 100% of pieces under partial return (forces Full Return flow), rejects duplicate returns, and verifies piece number bounds.

---

## 4.5 Seller Engine (`sellerEngine.ts`)
Encapsulates commission and penalty rules:
- `sellerDeductionForReturn(args)`:
  - `faultType === 'seller'`: Penalizes `returnShippingCost` only (product value is not deducted because physical stock is recovered).
  - `faultType === 'customer'`: Penalizes `0 EGP`.
- `commissionOrderCount(args)`: Partial returns never decrement the seller's completed commission order count.

---

## 4.6 Daily Close Engine (`dailyClose.ts`)
Handles midnight financial auditing:
- `cairoNow(now: Date)`: Extracts current hour and date in `Africa/Cairo` time zone.
- `snapshotDay(prisma, day)`: Queries orders, returns, and exchanges and computes day snapshot via `dashboardMetrics`.
- `runAutoClose(prisma, now)`: Triggered by a 60-second timer in `src/index.ts`. Fires if Cairo hour is `1`, checks existing records for idempotency, and records the snapshot.

---

## 4.7 Frontend Design System & Architecture
- **Pure CSS**: Zero external component libraries. Custom CSS variables provide clean theming.
- **Native RTL**: Layout root declares `direction: rtl` with an Arabic-first hierarchy.
- **Eye-Comfort Palette**: Warm off-white backgrounds (`#F8FAFC`), white cards (`#FFFFFF`), and deep petrol emerald green (`#0F766E`) for primary elements, preventing eye strain.
- **Axios Silent Refresh**: 401 responses trigger a background token rotation promise and replay failed requests transparently.

---

# 5. REST API Reference

All routes are prefixed with `/api/v1`. Protected routes require `Authorization: Bearer <JWT>`.

## 5.1 API Conventions & Security
- **Envelope**: All responses return `{ "success": boolean, "data"?: any, "message"?: string, "errors"?: any }`.
- **IP Brute-Force Limiter**: `POST /auth/login` enforces a max of 8 failed attempts per minute per IP address. Exceeding triggers `429 Too Many Requests`.

---

## 5.2 Authentication Endpoints (`/api/v1/auth`)

| Method | Route | Access | Purpose | Body / Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/auth/users` | Public | List active users for login dropdown | None |
| `POST` | `/auth/login` | Public | Authenticate user | `{ "username": "admin", "password": "..." }` |
| `POST` | `/auth/refresh` | Public | Rotate refresh token | `{ "refreshToken": "..." }` |
| `POST` | `/auth/logout` | Public | Revoke refresh token | `{ "refreshToken": "..." }` |
| `GET` | `/auth/me` | `requireAuth` | Get current user profile | None |

---

## 5.3 Orders Endpoints (`/api/v1/orders`)

| Method | Route | Access | Purpose | Parameters / Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/orders/meta` | `requireAuth` | Catalogs for order creation | None |
| `POST` | `/orders` | `requireAuth` | Create new multi-piece order | Full order schema (items, bags, payment, customer) |
| `GET` | `/orders` | `requireAuth` | List orders with filtering | Query: `seller_id`, `status`, `tracking`, `date_from`, `date_to`, `q`, `take`, `skip` |
| `GET` | `/orders/:id` | `requireAuth` | Detailed order with relations | Path: `id` |
| `POST` | `/orders/:id/complete` | `requireAuth` | Mark order as completed | Path: `id` |

---

## 5.4 Returns Endpoints (`/api/v1/returns`)

| Method | Route | Access | Purpose | Parameters / Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/returns/lookup/:query` | `requireAuth` | Lookup order for return | Path: tracking number, waybill, or order number |
| `POST` | `/returns/partial` | `requireAuth` | Execute partial return | `{ original_tracking, selected_piece_numbers, returned_shipping_bags, fault_type, return_shipping_cost, return_reason }` |
| `POST` | `/returns/full` | `requireAuth` | Execute full return | `{ tracking, return_reason, responsibility, notes }` |
| `GET` | `/returns/partial` | `requireAuth` | List partial returns | None |
| `GET` | `/returns/full` | `requireAuth` | List full returns | None |

---

## 5.5 Exchanges Endpoints (`/api/v1/exchanges`)

| Method | Route | Access | Purpose | Parameters / Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/exchanges/lookup/:code` | `requireAuth` | Lookup order & check pieces | Path: tracking or order number |
| `POST` | `/exchanges` | `requireAuth` | Execute atomic exchange | `{ original_tracking, selected_piece_numbers, new_items, new_tracking, difference_payment_method, ... }` |
| `GET` | `/exchanges` | `requireAuth` | List exchange history | None |

---

## 5.6 Analytics Endpoints (`/api/v1/analytics`)

*All analytics endpoints require `requireAdmin`.*

| Method | Route | Purpose | Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/dashboard` | Main dashboard KPI cards & today's ops | Query: `from`, `to` |
| `GET` | `/analytics/daily` | Time-series daily trend data | Query: `from`, `to` (max 92 days) |
| `GET` | `/analytics/seller/:sellerId`| Deep seller performance KPIs | Path: `sellerId`, Query: `from`, `to` |
| `GET` | `/analytics/sellers` | Comparative summary of all sellers | Query: `from`, `to` |

---

## 5.7 Admin & Catalog Endpoints (`/api/v1/admin`)

*All admin endpoints require `requireAdmin`.*

| Method | Route | Purpose |
| :--- | :--- | :--- |
| `GET`/`POST`/`PUT` | `/admin/users[/:id]` | User account CRUD, role changes, passwords |
| `GET`/`POST`/`PUT` | `/admin/sellers[/:id]` | Seller management, commission rates, targets |
| `GET`/`POST`/`PUT` | `/admin/products[/:id]` | Product catalog management |
| `GET`/`POST` | `/admin/shipping-companies` | Shipping carrier management |
| `GET`/`POST` | `/admin/platforms` | Sales platform management |
| `GET`/`POST` | `/admin/governorates` | Egyptian governorate catalog management |
| `POST`/`GET` | `/admin/daily-close[s]` | Trigger manual daily snapshot / list history |

---

## 5.8 Uploads & Reports Endpoints (`/api/v1/uploads`, `/api/v1/reports/export`)

| Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/uploads` | `requireAuth` | Upload payment receipt (max 5MB image) |
| `GET` | `/reports/export/excel` | `requireAdmin` | Download multi-sheet Excel report (`oms-report.xlsx`) |
| `GET` | `/reports/export/pdf/order/:id` | `requireAuth` | Download order slip PDF (`order-ORD-XXX.pdf`) |

---

# 6. Database Schema & Data Models

## 6.1 Database Engine Strategy (SQLite dev vs. PostgreSQL prod)
- **Local Development**: SQLite (`backend/prisma/dev.db`). Provides zero-install development.
- **Production Target**: PostgreSQL. Provides multi-user row-level locking and native `DECIMAL` support.
- Upgrading to PostgreSQL requires modifying only the `datasource` block in `schema.prisma`.

---

## 6.2 Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o{ RefreshToken : "owns"
    User ||--o{ AuditLog : "triggers"
    Seller ||--o{ Order : "creates"
    Seller ||--o{ FullReturn : "penalized/credited"
    Seller ||--o{ PartialReturn : "penalized"
    SalesPlatform ||--o{ Order : "channels"
    Governorate ||--o{ Order : "destines"
    ShippingCompany ||--o{ Order : "delivers"
    DailyClose ||--o{ Order : "audits"
    DailyClose ||--o{ FullReturn : "audits"
    DailyClose ||--o{ PartialReturn : "audits"
    DailyClose ||--o{ Exchange : "audits"

    Order ||--|{ OrderItem : "contains"
    Order ||--|{ PaymentRecord : "receives"
    Order ||--o| FullReturn : "terminates_into"
    Order ||--o{ PartialReturn : "partially_refunded"
    Order ||--o{ Exchange : "originates"
    Order ||--o{ Exchange : "replaces"

    Product ||--o{ OrderItem : "referenced_by"
    OrderItem ||--o| PartialReturnItem : "returned_in"
    PartialReturn ||--|{ PartialReturnItem : "contains"

    Exchange ||--|{ ExchangeItem : "contains"
```

---

## 6.3 Detailed Model Specifications

### `Order`
- `id` (Int, PK, autoincrement)
- `orderNumber` (String, unique, e.g. `ORD-2026-102938`)
- `sellerId` (Int, FK to `Seller`)
- `platformId` (Int?, FK to `SalesPlatform`)
- `customerName` (String)
- `customerPhone` (String, indexed)
- `governorateId` (Int?, FK to `Governorate`)
- `addressDetail` (String?)
- `paymentMethod` (Enum: `instapay`, `vodafone_cash`, `etisalat_cash`, `bank_transfer`, `cod`)
- `shippingCompanyId` (Int?, FK to `ShippingCompany`)
- `trackingNumber` (String?, unique, indexed)
- `waybillNumber` (String?)
- `totalPieces` (Int)
- `totalBags` (Int, default 0)
- `grossValue` (Decimal)
- `finalValue` (Decimal)
- `status` (Enum: `pending`, `completed`, `canceled`, default `pending`)
- `completedAt` (DateTime?)
- `dailyCloseId` (Int?, FK to `DailyClose`)
- `createdAt` / `updatedAt` (DateTime)

### `OrderItem`
- `id` (Int, PK, autoincrement)
- `orderId` (Int, FK to `Order`, onDelete Cascade)
- `productId` (Int, FK to `Product`)
- `pieceNumber` (Int, 1-indexed)
- `actualSellingPrice` (Decimal, **frozen at sale time**)
- *Constraint*: `@@unique([orderId, pieceNumber])`

### `FullReturn`
- `id` (Int, PK, autoincrement)
- `orderId` (Int, unique, FK to `Order`, onDelete Cascade)
- `sellerId` (Int, FK to `Seller`)
- `returnedPieces` (Int)
- `returnValue` (Decimal)
- `returnReason` (String)
- `responsibility` (Enum: `seller`, `customer`, `system`)
- `dailyCloseId` (Int?, FK to `DailyClose`)

### `PartialReturn` & `PartialReturnItem`
- `PartialReturn`: `id`, `orderId` (FK), `sellerId` (FK), `returnedPieces`, `returnedBags`, `returnValue`, `faultType` (Enum: `customer`, `seller`), `returnShippingCost` (Decimal), `returnReason`, `dailyCloseId`.
- `PartialReturnItem`: `id`, `partialReturnId` (FK, onDelete Cascade), `orderItemId` (Int, unique, FK to `OrderItem`), `historicalPrice` (Decimal).

### `Exchange` & `ExchangeItem`
- `Exchange`: `id`, `originalOrderId` (FK), `newOrderId` (FK?), `originalValue`, `newValue`, `priceDifference`, `status`, `refundSettled`.
- `ExchangeItem`: `id`, `exchangeId` (FK, onDelete Cascade), `side` (`ORIGINAL` | `NEW`), `productId`, `pieceNumber`, `orderItemId`, `price`.

### `DailyClose`
- `id`, `closeDate` (DateTime, unique, indexed), `closedById` (Int?, FK to `User`), `isAutomatic` (Boolean), `totalOrdersCount`, `totalSalesValue`, `grossPieces`, `netPieces`, `fullReturnsCount`, `partialReturnsCount`, `exchangesCount`.

---

## 6.4 Relational Constraints & Indexes
- `OrderItem`: `@@unique([orderId, pieceNumber])` ensures piece sequence integrity.
- `PartialReturnItem`: `@@unique([orderItemId])` guarantees a piece cannot be partially returned multiple times.
- `Order`: `@@unique([orderNumber])`, `@@unique([trackingNumber])`.
- `Indexes`: Placed on `[sellerId]`, `[status]`, `[createdAt]`, `[customerPhone]`, and `[trackingNumber]`.

---

# 7. Configuration & Deployment

## 7.1 Environment Differences
- **Development**: Runs SQLite (`dev.db`), Vite dev server with Hot Module Replacement, and verbose logging. Default `JWT_SECRET` allowed.
- **Production**: Requires PostgreSQL, pre-compiled static frontend assets, PM2 process management, and enforces strong non-default `JWT_SECRET`.

---

## 7.2 Windows Intranet Deployment (PM2 Service)
1. Build both projects:
   ```cmd
   cd backend && npm run build
   cd ../frontend && npm run build
   ```
2. Install PM2 and service daemon:
   ```cmd
   npm install -g pm2 pm2-windows-startup
   pm2-startup install
   ```
3. Register services:
   ```cmd
   cd backend
   pm2 start dist/index.js --name "yoka-backend" --env production
   cd ../frontend
   pm2 start "npx vite preview --port 5173 --host 0.0.0.0" --name "yoka-frontend"
   pm2 save
   ```

---

## 7.3 PostgreSQL Migration Walkthrough
1. In `backend/prisma/schema.prisma`, update line 11:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `backend/.env`:
   ```env
   DATABASE_URL="postgresql://user:pass@host:5432/yoka_oms?schema=public"
   ```
3. Generate client and push schema:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run seed
   ```

---

## 7.4 Docker & Containerized Orchestration

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: yoka-postgres
    restart: always
    environment:
      POSTGRES_DB: yoka_oms
      POSTGRES_USER: yoka_admin
      POSTGRES_PASSWORD: SecretProdPassword123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: yoka-backend
    restart: always
    environment:
      DATABASE_URL: "postgresql://yoka_admin:SecretProdPassword123@postgres:5432/yoka_oms?schema=public"
      JWT_SECRET: "e8293b4819cfda93498b2c129e87fbc98234ea7192837461928374a"
      PORT: 4000
      NODE_ENV: production
    volumes:
      - backend_uploads:/app/uploads
    depends_on:
      - postgres
    ports:
      - "4000:4000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: yoka-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  backend_uploads:
```

---

## 7.5 Nginx Reverse Proxy Configuration
```nginx
server {
    listen 80;
    server_name _;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /uploads/ {
        proxy_pass http://localhost:4000/uploads/;
        expires 30d;
    }
}
```

---

## 7.6 Security Hardening Checklist
- [x] Rotate `JWT_SECRET` in production to a secure 64-character hex string.
- [x] Change default seed passwords (`admin/1558`, `sales/1234`).
- [x] Ensure `uploads/` directory is mounted on persistent storage.
- [x] Restrict database port access to private network/container network.
- [x] Setup automated daily database backups (`pg_dump` or SQLite copy).

---

# 8. Known Issues, Technical Debt & Scaling Roadmap

## 8.1 Database Concurrency & File Locks
- **Issue**: SQLite uses database-level write locks. Multiple concurrent users creating orders or processing exchanges risk `SQLITE_BUSY: database is locked`.
- **Roadmap**: Migrate production to PostgreSQL for row-level locking (MVCC).

## 8.2 Orders Offset Pagination Latency
- **Issue**: `GET /orders` uses `take` and `skip`. At 100,000+ orders, deep pagination degrades database query performance.
- **Roadmap**: Implement cursor-based pagination (`cursor: { id: lastSeenId }`).

## 8.3 Catalog Metadata In-Memory Caching
- **Issue**: `GET /orders/meta` queries 5 tables on every form render.
- **Roadmap**: Cache metadata in memory or Redis with a 15-minute TTL and invalidation on admin mutation.

## 8.4 PDF Generation & Arabic Typography
- **Issue**: Standard PDFKit fonts (Helvetica) cannot render Arabic characters; hence order slips and Excel reports are currently in English (ADR 0003).
- **Roadmap**: Bundle an open-source Arabic font (e.g. Cairo or Amiri) with bidirectional shaping (`bidi-js`).

## 8.5 In-Process Auto-Close Scheduler
- **Issue**: The 1:00 AM Cairo auto-close runs on a Node `setInterval` in `src/index.ts`. If the process is down during that hour, the automated snapshot is missed.
- **Roadmap**: Move to `pg_cron` inside PostgreSQL or external OS crontab.

## 8.6 Login Rate-Limiting Memory Lifecycle
- **Issue**: The `failures` map in `src/routes/auth.ts` retains expired IP entries until process restart.
- **Roadmap**: Add an eviction sweep timer or migrate to Redis rate limiting.

---

# 9. Domain Glossary & Core Invariants

## 9.1 Domain Terminology & Arabic Translations

| English Term | Arabic Equivalent | Strict Definition & Business Rules |
| :--- | :--- | :--- |
| **Order** | **الطلب** | A confirmed sale transaction connecting a seller, customer, pieces, shipping bags, payments, and courier. |
| **Piece** | **القطعة** | The fundamental sellable product unit. Inventory, pricing, quotas, and commissions operate **exclusively** on pieces. |
| **Shipping Bag** | **شوال الشحن / كيس الشحن** | Physical parcel container used by couriers. Counted purely for logistics manifests; **never enters monetary equations**. |
| **Completed Order** | **طلب مكتمل** | An order delivered and commissionable. Financially immutable except via Return or Exchange. |
| **Full Return** | **مرتجع كلي** | Return of all pieces. Deducts pieces from net sales and deducts 1 order from the seller's commission order count. |
| **Partial Return** | **مرتجع جزئي** | Return of strictly fewer pieces than ordered. Reduces net pieces, but **never decreases the completed order count**. |
| **Customer Fault** | **خطأ عميل** | Return caused by customer preference or non-response. Deducts **0 EGP** from the seller. |
| **Seller Fault** | **خطأ بائع** | Return caused by seller mistake (wrong size/color/defect). Deducts the **Return Shipping Cost** from the seller. |
| **Historical Price** | **السعر التاريخي** | Actual unit selling price permanently frozen at time of sale. All returns and exchanges calculate refunds using it. |
| **Commission Order**| **طلب العمولة** | A Completed Order qualifying for seller commission. Partial returns do not disqualify it. |
| **Exchange** | **استبدال** | Atomic transaction returning original pieces at historical price and generating a replacement order. |
| **Daily Close** | **الإغلاق اليومي** | Immutable audit snapshot taken at 1:00 AM Africa/Cairo time. |
| **COD** | **دفع عند الاستلام** | Cash collected by the courier upon parcel delivery. |
| **Electronic Transfer** | **تحويل إلكتروني** | InstaPay, Vodafone Cash, Etisalat Cash, or Bank Transfer. Requires screenshot receipt upload. |

---

## 9.2 The Four Core Invariants Cheat-Sheet

| # | Invariant Rule | Summary | Code Enforcement |
| :---: | :--- | :--- | :--- |
| **1** | **The Piece vs. Bag Wall** | Shipping bags are packaging containers; pieces are merchandise. Bags **never** enter financial equations, piece counts, or commissions. | `calculateNetPieces` explicitly discards bag arguments. |
| **2** | **Historical Price Immutability** | Returns and exchanges calculate value **strictly from historical sold prices**, never current catalog prices. | `calculatePartialReturnValue` filters `orderItems.actualSellingPrice`. |
| **3** | **Fault-Based Deduction Rule** | Seller fault deducts **Return Shipping Cost only**; Customer fault deducts **0 EGP**. | `sellerDeductionForReturn` returns `faultType === 'seller' ? returnShippingCost : 0`. |
| **4** | **Commission Order Preservation** | Partial returns **never decrement** the seller’s completed commission order count. | `commissionOrderCount` returns unchanged `completedOrders`. |

---

*End of Consolidated Documentation (`doc_project.md`)*
