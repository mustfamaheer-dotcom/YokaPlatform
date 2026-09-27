# Yoka Store – E-Commerce Store Plan

## Overview

Yoka Store is the public‑facing e‑commerce platform (**ECP**) that serves customers across Egypt. It provides a modern, responsive storefront built with **Next.js 14**, Tailwind CSS, and integrates tightly with the internal **Sales & Warehouse Management (SWM)** system for real‑time inventory synchronization.

## Key Features

- **Hero Offer Banner** – Configurable promotional banner (`hero_offer_enabled`, `hero_offer_text`, `hero_offer_link`) managed via the admin panel.
- **Contact & Support** – Dedicated `/contact` page with phone and WhatsApp quick‑action buttons.
- **Visitor Analytics** – Session and event tracking (`ecp_visitor_sessions`, `ecp_visitor_events`) with geo‑IP lookup to report visitor locations per Egyptian governorate.
- **Scroll‑to‑Top** – Global component that automatically scrolls to the top when the user navigates between tabs or pages, ensuring a smooth UX on both mobile and desktop.
- **Lucide Icons** – Full replacement of legacy emoji icons with the `lucide-react` icon set for a consistent visual language.
- **Responsive Design** – Mobile‑first layout with adaptive navigation, product grid, and checkout flow.

## Architecture

- **Frontend** – Next.js 14 (App Router) + Tailwind CSS.
- **Backend API** – Node.js 20 + Express, exposing REST endpoints under `/api/v1/ecp/*`.
- **Database** – MySQL 8.0 (shared with SWM). New tables introduced in migrations `008_store_settings.js`, `009_contact_settings.js`, `010_visitor_tracking.js`.
- **Cache & Queue** – Redis 7 for caching and BullMQ for background jobs (e.g., visitor session aggregation).
- **Deployment** – Served behind Nginx reverse proxy on a Hostinger VPS (see `Yoka Store Full Technical Plan.md`).

## API Endpoints (ECP)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/ecp/store-settings` | Retrieve current store settings (hero banner, contact info). |
| PUT | `/api/v1/ecp/store-settings` | Update store settings (admin only). |
| POST | `/api/v1/ecp/tracking/session` | Create a new visitor session (auto‑filled geo data). |
| POST | `/api/v1/ecp/tracking/event` | Record a visitor event (page view, add‑to‑cart, checkout). |

## Visitor Tracking Flow

1. **Client** calls `visitorTracker.js` on page load → fetches public IP.
2. **Server** resolves IP to `country`, `region`, `city` via `geoLookup.js` and inserts a row into `ecp_visitor_sessions`.
3. Subsequent actions (view product, add to cart, checkout) post events to `/api/v1/ecp/tracking/event`, storing JSON payloads in `ecp_visitor_events`.
4. Background aggregation jobs summarize daily/weekly stats for the admin dashboard.

## Store Settings (Migration 008)

```sql
CREATE TABLE store_settings (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    hero_offer_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    hero_offer_text    VARCHAR(255),
    hero_offer_link    VARCHAR(512),
    contact_phone      VARCHAR(25),
    contact_whatsapp   VARCHAR(25),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Contact Settings (Migration 009)

The same `store_settings` table holds `contact_phone` and `contact_whatsapp`. The `/contact` page reads these values to render clickable `tel:` and `https://wa.me/` links.

## Visitor Sessions (Migration 010) – Schema Overview

```sql
CREATE TABLE ecp_visitor_sessions (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_id        VARCHAR(128) NOT NULL,
    ip_address        VARCHAR(45) NOT NULL,
    country           VARCHAR(64),
    region            VARCHAR(64),
    city              VARCHAR(64),
    device_type       VARCHAR(32),
    browser           VARCHAR(64),
    os                VARCHAR(64),
    page_views_count  INT NOT NULL DEFAULT 0,
    has_cart_activity BOOLEAN NOT NULL DEFAULT FALSE,
    has_ordered       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

```sql
CREATE TABLE ecp_visitor_events (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_id   VARCHAR(128) NOT NULL,
    event_type   ENUM('page_view','add_to_cart','checkout','order_success') NOT NULL,
    event_data   JSON,
    page_url     VARCHAR(512),
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Scroll‑to‑Top Component

Implemented in `client-ecp/src/components/ScrollToTop.tsx`. It listens to Next.js router events and calls `window.scrollTo({ top: 0, behavior: "smooth" })` on route change.

## Icon Migration

All UI components now import icons from `lucide-react`:
```tsx
import { ShoppingCart, User, Search } from "lucide-react";
```
Old emoji references have been removed.

## Next Steps

- Verify that the admin panel can edit `store_settings` and that changes reflect instantly on the storefront.
- Ensure visitor tracking endpoints are secured (rate‑limited, CSRF‑protected).
- Add unit/integration tests for the new API routes.
- Update the documentation in `Docs/نظام_التجارة_الإلكترونية_تحليل_شامل.md` to reflect these changes.

---

*Generated by Antigravity AI on 2026‑09‑28.*
