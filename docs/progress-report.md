# Farm Prosperity Solutions (FPS) — Progress Report

> **Last updated:** 26 June 2026
> **Overall status:** Phases 0–4 (partial) complete · RBAC Phase 1 (DB schema) complete on `feature/RBAC` · Admin Portal live · Agri Intelligence Map live · Cloud deployed on Render + Vercel · Release APK **v1.4** distributed · **Production-critical stabilization pass applied**

---

## Changes since 25 June 2026

> On branch `feature/RBAC` (active RBAC development branch).

- **RBAC Phase 1 (Database Schema) — verified complete and fully applied.** A comprehensive audit discovered that although Phase 1 model code had been authored, the four core migrations (`accounts/0005`–`0007`, `workflow/0002`) had **never been applied** to the development database (tables existed from the now-obsolete `feature/rbac-implementation` branch, causing Django's `migrate` to fail with `DuplicateTable` errors).
  - All four migrations fake-applied (`--fake`) to register them in migration history.
  - New remediation migration `accounts/0008_rbac_schema_gaps` closes all schema gaps the obsolete branch left behind: adds missing `accounts_user.updated_at` column, GIN `idx_user_districts` index, `idx_userperm_expires` partial index, and five missing UNIQUE/CHECK constraints (`uniq_role_permission`, `uniq_user_permission`, `uniq_user_region`, `uniq_user_device`, `ck_userperm_effect`).
  - Seeds the 5 missing Regions (MH, MP, MH-NAN, MH-LAT, MP-KHG) and the missing `viewer` Role (6 of 7 roles had existed).
  - Backfills `primary_role` for the one user still NULL after the earlier migration.
  - Migration `accounts/0009_align_region_district_taluka_nonnull` aligns `Region.district`/`.taluka` model fields (were `null=True`) with the actual DB columns (`NOT NULL`) by switching to `blank=True, default=''`.
  - `manage.py check` → 0 issues · `makemigrations --check` → No changes detected · All migrations `[X]`.
  - **Final verified DB state:** 7 roles / 48 permissions / 5 regions / 3 approval workflows / all 4 users backfilled with `primary_role`.
- **Documentation updated:** `docs/rbac/11-IMPLEMENTATION-PHASES.md` Phase 1 section now documents the full audit trail. `docs/rbac/00-OVERVIEW.md`, `docs/README.md`, `docs/CONTEXT.md`, `docs/progress-report.md`, and root `README.md` updated.
- **`feature/rbac-implementation` branch is obsolete.** The active RBAC branch is `feature/RBAC`. Do not use `feature/rbac-implementation`.

---

## Changes since 19 June 2026


> On branch `feature/business-enhancements` (**not yet merged to `main`**).

- **Enhancement Phase 0 (Quick Wins) complete** — all six requirements shipped (future-date
  guard, "Recent Activities" home feed, module-naming standardization, share, Market
  Intelligence step merge, surfaced Product Performance remarks). Details:
  [enhancement-phases/PHASE-0-Quick-Wins.md](enhancement-phases/PHASE-0-Quick-Wins.md).
  - Two items exceeded the plan: **share now does image + text** everywhere (not just text),
    and module naming adopted the **"… Module"** convention (`Crop Intelligence Module`, etc.).
- **Beyond Phase 0 scope (same branch):**
  - Offline upload made **idempotent** against duplicate records (backend views + `syncService.ts`).
  - Market Intelligence entry points consolidated into a **hub**; Crop Intelligence entry
    points consolidated to **Visits**.
  - Admin portal: **expandable** observation/remark rows on the demos table.
- Enhancement Phases 1–2 already implemented earlier on this branch (additive fields, farmer
  identity & profiling). Pending: Phases 3 (crop-wise market intel), 4 (editable submissions —
  deferred to RBAC), 5 (master data & reports).

---

## Changes since 18 June 2026

- **Agri Intelligence Map merged to `main` and deployed** — `feature/agri-intelligence-map` merged via `--no-ff`. Full geospatial command-center live at `/map` on the admin portal:
  - New `geo` Django app with 7 read-only API endpoints (`/api/geo/facets/`, `/aggregate/`, `/points/`, `/record/`, `/region/`, `/flows/`, `/timeline/`)
  - PostGIS spatial GIST indexes on `FarmerVisit`, `MandiArrival`, `ProductDemo`
  - `mandi` model gains optional `location` PointField (SRID 4326, migration 0007)
  - Admin portal: MapLibre GL + deck.gl map at `(map)/map` route group; cluster/heat/flow/pin/district layers; command palette; filter rail; date picker; record sidebar; India-only confinement with fog mask
  - GeoJSON bundled in `public/geo/` (444 KB districts, 16 KB outline) — served as static assets
- **RBAC columns added to DB** — `accounts/0004_add_rbac_fields` actually creates the 11 User columns that `0003_rbac_fields_state_only` had declared in ORM state only. Fixes Django admin 500 on `/admin/`.
- **`next.config.ts` updated** — added `transpilePackages` for deck.gl/luma.gl/math.gl suite to fix Turbopack production build hang on Vercel.

**On feature branches (not merged to `main`):**
- `feature/RBAC` — RBAC implementation (Phase 1 DB schema complete; Phase 2 permission engine next). The DB columns for RBAC fields exist on `feature/RBAC` via migrations `accounts/0005`–`0009`. The `feature/rbac-implementation` branch is **obsolete** — do not use it.

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

**Known dev-environment note:** the RBAC User columns (`employee_id`, `state`, `districts`, etc.) are now on `main` via `accounts/0004_add_rbac_fields`. Any database migrated from `main` will have these columns. The `feature/rbac-implementation` branch adds the enforcement logic on top; keep its database separate to avoid migration conflicts.

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
| Admin Portal | ✅ Complete — Next.js 16, 9 pages, field data + CSV export + Agri Map |
| Agri Intelligence Map | ✅ Live — MapLibre + deck.gl geospatial command-center at `/map` |
| Cloud Deployment | ✅ Complete — Render (Docker + PostGIS) + Vercel (admin portal) |
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

Next.js 16 app at `admin-portal/`, dev server at `localhost:3000`. Route groups: `(dashboard)` for all management pages, `(map)` for the Agri Intelligence Map, plus a `login` route. Roles/Permissions/Approvals/Audit exist as frontend on `main`; the backing RBAC permission engine lives on `feature/rbac-implementation`.

**Pages live:**
| Page | Route group | Feature |
|---|---|---|
| Dashboard | (dashboard) | KPI cards + stats strip |
| Analytics | (dashboard) | Productivity chart + Approval SLA chart |
| Users | (dashboard) | Paginated user list + create/edit drawer |
| Roles | (dashboard) | Role list + role detail with permission matrix |
| Permissions | (dashboard) | Full permission matrix editor |
| Approvals | (dashboard) | Maker-checker approval queue + detail view |
| Audit Log | (dashboard) | Full audit trail table |
| Field Data — Farmer Visits | (dashboard) | Filterable paginated table + Export CSV |
| Field Data — Mandi Arrivals | (dashboard) | Filterable paginated table + Export CSV |
| Field Data — Product Demos | (dashboard) | Filterable paginated table + Export CSV |
| Agri Intelligence Map | (map) | MapLibre + deck.gl geospatial command-center |

**Backend: `admin_portal` Django app**
- `GET/POST /api/admin/field-data/visits/` — list + streaming CSV export
- `GET/POST /api/admin/field-data/mandi/` — list + streaming CSV export
- `GET/POST /api/admin/field-data/demos/` — list + streaming CSV export
- All endpoints gated by `is_staff`; filters: date range, district, crop/product, executive

---

### ✅ Agri Intelligence Map

Geospatial command-center for field data visualization. Lives at `/map` on the admin portal under the `(map)` route group.

**Frontend (admin-portal):**
- MapLibre GL JS base map (CartoCDN dark/light tiles, India-only confinement with fog mask)
- deck.gl layers: cluster, heatmap, flow, pin, district choropleth
- Command palette with district search
- Filter rail: module (visits/mandi/demos), executive, product, commodity, date range
- Timeline dock with daily/weekly/monthly bucketing
- Record sidebar — click any point to see full record details
- GeoJSON bundled locally (`public/geo/`) — offline-capable, no external tile dependency for boundaries

**Backend (`geo` Django app):**

| Endpoint | Purpose |
|---|---|
| `GET /api/geo/facets/` | Available filters (districts, executives, products, commodities) |
| `GET /api/geo/aggregate/?level=district\|state` | Choropleth aggregation GeoJSON |
| `GET /api/geo/points/?bbox=` | Point features within viewport |
| `GET /api/geo/record/<id>/?module=` | Full record detail for sidebar |
| `GET /api/geo/region/<level>/<id>/summary/` | District/state summary panel |
| `GET /api/geo/flows/?type=` | Flow lines between locations |
| `GET /api/geo/timeline/?bucket=` | Time-series counts for timeline dock |

All endpoints are read-only, gated by `IsAuthenticated`. Field executives see only their own records (scope filter in `geo/scope.py`).

---

### ✅ Cloud Deployment

| Item | Status |
|---|---|
| Django backend Dockerized (GDAL + gunicorn + whitenoise) | ✅ |
| PostgreSQL + PostGIS on Render | ✅ |
| Auto-migrate + auto-seed on container startup | ✅ |
| Live URL: `https://fps-cims-backend.onrender.com` | ✅ |
| Django Admin: `https://fps-cims-backend.onrender.com/admin` | ✅ |
| Admin Portal on Vercel (Next.js 16, Turbopack) | ✅ |
| Release APK signed with `farm-prosperity-release.keystore` | ✅ |
| APK distributed to testers via ADB | ✅ |
