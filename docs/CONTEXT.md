# Farm Prosperity Solutions (FPS) — Project Context

> Paste this file at the start of a new chat to resume work with full context.

---

## Project Overview

**Farm Prosperity Solutions (FPS / fps-cims)** is an internship project — a field data collection platform for agricultural field executives. Field executives visit farmers, log crop health observations (Crop Monitoring module), mandi (market) arrival data, and product demonstration visits (Product Demo module), and submit it to a central Django backend. The app works **offline-first** (Phase 3 complete) — records are saved locally when there is no internet, and synced automatically when connectivity is restored. The UI was redesigned in Phase 4 (screens-v2, now active) with a premium design system, a new auth flow, and a drawer-based navigation.

- **GitHub:** `https://github.com/KushagraDixit05/fps-cims`
- **Branch:** `main`
- **Root directory:** `/media/kushagra/crucial/FPS internship/fps`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, Django 6.0.5, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 15 with PostGIS (geo extension) via Docker |
| Mobile | React Native 0.85.3, TypeScript, New Architecture enabled |
| Auth | JWT (access: 12h, refresh: 30d, rotation enabled) |
| Admin Portal | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Recharts, TanStack Query |
| Mobile navigation | React Navigation 7 (stack + bottom tabs + drawer) |
| Mobile forms | react-hook-form + custom useReducer hook (wizard) |
| Mobile local storage | WatermelonDB + react-native-quick-sqlite (offline-first DB) |
| Mobile token storage | AsyncStorage (JWT tokens) |
| Mobile HTTP | Axios with interceptors + JWT refresh |
| Mobile camera/gallery | react-native-image-picker |
| Mobile GPS | @react-native-community/geolocation |
| Mobile date picker | @react-native-community/datetimepicker |
| Connectivity detection | @react-native-community/netinfo |
| Gesture handling | react-native-gesture-handler (required for drawer nav) |

---

## Repository Structure

```
fps/
├── backend/                        ← Django project
│   ├── accounts/                   ← Custom user model, JWT auth, registration
│   │   ├── models.py               ← Custom User (role + region + phone_number)
│   │   ├── serializers.py          ← UserProfileSerializer, RegisterSerializer
│   │   ├── views.py                ← MeView (GET), RegisterView (POST auto-login)
│   │   └── urls.py                 ← /me/ and /register/
│   ├── crops/                      ← Legacy CropEntry + new FarmerVisit module
│   │   ├── models.py               ← ALL models (legacy + new)
│   │   ├── serializers.py          ← Multipart + nested serializers
│   │   ├── views.py                ← ViewSets + /summary/ action
│   │   ├── urls.py                 ← API routes
│   │   └── management/commands/
│   │       └── seed_crop_master.py ← Seeds 8 crops, 25 varieties, 46 blocks
│   ├── mandi/                      ← Mandi master + daily arrivals
│   ├── admin_portal/               ← Admin Portal backend (new)
│   │   ├── views.py                ← List + streaming CSV export views for FarmerVisits,
│   │   │                               MandiArrivals, ProductDemos (is_staff gated)
│   │   ├── serializers.py          ← Admin-oriented serializers
│   │   ├── permissions.py          ← IsAdminUser permission class
│   │   └── urls.py                 ← /api/admin/field-data/* routes
│   ├── product_demo/               ← Product Demo module (new)
│   │   ├── models.py               ← ProductMaster, ProductDemo, DemoPhoto
│   │   ├── serializers.py          ← create/list/detail serializers
│   │   ├── views.py                ← ProductDemoViewSet, ProductMasterViewSet
│   │   ├── urls.py                 ← /api/product-demos/, /api/product-master/
│   │   ├── admin.py                ← Admin with DemoPhotoInline
│   │   └── management/commands/
│   │       └── seed_product_master.py ← Seeds 20 common agrochemicals
│   ├── fps_backend/                ← Django project settings & urls
│   ├── .env                        ← DB credentials (not in git — already on disk)
│   ├── docker-compose.yml          ← PostGIS container
│   ├── manage.py
│   └── venv/                       ← Python virtualenv
│
├── mobile/FarmProsperity/          ← React Native app
│   ├── App.tsx                     ← Root: AuthProvider + GestureHandlerRootView + AppNavigatorV2
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts           ← Axios instance, base URL logic, JWT interceptor
│   │   │   ├── auth.ts             ← login(), logout(), getMe(), register()
│   │   │   ├── crops.ts            ← Legacy: getCropEntries, createCropEntry, getDashboardSummary
│   │   │   ├── mandi.ts            ← getMandis, getMandiArrivals, getYoYComparison
│   │   │   └── cropMonitoring.ts   ← getCropMaster, getDistricts, getBlocks,
│   │   │                               submitFarmerVisit, getVisitSummary, getFarmerVisits,
│   │   │                               getFarmerVisitDetail
│   │   ├── database/               ← WatermelonDB local database (Phase 3, schema v8)
│   │   │   ├── index.ts            ← Database instance (SQLiteAdapter + all model classes)
│   │   │   ├── schema.ts           ← Full schema v8 (farmer_visits, crop_entries,
│   │   │   │                           mandi_arrivals, product_demos, villages + reference tables)
│   │   │   ├── migrations.ts       ← v1→v8, additive only (see "WatermelonDB Schema" below)
│   │   │   ├── operations.ts       ← saveVisitLocally(), saveCropEntryLocally(),
│   │   │   │                           saveMandiArrivalLocally(), saveMandiArrivalWizardLocally(),
│   │   │   │                           saveProductDemoLocally()
│   │   │   └── models/
│   │   │       ├── FarmerVisitModel.ts
│   │   │       ├── CropEntryModel.ts
│   │   │       ├── MandiArrivalModel.ts
│   │   │       ├── ProductDemoModel.ts
│   │   │       ├── DistrictModel.ts
│   │   │       ├── BlockModel.ts
│   │   │       ├── CropMasterModel.ts
│   │   │       └── MandiModel.ts
│   │   ├── sync/                   ← Sync engine (Phase 3)
│   │   │   ├── syncService.ts      ← syncPendingRecords(), getPendingCount(), getLastSyncTime()
│   │   │   ├── syncTypes.ts        ← SyncResult, SyncStats interfaces
│   │   │   ├── useAutoSync.ts      ← NetInfo hook — auto-triggers sync on reconnect
│   │   │   └── seedReferenceData.ts← Seeds districts, blocks, crop master, mandis on login
│   │   ├── hooks/
│   │   │   ├── useCropMonitoringForm.ts  ← useReducer wizard state manager + calls saveVisitLocally()
│   │   │   ├── useMandiArrivalForm.ts    ← Mandi Arrival wizard state (5 steps)
│   │   │   └── useProductDemoForm.ts     ← Product Demo wizard state (4 steps)
│   │   ├── store/
│   │   │   └── authStore.tsx       ← React Context + useReducer auth state
│   │   ├── navigation/
│   │   │   ├── types.ts            ← RootStackParamList (all routes including v2)
│   │   │   │                           Includes: CropMonitoringForm/Detail, MandiArrivalForm,
│   │   │   │                                     ProductDemoForm, ProductDemoDetail
│   │   │   ├── AppNavigator.tsx    ← v1 navigator (preserved, not active)
│   │   │   └── AppNavigatorV2.tsx  ← v2 navigator (ACTIVE) — Splash→Welcome→Login/Signup,
│   │   │                               DrawerNavigator wrapping tabs + detail screens
│   │   ├── screens/                ← v1 screens (all still used for most tabs)
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── CropListScreen.tsx
│   │   │   ├── CropEntryFormScreen.tsx
│   │   │   ├── CropDetailScreen.tsx
│   │   │   ├── MandiListScreen.tsx
│   │   │   ├── MandiEntryFormScreen.tsx
│   │   │   ├── MandiDetailScreen.tsx
│   │   │   ├── ReportsScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── cropMonitoring/     ← Crop Monitoring Wizard (3-step)
│   │   │   │   ├── CropMonitoringFormScreen.tsx
│   │   │   │   ├── Step1_FarmerDetails.tsx
│   │   │   │   ├── Step2_CropDetails.tsx
│   │   │   │   ├── Step3_PhotosLocation.tsx
│   │   │   │   ├── ReviewScreen.tsx
│   │   │   │   ├── SuccessScreen.tsx
│   │   │   │   └── CropMonitoringDetailScreen.tsx
│   │   │   ├── mandiArrival/       ← Mandi Arrival Wizard (5-step)
│   │   │   │   ├── MandiArrivalFormScreen.tsx
│   │   │   │   ├── Step1_MandiDetails.tsx
│   │   │   │   ├── Step2_CropVarieties.tsx
│   │   │   │   ├── Step3_SourceRemark.tsx
│   │   │   │   ├── Step4_Photos.tsx
│   │   │   │   ├── Step5_Location.tsx
│   │   │   │   ├── ReviewScreen.tsx
│   │   │   │   └── SuccessScreen.tsx
│   │   │   └── productDemo/        ← Product Demo Wizard (4-step)
│   │   │       ├── ProductDemoFormScreen.tsx
│   │   │       ├── Step1_FarmerDetails.tsx
│   │   │       ├── Step2_CropStageDetails.tsx
│   │   │       ├── Step3_ProductDoseDetails.tsx
│   │   │       ├── Step4_PhotosResultRemark.tsx
│   │   │       ├── ReviewScreen.tsx
│   │   │       └── SuccessScreen.tsx
│   │   ├── screens-v2/             ← v2 redesigned screens (ACTIVE via AppNavigatorV2)
│   │   │   ├── SplashScreen.tsx    ← Animated brand splash (2–3s auto-advance)
│   │   │   ├── WelcomeScreen.tsx   ← Value prop + "Sign In" / "Get Started" CTAs
│   │   │   ├── LoginScreen.tsx     ← Redesigned login form
│   │   │   ├── SignupScreen.tsx    ← Registration form (calls POST /api/auth/register/)
│   │   │   ├── HomeScreen.tsx      ← Redesigned dashboard (drawer-aware)
│   │   │   ├── SidebarContent.tsx  ← Drawer sidebar (user info + nav items)
│   │   │   └── cropMonitoring/     ← (placeholder — not yet redesigned)
│   │   ├── components/             ← shared UI components (used across all modules)
│   │   │   ├── AppIcon.tsx, Button.tsx, Card.tsx
│   │   │   ├── ConditionBadge.tsx, ConditionSelector.tsx, DemoResultSelector.tsx
│   │   │   ├── CropCard.tsx, EmptyState.tsx, FormInput.tsx, InlinePicker.tsx
│   │   │   ├── LoadingScreen.tsx, LocationCapture.tsx, PhotoPicker.tsx
│   │   │   └── ProblemCheckboxGroup.tsx
│   │   ├── components-v2/          ← v2 design-system components (in progress)
│   │   ├── types/
│   │   │   ├── index.ts            ← Legacy domain interfaces
│   │   │   ├── cropMonitoring.ts   ← Crop Monitoring module interfaces
│   │   │   ├── mandiArrival.ts     ← Mandi Arrival module interfaces
│   │   │   └── productDemo.ts      ← Product Demo module interfaces
│   │   └── utils/
│   │       ├── colors.ts           ← Brand color tokens (design system)
│   │       ├── helpers.ts          ← formatDate, formatCurrency, conditionColor
│   │       ├── icons.ts            ← Centralised lucide-react-native exports
│   │       ├── cropMonitoringValidation.ts
│   │       ├── mandiArrivalValidation.ts
│   │       └── productDemoValidation.ts
│   ├── android/
│   │   ├── gradle.properties       ← reactNativeArchitectures=arm64-v8a,x86_64
│   │   └── app/src/main/AndroidManifest.xml ← CAMERA, LOCATION, STORAGE permissions
│   ├── scripts/
│   │   └── run-android.sh          ← Smart launcher (auto-detects emulator vs device)
│   └── package.json
│
├── admin-portal/                   ← Next.js 16 admin portal
│   ├── src/
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx            ← Dashboard overview
│   │   │   │   ├── analytics/          ← Productivity + SLA charts
│   │   │   │   ├── users/              ← User list + drawer (create/edit)
│   │   │   │   ├── roles/              ← Role list + role detail
│   │   │   │   ├── permissions/        ← Permission matrix
│   │   │   │   ├── approvals/          ← Maker-checker approval queue
│   │   │   │   ├── audit/              ← Audit log table
│   │   │   │   └── field-data/
│   │   │   │       ├── visits/         ← Farmer Visits table + CSV export
│   │   │   │       ├── mandi/          ← Mandi Arrivals table + CSV export
│   │   │   │       └── demos/          ← Product Demos table + CSV export
│   │   │   └── login/                  ← Admin login (JWT auth)
│   │   ├── components/
│   │   │   ├── common/                 ← DataTable, KPICard, PageHeader, StatusBadge
│   │   │   ├── dashboard/              ← StatsStrip, ProductivityChart, ApprovalSLAChart
│   │   │   ├── layout/                 ← AppShell, Sidebar, TopBar, AuthGuard
│   │   │   ├── ui/                     ← shadcn/ui primitives
│   │   │   └── users/UserDrawer.tsx
│   │   ├── hooks/                      ← useUsers, useRoles, useApprovals, useAuditLog,
│   │   │                                   usePermissions, useAnalytics, useFieldData
│   │   ├── lib/                        ← api.ts (Axios), queryClient.ts, utils.ts
│   │   ├── store/authStore.ts          ← Zustand auth state
│   │   └── types/models.ts             ← All TypeScript interfaces
│   └── package.json
│
├── README.md                       ← Repo-root project overview (entry point)
└── docs/                           ← All project documentation (see docs/README.md index)
    ├── README.md                   ← Documentation index
    ├── CONTEXT.md                  ← This file
    ├── SETUP.md                    ← Step-by-step setup guide
    ├── TESTING_INSTRUCTIONS.md     ← Offline sync testing guide
    ├── progress-report.md          ← Current module completion status
    ├── PRODUCTION_AUDIT.md         ← Pre-rollout reliability/security audit
    ├── PHASE-0-Foundation-Setup.md
    ├── PHASE-1-Backend-Models-API.md
    ├── PHASE-2-Mobile-App-Core.md
    ├── PHASE-3-Offline-Sync.md     ← ✅ Implemented — WatermelonDB offline-first
    ├── design/
    │   ├── PRODUCT.md              ← Product vision, users, brand personality
    │   ├── DESIGN.md               ← Design system spec (colors, typography, components)
    │   └── requirements.md         ← Full UI/UX redesign requirements (18 requirements)
    ├── rbac/                       ← RBAC architecture (12 docs)
    └── archive/                    ← Incomplete historical planning drafts
```

---

## Phase Progress

| Phase | Status | Description |
|---|---|---|
| Phase 0 — Foundation | ✅ Done | Repo, venv, Docker, RN scaffold |
| Phase 1 — Backend API | ✅ Done | Django models, JWT auth, all REST endpoints |
| Phase 2 — Mobile Core | ✅ Done | All screens built, connected to live API, running on physical device |
| **Crop Monitoring Module** | ✅ **Done** | Full 3-step wizard (backend + mobile) — Phases A through F complete |
| **Mandi Arrival Module** | ✅ **Done** | Full 5-step wizard (backend + mobile) — schema v2, InlinePicker component |
| **Product Demo Module** | ✅ **Done** | Full 4-step wizard (backend + mobile) — new `product_demo` Django app, before/after split + multi-variety (schema v6/v7) |
| **Phase 3 — Offline Sync** | ✅ **Done** | WatermelonDB **schema v8**, write operations per module, background auto-sync, sync dashboard |
| **Phase 4 — UI Redesign** | 🔄 **In Progress** | Design system, new auth flow (Splash/Welcome/Login/Signup), redesigned Home, drawer nav — active via AppNavigatorV2 |
| **Admin Portal** | ✅ **Done** | Next.js 16 at `admin-portal/`; Dashboard, Analytics, Users, Roles, Permissions, Approvals, Audit, Field Data (Visits/Mandi/Demos) with CSV export |
| **Cloud Deployment** | ✅ **Done** | Dockerized backend on Render, PostgreSQL+PostGIS, auto-migrate/seed, release APK (app v1.4) distributed |
| **RBAC (permission engine)** | 🧪 **On branch** | Architecture documented (`docs/rbac/`); backend engine on `feature/rbac-implementation`. Admin-portal Roles/Permissions/Approvals/Audit pages exist on `main` as frontend. |
| **Agri Intelligence Map** | 🧪 **On branch** | Geospatial command-center (MapLibre + deck.gl + Django `geo` app) on `feature/agri-intelligence-map`. **Not merged to `main`.** |

---

## How to Start the Project

### Local development (dev build → localhost)
```bash
# Terminal 1 — Backend
cd "/media/kushagra/crucial/FPS internship/fps/backend"
docker compose up -d
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000

# Terminal 2 — Metro
cd "/media/kushagra/crucial/FPS internship/fps/mobile/FarmProsperity"
npm start

# Terminal 3 — Deploy dev build to device
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
npm run android:phone
```

### Admin portal (→ localhost:3000)
```bash
cd "/media/kushagra/crucial/FPS internship/fps/admin-portal"
npm run dev
# Login: use Django superuser credentials; requires backend running
```

### Build and distribute release APK (→ cloud backend)
```bash
cd "/media/kushagra/crucial/FPS internship/fps/mobile/FarmProsperity/android"
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk

adb install -r "app/build/outputs/apk/release/app-release.apk"
```

### Deploy to emulator
```bash
cd "/media/kushagra/crucial/FPS internship/fps/mobile/FarmProsperity"
npm run android:emulator
```

---

## Critical Configuration

### API Base URL (`src/api/client.ts`)
Controlled by `__DEV__` flag — no manual switching needed:
- **Release APK** (`__DEV__ === false`) → `https://fps-cims-backend.onrender.com/api`
- **Dev build** (`__DEV__ === true`) → auto-detected:
  - Emulator: `http://10.0.2.2:8000/api`
  - Physical device (USB): `http://localhost:8000/api` via `adb reverse`

Axios timeout: **60 seconds** (handles Render's ~30s cold start on free tier).

### Active Navigator
`App.tsx` currently imports `AppNavigatorV2` (v2 redesign active). To rollback to v1:
```ts
// In App.tsx, change:
import AppNavigator from './src/navigation/AppNavigatorV2';
// to:
import AppNavigator from './src/navigation/AppNavigator';
```

### npm Scripts
| Command | Effect |
|---|---|
| `npm run android` | Auto-detect device → correct ABI |
| `npm run android:phone` | Force `arm64-v8a` (OnePlus 11R) |
| `npm run android:emulator` | Force `x86_64` (Pixel 8 emulator) |

---

## Credentials & URLs

### Local development
| Item | Value |
|---|---|
| Django admin | `http://localhost:8000/admin` |
| DB name | `fps_db` |
| DB user | `fps_user` |
| DB password | `kushagra123` (Docker default) |

### Cloud (Render)
| Item | Value |
|---|---|
| Live API | `https://fps-cims-backend.onrender.com/api` |
| Django admin | `https://fps-cims-backend.onrender.com/admin` |
| Superuser | Set via `DJANGO_SUPERUSER_*` env vars on Render |
| Wake URL | `https://fps-cims-backend.onrender.com/api/auth/login/` |

### Android signing (release APK)
| Item | Location |
|---|---|
| Keystore file | `android/app/farm-prosperity-release.keystore` (gitignored — kept separately) |
| Keystore credentials | `android/keystore.properties` (gitignored — kept separately) |
| Package ID | `com.farmprosperity` |

---

## Backend API Reference

**Local base URL:** `http://localhost:8000`
**Cloud base URL:** `https://fps-cims-backend.onrender.com`
All endpoints (except auth) require: `Authorization: Bearer <access_token>`

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | Get JWT tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| GET | `/api/auth/me/` | Current user profile |
| POST | `/api/auth/register/` | Create account + auto-login (returns access + refresh) |

### Legacy Crop Entries (preserved)
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/crops/` | List / create legacy crop entries |
| GET | `/api/crops/summary/` | Aggregated stats (legacy) |

### Crop Monitoring Module
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/districts/` | District list |
| GET | `/api/blocks/?district=<id>` | Blocks filtered by district |
| GET | `/api/crop-master/` | Crops with nested varieties |
| POST | `/api/farmer-visits/` | Submit visit (multipart/form-data) |
| GET | `/api/farmer-visits/` | Paginated visit list |
| GET | `/api/farmer-visits/<uuid>/` | Visit detail |
| GET | `/api/farmer-visits/summary/` | Dashboard counts (today/week/month/team) |
| PATCH | `/api/farmer-visits/<uuid>/` | Partial update |

### Mandi
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/mandi-arrivals/` | List / create arrivals |
| GET | `/api/mandi-arrivals/yoy_comparison/?mandi_id=1` | Year-on-year comparison |
| GET | `/api/mandis/` | Mandi master list |

### Product Demo
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/product-demos/` | List / create demo entries (multipart/form-data) |
| GET | `/api/product-demos/<uuid>/` | Full demo detail with before/after photos |
| GET | `/api/product-demos/summary/` | Dashboard counts (today/week/month) |
| GET | `/api/product-master/` | Active product catalogue for dropdown |

### Admin Portal (is_staff required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/field-data/visits/` | Paginated FarmerVisits list (filters: date_from, date_to, district, crop, executive) |
| GET | `/api/admin/field-data/visits/export/` | Streaming CSV export of FarmerVisits |
| GET | `/api/admin/field-data/mandi/` | Paginated MandiArrivals list (filters: date_from, date_to, mandi_id) |
| GET | `/api/admin/field-data/mandi/export/` | Streaming CSV export of MandiArrivals |
| GET | `/api/admin/field-data/demos/` | Paginated ProductDemos list (filters: date_from, date_to, district, product) |
| GET | `/api/admin/field-data/demos/export/` | Streaming CSV export of ProductDemos |

### Master Data
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/villages/` | Village master list |
| GET | `/api/farmers/` | Farmer list (searchable) |

---

## Key Django Models

### `accounts.User`
- `role`: `field_executive` | `admin` | `viewer`
- `region`: string (e.g. "Nanded", "Guntur")
- `phone_number`: optional string

### `crops.FarmerVisit` (UUID PK)
- `executive` → FK to User
- `farmer_name`, `mobile_number`, `village_name`, `block_name`, `district_name`
- `total_land_acre`, `latitude`, `longitude`, `location` (PostGIS Point)
- `remark`, `submitted_at`, `local_id`, `is_synced` (Phase 3 fields)

### `crops.CropRecord` (UUID PK)
- `visit` → FK to FarmerVisit (related_name='crops')
- `crop_name`, `variety`, `date_of_sowing`
- `current_area_acre`, `last_year_area_acre`, `this_year_area_acre`
- `crop_stage`: seedling / vegetative / flowering / fruiting / harvesting / post_harvest
- `crop_condition`: good / average / poor
- `problems`: JSONField (list: pest/disease/weather/price/labour/other)
- `other_problem_detail`, `sort_order`

### `crops.VisitPhoto` (UUID PK)
- `visit` → FK to FarmerVisit
- `image`: ImageField → `visit_photos/%Y/%m/`

### `crops.CropEntry` (legacy — preserved, UUID PK)
- Single-crop per entry; kept intact for backward compatibility

### `product_demo.ProductMaster`
- `name`: unique agrochemical product name
- `category`: Insecticide / Fungicide / etc.
- `is_active`: controls dropdown visibility

### `product_demo.ProductDemo` (UUID PK)
- `executive` → FK to User
- `farmer_name`, `mobile_number`, `village_name`, `block_name`, `district_name`, `total_land_acre`
- `crop_name`, `variety`, `crop_stage`, `crop_stage_days`, `demo_date`
- `product_name`, `dose`, `dose_unit` (ml/acre, gm/acre, kg/acre, lt/acre, kg/ha)
- `demo_result`: excellent / good / average / poor / no_effect
- `additional_observations`, `remark`
- `location` (PostGIS Point), `latitude`, `longitude`
- `local_id`, `is_synced`, `submitted_at`

### `product_demo.DemoPhoto` (UUID PK)
- `demo` → FK to ProductDemo
- `image`: ImageField → `demo_photos/%Y/%m/`
- `photo_type`: before / after

---

## Phase 3 — Offline-First Architecture

### How It Works

```
User fills form
      ↓
saveVisitLocally() / saveCropEntryLocally() / saveMandiArrivalLocally()
  / saveMandiArrivalWizardLocally() / saveProductDemoLocally()
      ↓
WatermelonDB (SQLite) — is_synced = false   ← INSTANT, works offline
      ↓
useAutoSync() detects internet via NetInfo
      ↓
syncPendingRecords() — POST to Django, mark is_synced = true
```

### WatermelonDB Schema (v8)
| Table | Purpose |
|---|---|
| `farmer_visits` | Crop Monitoring wizard submissions (`village_id` FK added v4) |
| `crop_entries` | Legacy 4-step crop form |
| `mandi_arrivals` | Mandi entry + wizard (wizard cols v2; `mandi_custom_name` v5; `custom_source` v8) |
| `product_demos` | Product Demo wizard (before/after split v6; multi-variety `varieties_json` v7) |
| `villages` | Reference: village master (added v4) |
| `districts` | Reference: district master |
| `blocks` | Reference: block/taluka master |
| `crop_master` | Reference: crops + varieties |
| `mandis` | Reference: mandi master |

**Migration lineage (all additive — old app versions stay schema-valid):**
- **v1→v2** — mandi wizard cols (`varieties_json`, `photos_json`, `total_arrival_qt`, GPS)
- **v2→v3** — `product_demos` table (Product Demo module)
- **v3→v4** — `villages` table + `village_id` FK on `farmer_visits` & `product_demos`
- **v4→v5** — `mandi_custom_name` ("Others" mandi)
- **v5→v6** — Product Demo before/after split (`demo_phase`, `after_pending_sync`, `after_sync_error`)
- **v6→v7** — Product Demo multi-variety (`varieties_json`)
- **v7→v8** — mandi `custom_source` ("Others" source)

### Key Files
| File | Role |
|---|---|
| `src/database/schema.ts` | Defines all WatermelonDB tables (`DB_SCHEMA_VERSION = 8`) |
| `src/database/migrations.ts` | v1→v8 migrations, additive only |
| `src/database/operations.ts` | 5 write helpers called by all form screens |
| `src/sync/syncService.ts` | `syncPendingRecords()`, `getPendingCount()`, `getLastSyncTime()` |
| `src/sync/syncTypes.ts` | `SyncResult` (includes `offline: boolean` flag), `SyncStats` |
| `src/sync/useAutoSync.ts` | NetInfo listener hook — throttled to 1 sync/minute |
| `src/sync/seedReferenceData.ts` | Seeds districts/blocks/crop master/mandis locally on login |
| `src/screens/ProfileScreen.tsx` | Sync dashboard: pending counts, last sync time, Sync Now button |

---

## Phase 4 — UI Redesign (In Progress)

### What's Done
| Item | Status |
|---|---|
| Design system defined (`docs/design/DESIGN.md`) | ✅ |
| `AppNavigatorV2` — Splash→Welcome→Login/Signup→Drawer→Tabs | ✅ Active |
| `SplashScreen` — animated brand splash | ✅ |
| `WelcomeScreen` — value prop + Sign In / Get Started CTAs | ✅ |
| `LoginScreen` (v2) — redesigned login form | ✅ |
| `SignupScreen` — registration form with auto-login | ✅ |
| `HomeScreen` (v2) — redesigned dashboard | ✅ |
| `SidebarContent` — drawer with user info + nav | ✅ |
| `POST /api/auth/register/` backend endpoint | ✅ |

### What Remains (Phase 4 backlog)
- Redesign Crop Monitoring wizard screens (screens-v2/cropMonitoring/)
- Redesign Mandi Arrival, Product Demo, Reports, Profile screens (screens-v2/)
- Build components-v2 component library
- Online API sync for Mandi Arrival and Product Demo modules
- `ProductDemoDetailScreen` — full detail view
- Map view of visit GPS locations
- Per-photo geo-tagging
- Edit submitted visit after success
- Farmer search / autocomplete
- Export PDF / Excel reports
- Push notifications for sync completion

---

## Mobile Architecture — Key Decisions

| Decision | Reason |
|---|---|
| `useReducer` in all wizard hooks | Review & Edit navigation never loses data across steps |
| Review/Success as in-tree components, not routes | Prevents deep-linking to mid-wizard screens |
| `crops` as JSON string in FormData | RN multipart cannot send nested arrays natively |
| Before/after photos stored as separate JSON arrays | Preserves photo type metadata without a separate model |
| Hardcoded product list in Step3 (Product Demo) | No separate product_master DB table needed on mobile; seeded on backend |
| Legacy `CropEntry` preserved | Zero risk to existing data; both modules coexist |
| Runtime base URL detection | Same APK works on emulator and device |
| WatermelonDB for offline storage | Fast SQLite with reactive queries; works well on New Architecture |
| Schema migrations (v1→v8) additive only | Never destroys existing records; old app versions stay schema-valid |
| `offline: boolean` in SyncResult | Lets callers distinguish "offline, didn't try" from "online, nothing pending" |
| `AppNavigatorV2` + DrawerNavigator | Enables sidebar without breaking existing tab/stack routes |
| `GestureHandlerRootView` at root | Required by `@react-navigation/drawer` |
| `POST /api/auth/register/` with auto-login | Returns tokens immediately — no separate login step needed after signup |
| One Django app per feature module | `crops`, `mandi`, `product_demo` — clear separation of concerns, independent migrations |

---

## Known Gotchas & Fixes

1. **`INSTALL_FAILED_NO_MATCHING_ABIS`** — Fixed by `run-android.sh` injecting correct ABI per device
2. **API unreachable on physical device (dev build)** — Run `adb reverse tcp:8000 tcp:8000`; fixed in `client.ts` with runtime emulator detection
3. **"Can't reach server" in release APK** — Render free tier is sleeping. Open the wake URL in a browser and wait ~30s before using the app
4. **"Package conflict" installing release APK** — Old debug build has a different signature. Run `adb uninstall com.farmprosperity` first
5. **`InteractionManager` deprecation warning** — Harmless, from React Navigation internals
6. **Docker daemon not running** — Must start Docker Desktop before `docker compose up -d`
7. **New native packages need full rebuild** — `geolocation`, `datetimepicker`, WatermelonDB, `gesture-handler` all require `npm run android` (not just Metro restart)
8. **DateTimePicker crash on Android (OxygenOS)** — Fixed: guard `event.type === 'dismissed'`, always return valid `Date` to native bridge, 150ms delay before Step 2→3 navigation
9. **Manual Sync Now shows "No pending records" while offline** — Fixed: `syncPendingRecords()` sets `result.offline = true` on early return; `handleManualSync()` checks this flag first
10. **Drawer requires GestureHandlerRootView** — `App.tsx` wraps everything in `<GestureHandlerRootView style={{ flex: 1 }}>` to enable swipe-open gesture
11. **GDAL version mismatch in Docker** — `requirements.txt` omits `GDAL`; Dockerfile installs `GDAL==$(gdal-config --version)` to match system libgdal exactly

---

## Environment

- **OS:** Ubuntu 24.04 LTS
- **Physical test device:** OnePlus 11R (CPH2487, Android 14, ARM64)
- **Emulator:** Pixel 8 (x86_64, API 34)
- **JDK:** Android Studio bundled JBR at `/media/kushagra/crucial/android-studio/ide/jbr`
- **New Architecture:** Enabled (`newArchEnabled=true`)
- **Hermes engine:** Enabled (`hermesEnabled=true`)
