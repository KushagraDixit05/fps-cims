# Farm Prosperity Solutions (FPS) — Progress Report

> **Last updated:** 18 June 2026
> **Overall status:** Phases 0–4 (partial) complete · Admin Portal live · Cloud deployed on Render · Release APK **v1.4** distributed · **Production-critical stabilization pass applied**

---

## Changes since 13 June 2026

Incremental fixes landed on `main` after the stabilization pass:

- **Mandi source alignment** — mobile sent display labels (Farmer/Trader/FPS Staff/Mandi) while the backend only accepted lowercase keys, so mandi sync failed. Expanded backend `SOURCE_CHOICES` (+`fps_staff`, +`mandi`, migration 0006), send canonical keys from the dropdown, normalize stored source at sync time to flush already-pending records, and handle the "Others" path via `custom_source`. App bumped to **v1.4** (schema v8 `custom_source` column).
- **Blank phone/email → NULL** — `User.save()` now converts blank `phone_number`/`email` to `NULL` to avoid a unique-constraint 500.
- **Platform stabilization batch** — admin auth fixes, analytics routes (`/api/admin/analytics/productivity/`, `/approval-sla/`), **SmartDropdown** standardization across forms, backend serializer upgrades, Product Performance dropdown updates, and the WatermelonDB **v8** migration.

**On feature branches (not merged to `main`):**
- `feature/rbac-implementation` — full RBAC permission engine (architecture in `docs/rbac/`).
- `feature/agri-intelligence-map` — Agri Intelligence Map geospatial command-center (MapLibre + deck.gl + Django `geo` app).

---

## Production Stabilization (13 June 2026)

A pre-rollout reliability/security audit was run across backend, sync engine, mobile, and
deployment. Five **critical** fixes were implemented on branch
`stabilization/production-critical-fixes` (feature work paused; no RBAC changes). Remaining
audit findings are deferred and tracked separately.

| # | Fix | Area | Files |
|---|---|---|---|
| **C2** | Offline-first session restore — the app no longer logs users out on a network error at startup. Restores from a cached profile and logs out **only** on a genuine auth failure. | Mobile | `api/client.ts`, `api/auth.ts`, `store/authStore.tsx` |
| **C3** | Multi-model creates wrapped in `transaction.atomic()` so a failed photo upload rolls back the whole record (no partial visits/demos). `complete-after` is now idempotent (replaces the after-photo set instead of appending). | Backend | `crops/serializers.py`, `product_demo/serializers.py`, `product_demo/views.py` |
| **C1** | Self-registration no longer accepts a client `role`; all public registrations are forced to `field_executive`. Admin accounts only via Django admin / `createsuperuser`. | Backend (security) | `accounts/serializers.py` |
| **C4** | Container boot no longer falls through to gunicorn when `migrate`/`collectstatic` fails (shell-precedence fix). Added a reproducible `render.yaml` Docker Blueprint. | Deployment | `backend/Dockerfile`, `render.yaml` |
| **C5** | `SECRET_KEY` and `ALLOWED_HOSTS` now fail fast in production (no insecure defaults). Added proxy-aware HTTPS/HSTS/secure-cookie settings, all gated to `not DEBUG`. | Backend (security) | `fps_backend/settings.py` |

**Deferred (tracked in audit, not yet done):** client-side image compression, persistent offline
photo storage, Neon `CONN_HEALTH_CHECKS`, sync retry backoff/dead-letter, WatermelonDB migration
reordering, global sync mutex, app error boundary, N+1 query cleanup, logging/Sentry.

**Known dev-environment note:** the shared dev database carries extra `accounts_user` columns from
a separate RBAC feature branch (schema drift). Do **not** point `main` at a database migrated by
that branch — keep one database per schema lineage. Fresh Neon production DBs built from `main`
are unaffected.

---

## Summary

| Layer | Status |
|---|---|
| Django Backend | ✅ Fully implemented, migrated, and live on Render |
| React Native Mobile | ✅ All screens built, release APK built and installed |
| Crop Monitoring Module | ✅ End-to-end complete (backend + 3-step wizard + dashboard) |
| Mandi Arrival Module | ✅ End-to-end complete (backend + 5-step wizard) |
| Product Demo Module | ✅ End-to-end complete (backend + 4-step wizard) |
| Offline Sync (Phase 3) | ✅ Complete — WatermelonDB **v8** + auto-sync + sync dashboard |
| UI Redesign (Phase 4) | 🔄 In progress — auth flow + home screen + drawer nav complete |
| Admin Portal | ✅ Complete — Next.js 16, 8 pages, field data viewing + CSV export |
| Cloud Deployment | ✅ Complete — Render (Docker + PostgreSQL + PostGIS) |
| Release APK | ✅ Built and distributed to testers |

---

## Phase-by-Phase Breakdown

### ✅ Phase 0 — Foundation Setup
- Git repository initialized
- Python virtual environment created (`backend/venv/`)
- PostgreSQL + PostGIS Docker container configured (`docker-compose.yml`)
- React Native project scaffolded with New Architecture enabled

---

### ✅ Phase 1 — Backend API

**Django apps:**
- `accounts` — Custom User model (extends AbstractUser with `role`, `region`, `phone_number`)
- `crops` — Crop entries + full Crop Monitoring models
- `mandi` — Mandi master data + daily arrival entries
- `product_demo` — Product demonstration visit records

**Authentication:**
- JWT via `djangorestframework-simplejwt`
- Access token: 12h lifetime, refresh: 30 days, rotation enabled

**API endpoints live:**

| Endpoint | Status |
|---|---|
| `POST /api/auth/login/` | ✅ |
| `POST /api/auth/refresh/` | ✅ |
| `GET /api/auth/me/` | ✅ |
| `POST /api/auth/register/` | ✅ |
| `GET/POST /api/crops/` | ✅ (legacy) |
| `GET /api/crops/summary/` | ✅ (legacy) |
| `GET/POST /api/mandi-arrivals/` | ✅ |
| `GET /api/mandi-arrivals/yoy_comparison/` | ✅ |
| `GET /api/mandis/` | ✅ |
| `GET /api/villages/` | ✅ |
| `GET /api/farmers/` | ✅ |
| `GET /api/districts/` | ✅ |
| `GET /api/blocks/` | ✅ |
| `GET /api/crop-master/` | ✅ |
| `POST /api/farmer-visits/` | ✅ |
| `GET /api/farmer-visits/` | ✅ |
| `GET /api/farmer-visits/<uuid>/` | ✅ |
| `GET /api/farmer-visits/summary/` | ✅ |
| `PATCH /api/farmer-visits/<uuid>/` | ✅ |
| `GET /api/product-master/` | ✅ |
| `GET/POST /api/product-demos/` | ✅ |
| `GET /api/product-demos/<uuid>/` | ✅ |
| `GET /api/product-demos/summary/` | ✅ |

**Seeded data:** 8 crops, 25 varieties, 4 districts, 46 blocks, 100 villages, 20 agrochemical products

---

### ✅ Phase 2 — Mobile App Core

**Authentication flow:**
- Login screen → JWT stored in AsyncStorage
- Auth-gated navigator — state-driven, no `navigate('Login')` calls
- Token refresh interceptor in Axios client

**Screens implemented:** LoginScreen, HomeScreen, CropListScreen, CropEntryFormScreen, CropDetailScreen, MandiListScreen, MandiEntryFormScreen, MandiDetailScreen, ReportsScreen, ProfileScreen

**Tested on:** OnePlus 11R (physical device, ARM64, Android 14)

---

### ✅ Crop Monitoring Module

Full 3-step wizard: Farmer Details → Crop Details → Photos/Location/Remark → Review → Success.

Backend: `FarmerVisit`, `CropRecord`, `VisitPhoto` models + 10 serializers + 4 ViewSets + `/summary/` action.

---

### ✅ Mandi Arrival Module

Full 5-step wizard: Mandi Details → Crop Varieties → Source/Remark → Photos → Location → Review → Success.

DB schema v2 — added `varieties_json`, `photos_json`, `total_arrival_qt`, GPS columns.

---

### ✅ Product Demo Module

Full 4-step wizard: Farmer & Location → Crop & Stage → Product & Dose → Photos/Result/Remark → Review → Success.

New `product_demo` Django app with `ProductMaster`, `ProductDemo`, `DemoPhoto` models. Seeded 20 agrochemicals.

---

### ✅ Phase 3 — Offline-First Sync

WatermelonDB (SQLite) as local store. All form types save locally first and sync to Django in background.

Current schema: **v8** (additive migration lineage v1→v8 — see `docs/CONTEXT.md`).

| Table | Purpose | Introduced |
|---|---|---|
| `farmer_visits` | Crop Monitoring wizard (`village_id` FK v4) | v1 |
| `crop_entries` | Legacy crop entry form | v1 |
| `mandi_arrivals` | Mandi entry/wizard (v2 cols; `mandi_custom_name` v5; `custom_source` v8) | v1 |
| `product_demos` | Product Demo wizard (before/after split v6; multi-variety v7) | v3 |
| `villages` | Reference: village master | v4 |
| `districts`, `blocks`, `crop_master`, `mandis` | Reference data | v1 |

Sync engine: `syncPendingRecords()` finds `is_synced=false` records, POSTs to Django, marks synced. `useAutoSync` hook auto-triggers on network reconnect (throttled 60s).

---

### 🔄 Phase 4 — UI Redesign (In Progress)

#### Done
| Item | Status |
|---|---|
| Design system (`docs/design/DESIGN.md`) | ✅ |
| `AppNavigatorV2` — Splash→Welcome→Login/Signup→Drawer→Tabs | ✅ Active |
| `SplashScreen`, `WelcomeScreen`, `LoginScreen` (v2), `SignupScreen` | ✅ |
| `HomeScreen` (v2) — drawer-aware, 4 quick-action tiles | ✅ |
| `SidebarContent` — drawer with user info + nav | ✅ |
| `POST /api/auth/register/` with auto-login | ✅ |

#### Remaining Backlog
- [ ] Crop Monitoring wizard screens (screens-v2/cropMonitoring/)
- [ ] Mandi, Reports, Profile screens (v2)
- [ ] components-v2 component library
- [x] Online API sync for Mandi Arrival — fixed (source alignment, schema v8); pending records now flush
- [ ] Online API sync for Product Demo module (after-photo deferred sync)
- [ ] `ProductDemoDetailScreen`
- [ ] Map view of visit GPS locations
- [ ] Farmer search / autocomplete
- [ ] Export PDF / Excel reports

---

### ✅ Admin Portal

Next.js 16 app at `admin-portal/`, dev server at `localhost:3000`. Pages live under the `(dashboard)` route group plus a `login` route. Roles/Permissions/Approvals/Audit exist as frontend on `main`; the backing RBAC permission engine lives on `feature/rbac-implementation`.

**Pages live:**
| Page | Feature |
|---|---|
| Dashboard | KPI cards + stats strip |
| Analytics | Productivity chart + Approval SLA chart |
| Users | Paginated user list + create/edit drawer |
| Roles | Role list + role detail with permission matrix |
| Permissions | Full permission matrix editor |
| Approvals | Maker-checker approval queue + detail view |
| Audit Log | Full audit trail table |
| Field Data — Farmer Visits | Filterable paginated table + Export CSV |
| Field Data — Mandi Arrivals | Filterable paginated table + Export CSV |
| Field Data — Product Demos | Filterable paginated table + Export CSV |

**Backend: `admin_portal` Django app**
- `GET/POST /api/admin/field-data/visits/` — list + streaming CSV export
- `GET/POST /api/admin/field-data/mandi/` — list + streaming CSV export
- `GET/POST /api/admin/field-data/demos/` — list + streaming CSV export
- All endpoints gated by `is_staff`; filters: date range, district, crop/product, executive

---

### ✅ Cloud Deployment

| Item | Status |
|---|---|
| Django backend Dockerized (GDAL + gunicorn + whitenoise) | ✅ |
| PostgreSQL + PostGIS on Render | ✅ |
| Auto-migrate + auto-seed on container startup | ✅ |
| Live URL: `https://fps-cims-backend.onrender.com` | ✅ |
| Django Admin: `https://fps-cims-backend.onrender.com/admin` | ✅ |
| Release APK signed with `farm-prosperity-release.keystore` | ✅ |
| APK distributed to testers via ADB | ✅ |
