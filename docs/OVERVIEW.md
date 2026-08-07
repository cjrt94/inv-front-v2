# inv-front-v2 — Overview

## Purpose

iOS admin companion app for **Importaciones Vialex S.A.C. (IMV)**, a home-appliance retailer in Lima, Peru. It gives administrators on the road the essentials of the operation from their phone or iPad: how sales are going, what the catalog/stock/competition looks like, and the pipeline of incoming digital orders — including marking their status and attaching the courier's delivery voucher.

The product name is **Imv.** (with an M); the repo path `inv-front-v2` is legacy.

## Business context

IMV operates physical stores, a POS (imv-pos), an admin web panel (imv-back), the Kontento public web store and the Falabella marketplace, all sharing one Firestore database (Firebase project `imvialex`). This app is the mobile counterpart of the imv-back admin panel for people who are not at a desk. It reads and writes the same shared collections; it does **not** invoice — invoicing digital orders is web-only (imv-pos / imv-back).

## What it does

- **Sales dashboard** — KPIs, daily sales chart, top products, rankings and featured products for a date range, with one-tap range shortcuts (Today / Yesterday / This week / This month / Last month / This year) and an establishment filter. All figures are computed client-side from raw `sales` docs (`services/salesService.js`), grouped in local (Lima) time; credit notes (SUNAT type `07`) subtract.
- **Product catalog** — searchable product list; per product, a competitor-price inspector (scraped competitor data with price-history chart) and a per-warehouse stock inspector.
- **Digital Orders Center (Pedidos)** — orders coming in from the Kontento store (`digitalOrders` collection): filterable list, detail modal, and a validated business-status state machine (Nuevo / Revisado / Entregado / Con problemas / Cancelado) that writes each change to the order's `history` subcollection atomically. Includes **courier delivery-voucher capture** (camera or photo library) with an offline IndexedDB queue that uploads to Firebase Storage when connectivity returns; since v4.4.1 the voucher is optional for marking an order Delivered.
- **Operational push notifications** — FCM pushes for ecosystem events (new digital orders, inventory alerts, invoices, etc.), multi-device per user; tapping a digital-order push opens the Pedidos tab.
- **iPhone + iPad layouts** — bottom tab bar (Dashboard / Productos / Pedidos) on iPhone; split-pane side menu with user footer on iPad (≥768px).

## Target users / access

Admins on the road. The app is admin-only: login requires the Firebase Auth custom claim `admin` (any other credential is signed out with "Permisos insuficientes"), and the Firestore security rules (managed in imv-back) enforce the same server-side.

## Status

v4.4.1 (iOS build 20) — August 2026.

**App Store release status:** the repo's `CLAUDE.md` records that the actual App Store release of the 4.4.x line is **pending** — versions were bumped (`package.json` and native `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`), but the `npm run build && npx cap sync ios` + Xcode archive/upload step is noted as not yet done, with v4.4.1 "accumulating what was pending from v4.4.0" (and CLAUDE.md asks to verify the new CSP on-device before publishing). Check App Store Connect for what is actually live; this repo does not record a completed upload for 4.3.x–4.4.x.
