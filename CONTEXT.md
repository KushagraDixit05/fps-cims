# Farm Prosperity Solution (FPS) — Project Context

> Paste this file at the start of a new chat to resume work with full context.

---

## Project Overview

**Farm Prosperity Solution (FPS / fps-cims)** is an internship project — a field data collection platform for agricultural field executives. Field executives visit farmers, log crop health observations (Crop Monitoring module) and mandi (market) arrival data, and submit it to a central Django backend. The app works **offline-first** (Phase 3 complete) — records are saved locally when there is no internet, and synced automatically when connectivity is restored.

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
| Mobile navigation | React Navigation 7 (stack + bottom tabs) |
| Mobile forms | react-hook-form + custom useReducer hook (wizard) |
| Mobile local storage | WatermelonDB + react-native-quick-sqlite (offline-first DB) |
| Mobile token storage | AsyncStorage (JWT tokens) |
| Mobile HTTP | Axios with interceptors + JWT refresh |
| Mobile camera/gallery | react-native-image-picker |
| Mobile GPS | @react-native-community/geolocation |
| Mobile date picker | @react-native-community/datetimepicker |
| Connectivity detection | @react-native-community/netinfo |

---

## Repository Structure

```
fps/
├── backend/                        ← Django project
│   ├── accounts/                   ← Custom user model, JWT auth
│   ├── crops/                      ← Legacy CropEntry + new FarmerVisit module
│   │   ├── models.py               ← ALL models (legacy + new)
│   │   ├── serializers.py          ← Multipart + nested serializers
│   │   ├── views.py                ← ViewSets + /summary/ action
│   │   ├── urls.py                 ← API routes
│   │   └── management/commands/
│   │       └── seed_crop_master.py ← Seeds 8 crops, 25 varieties, 46 blocks
│   ├── mandi/                      ← Mandi master + daily arrivals
│   ├── fps_backend/                ← Django project settings & urls
│   ├── .env                        ← DB credentials (not in git — already on disk)
│   ├── docker-compose.yml          ← PostGIS container
│   ├── manage.py
│   └── venv/                       ← Python virtualenv
│
├── mobile/FarmProsperity/          ← React Native app
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts           ← Axios instance, base URL logic, JWT interceptor
│   │   │   ├── auth.ts             ← login(), logout(), getMe()
│   │   │   ├── crops.ts            ← Legacy: getCropEntries, createCropEntry, getDashboardSummary
│   │   │   ├── mandi.ts            ← getMandis, getMandiArrivals, getYoYComparison
│   │   │   └── cropMonitoring.ts   ← getCropMaster, getDistricts, getBlocks,
│   │   │                               submitFarmerVisit, getVisitSummary, getFarmerVisits,
│   │   │                               getFarmerVisitDetail
│   │   ├── database/               ← WatermelonDB local database (Phase 3)
│   │   │   ├── index.ts            ← Database instance (SQLiteAdapter + all model classes)
│   │   │   ├── schema.ts           ← Full WatermelonDB schema (farmer_visits, crop_entries,
│   │   │   │                           mandi_arrivals + reference tables)
│   │   │   ├── operations.ts       ← saveVisitLocally(), saveCropEntryLocally(),
│   │   │   │                           saveMandiArrivalLocally() — called by all form screens
│   │   │   └── models/
│   │   │       ├── FarmerVisitModel.ts   ← WatermelonDB model for farmer_visits table
│   │   │       ├── CropEntryModel.ts     ← WatermelonDB model for crop_entries table
│   │   │       ├── MandiArrivalModel.ts  ← WatermelonDB model for mandi_arrivals table
│   │   │       ├── DistrictModel.ts      ← Reference data model
│   │   │       ├── BlockModel.ts         ← Reference data model
│   │   │       ├── CropMasterModel.ts    ← Reference data model (with varieties JSON)
│   │   │       └── MandiModel.ts         ← Reference data model
│   │   ├── sync/                   ← Sync engine (Phase 3)
│   │   │   ├── syncService.ts      ← syncPendingRecords(), getPendingCount(), getLastSyncTime()
│   │   │   ├── syncTypes.ts        ← SyncResult, SyncStats interfaces
│   │   │   ├── useAutoSync.ts      ← NetInfo hook — auto-triggers sync on reconnect
│   │   │   └── seedReferenceData.ts← Seeds districts, blocks, crop master, mandis on login
│   │   ├── hooks/
│   │   │   └── useCropMonitoringForm.ts  ← useReducer wizard state manager + calls saveVisitLocally()
│   │   ├── store/
│   │   │   └── authStore.tsx       ← React Context + useReducer auth state
│   │   ├── navigation/
│   │   │   ├── types.ts            ← RootStackParamList (all routes)
│   │   │   └── AppNavigator.tsx    ← Auth-gated navigator
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── HomeScreen.tsx      ← Dashboard: visit summary strip + recent visits list
│   │   │   ├── CropListScreen.tsx  ← Legacy crop list
│   │   │   ├── CropEntryFormScreen.tsx ← Legacy 4-step crop wizard (saves locally, Phase 3)
│   │   │   ├── CropDetailScreen.tsx
│   │   │   ├── MandiListScreen.tsx
│   │   │   ├── MandiEntryFormScreen.tsx ← Saves locally, Phase 3
│   │   │   ├── MandiDetailScreen.tsx
│   │   │   ├── ReportsScreen.tsx
│   │   │   ├── ProfileScreen.tsx   ← Sync dashboard: pending counts, last sync time,
│   │   │   │                           connectivity indicator, Sync Now button
│   │   │   └── cropMonitoring/     ← Crop Monitoring Wizard
│   │   │       ├── CropMonitoringFormScreen.tsx ← Wizard shell (saves locally offline-first)
│   │   │       ├── Step1_FarmerDetails.tsx      ← Farmer info + district/block dropdowns
│   │   │       ├── Step2_CropDetails.tsx        ← Dynamic multi-crop card list
│   │   │       ├── Step3_PhotosLocation.tsx     ← Photos + GPS + remark
│   │   │       ├── ReviewScreen.tsx             ← Read-only confirm before submit
│   │   │       ├── SuccessScreen.tsx            ← Animated confirmation
│   │   │       └── CropMonitoringDetailScreen.tsx ← Visit detail (from dashboard)
│   │   ├── components/
│   │   │   ├── Button.tsx          ← primary / secondary / danger variants
│   │   │   ├── Card.tsx
│   │   │   ├── ConditionBadge.tsx  ← Legacy Good/Average/Poor pill
│   │   │   ├── ConditionSelector.tsx ← 3-pill interactive selector
│   │   │   ├── CropCard.tsx        ← Collapsible per-crop form card
│   │   │   ├── EmptyState.tsx
│   │   │   ├── FormInput.tsx
│   │   │   ├── LoadingScreen.tsx
│   │   │   ├── LocationCapture.tsx ← Auto-GPS with retry
│   │   │   ├── PhotoPicker.tsx     ← Multi-photo picker (camera + gallery)
│   │   │   └── ProblemCheckboxGroup.tsx ← 6-problem checkbox grid
│   │   ├── types/
│   │   │   ├── index.ts            ← Legacy domain interfaces
│   │   │   └── cropMonitoring.ts   ← All crop monitoring interfaces
│   │   └── utils/
│   │       ├── colors.ts           ← Brand color tokens
│   │       ├── helpers.ts          ← formatDate, formatCurrency, conditionColor
│   │       └── cropMonitoringValidation.ts ← Pure per-step validation functions
│   ├── android/
│   │   ├── gradle.properties       ← reactNativeArchitectures=arm64-v8a,x86_64
│   │   └── app/src/main/AndroidManifest.xml ← CAMERA, LOCATION, STORAGE permissions
│   ├── scripts/
│   │   └── run-android.sh          ← Smart launcher (auto-detects emulator vs device)
│   └── package.json
│
├── docs/
│   ├── PHASE-0-Foundation-Setup.md
│   ├── PHASE-1-Backend-Models-API.md
│   ├── PHASE-2-Mobile-App-Core.md
│   ├── PHASE-3-Offline-Sync.md     ← ✅ Implemented — WatermelonDB offline-first
│   └── CropMonitoringPlan.md       ← Detailed spec for the crop monitoring module
│
├── CONTEXT.md                      ← This file
├── SETUP.md                        ← Step-by-step setup guide
├── TESTING_INSTRUCTIONS.md         ← Offline sync testing guide
└── progress-report.md              ← Current module completion status
```

---

## Phase Progress

| Phase | Status | Description |
|---|---|---|
| Phase 0 — Foundation | ✅ Done | Repo, venv, Docker, RN scaffold |
| Phase 1 — Backend API | ✅ Done | Django models, JWT auth, all REST endpoints |
| Phase 2 — Mobile Core | ✅ Done | All screens built, connected to live API, running on physical device |
| **Crop Monitoring Module** | ✅ **Done** | Full 3-step wizard (backend + mobile) — Phases A through F complete |
| **Phase 3 — Offline Sync** | ✅ **Done** | WatermelonDB local DB + background auto-sync + manual sync dashboard |
| Phase 4 — Photos & Polish | ⏳ Future | Geo maps, polished reports, edit submitted entries |

---

## How to Start the Project

### Start backend
```bash
cd "/media/kushagra/crucial/FPS internship/fps/backend"
docker compose up -d                                       # Start PostGIS DB
./venv/bin/python manage.py runserver 0.0.0.0:8000        # Start Django
```

### Start mobile app (Metro)
```bash
cd "/media/kushagra/crucial/FPS internship/fps/mobile/FarmProsperity"
npm start
```

### Deploy to physical OnePlus 11R (USB)
```bash
adb reverse tcp:8000 tcp:8000   # Tunnel API port over USB
adb reverse tcp:8081 tcp:8081   # Tunnel Metro bundler port
npm run android:phone           # Build arm64 + install
```

### Deploy to emulator
```bash
npm run android:emulator        # Build x86_64 + install
```

---

## Critical Configuration

### API Base URL (`src/api/client.ts`)
Resolved **at runtime** — no env files needed:
- **Emulator:** `http://10.0.2.2:8000/api`
- **Physical device (USB):** `http://localhost:8000/api` via `adb reverse`
- **Wi-Fi override:** Set `MANUAL_IP = '192.168.x.x'` on line ~23 of `client.ts`

### npm Scripts
| Command | Effect |
|---|---|
| `npm run android` | Auto-detect device → correct ABI |
| `npm run android:phone` | Force `arm64-v8a` (OnePlus 11R) |
| `npm run android:emulator` | Force `x86_64` (Pixel 8 emulator) |

---

## Dev Credentials

| Item | Value |
|---|---|
| Django admin | `http://localhost:8000/admin` |
| Username | `admin` |
| Password | `FarmPros@2026` |
| Role | `field_executive` (also `is_superuser=True`) |
| DB name | `fps_db` |
| DB user | `fps_user` |
| DB password | `kushagra123` |

---

## Backend API Reference

**Base URL:** `http://localhost:8000`  
All endpoints (except auth) require: `Authorization: Bearer <access_token>`

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | Get JWT tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| GET | `/api/auth/me/` | Current user profile |

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

---

## Phase 3 — Offline-First Architecture

### How It Works

```
User fills form
      ↓
saveVisitLocally() / saveCropEntryLocally() / saveMandiArrivalLocally()
      ↓
WatermelonDB (SQLite) — is_synced = false   ← INSTANT, works offline
      ↓
useAutoSync() detects internet via NetInfo
      ↓
syncPendingRecords() — POST to Django, mark is_synced = true
```

### Key Files
| File | Role |
|---|---|
| `src/database/schema.ts` | Defines all WatermelonDB tables (farmer_visits, crop_entries, mandi_arrivals + reference tables) |
| `src/database/operations.ts` | Write helpers called by all form screens |
| `src/sync/syncService.ts` | `syncPendingRecords()`, `getPendingCount()`, `getLastSyncTime()` |
| `src/sync/syncTypes.ts` | `SyncResult` (includes `offline: boolean` flag), `SyncStats` |
| `src/sync/useAutoSync.ts` | NetInfo listener hook — throttled to 1 sync/minute |
| `src/sync/seedReferenceData.ts` | Seeds districts/blocks/crop master/mandis locally on login |
| `src/screens/ProfileScreen.tsx` | Sync dashboard: per-table pending counts, last sync time, Sync Now button |

### SyncResult.offline Flag
`syncPendingRecords()` sets `result.offline = true` when no internet is detected (early return).
`handleManualSync()` in ProfileScreen checks this **before** interpreting `synced === 0` — so it shows
"No Internet Connection — N records pending" instead of the misleading "No pending records to sync".

---

## Mobile Architecture — Key Decisions

| Decision | Reason |
|---|---|
| `useReducer` in `useCropMonitoringForm` | Review & Edit navigation never loses data |
| Review/Success as in-tree components, not routes | Prevents deep-linking to mid-wizard screens |
| `crops` as JSON string in FormData | RN multipart cannot send nested arrays natively |
| Legacy `CropEntry` preserved | Zero risk to existing data; both modules coexist |
| Runtime base URL detection | Same APK works on emulator and device |
| WatermelonDB for offline storage | Fast SQLite with reactive queries; works well on New Architecture |
| `offline: boolean` in SyncResult | Lets callers distinguish "offline, didn't try" from "online, nothing pending" |

---

## Known Gotchas & Fixes

1. **`INSTALL_FAILED_NO_MATCHING_ABIS`** — Fixed by `run-android.sh` injecting correct ABI per device
2. **API unreachable on physical device** — Fixed in `client.ts` with runtime emulator detection
3. **`InteractionManager` deprecation warning** — Harmless, from React Navigation internals
4. **Docker daemon not running** — Must start Docker Desktop before `docker compose up -d`
5. **New native packages need rebuild** — `@react-native-community/geolocation`, `@react-native-community/datetimepicker`, and WatermelonDB all require a full `npm run android` (not just Metro restart)
6. **DateTimePicker crash on Android (OxygenOS)** — Fixed: guard `event.type === 'dismissed'`, always return a valid `Date` to native bridge, 150ms delay before Step 2→3 navigation
7. **Manual Sync Now shows "No pending records" while offline** — Fixed: `syncPendingRecords()` sets `result.offline = true` on early return; `handleManualSync()` checks this flag first

---

## Environment

- **OS:** Ubuntu 24.04 LTS
- **Physical test device:** OnePlus 11R (CPH2487, Android 14, ARM64)
- **Emulator:** Pixel 8 (x86_64, API 34)
- **JDK:** Android Studio bundled JBR at `/media/kushagra/crucial/android-studio/ide/jbr`
- **New Architecture:** Enabled (`newArchEnabled=true`)
- **Hermes engine:** Enabled (`hermesEnabled=true`)
