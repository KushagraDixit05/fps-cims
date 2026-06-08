# FarmProsperity — React Native App

Part of the **Farm Prosperity Solutions (FPS)** internship project. This is the mobile client — an offline-first field operations platform for agricultural field executives.

For full project context, setup instructions, and architecture details, see the root [`CONTEXT.md`](../../CONTEXT.md) and [`SETUP.md`](../../SETUP.md).

---

## Quick Start

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Build and run (in a separate terminal)
npm run android:phone      # Physical device (arm64)
npm run android:emulator   # Android emulator (x86_64)
```

---

## Project Structure

```
src/
├── api/              ← Axios client + all API functions
│   ├── client.ts     ← Base URL auto-detection, JWT interceptor, refresh logic
│   ├── auth.ts       ← login, logout, getMe, register
│   ├── crops.ts      ← Legacy crop entry API
│   ├── mandi.ts      ← Mandi arrivals + YoY comparison
│   └── cropMonitoring.ts ← FarmerVisit, districts, blocks, crop-master
├── database/         ← WatermelonDB (offline-first SQLite, schema v3)
│   ├── schema.ts     ← All 8 tables (farmer_visits, mandi_arrivals, product_demos, + refs)
│   ├── migrations.ts ← v1→v2 (mandi wizard), v2→v3 (product_demos)
│   ├── operations.ts ← saveVisitLocally, saveMandiArrivalWizardLocally, saveProductDemoLocally
│   └── models/       ← FarmerVisitModel, MandiArrivalModel, ProductDemoModel, + 4 ref models
├── sync/             ← Sync engine, auto-sync hook, reference data seeder
├── hooks/
│   ├── useCropMonitoringForm.ts   ← 3-step wizard state (useReducer)
│   ├── useMandiArrivalForm.ts     ← 5-step wizard state (useReducer)
│   └── useProductDemoForm.ts      ← 4-step wizard state (useReducer)
├── store/            ← authStore (React Context + useReducer)
├── navigation/
│   ├── AppNavigator.tsx    ← v1 (preserved, not active)
│   └── AppNavigatorV2.tsx  ← v2 (ACTIVE — imported by App.tsx)
├── screens/          ← v1 production screens
│   ├── cropMonitoring/   ← Crop Monitoring wizard (3 steps + review + success + detail)
│   ├── mandiArrival/     ← Mandi Arrival wizard (5 steps + review + success)
│   └── productDemo/      ← Product Demo wizard (4 steps + review + success)
├── screens-v2/       ← v2 redesigned screens (active for auth + home)
├── components/       ← Shared UI components (used across all modules)
│   ├── AppIcon, Button, Card, ConditionBadge, ConditionSelector
│   ├── CropCard, DemoResultSelector, EmptyState, FormInput, InlinePicker
│   ├── LoadingScreen, LocationCapture, PhotoPicker, ProblemCheckboxGroup
├── types/
│   ├── index.ts          ← Legacy domain interfaces
│   ├── cropMonitoring.ts ← Crop Monitoring types
│   ├── mandiArrival.ts   ← Mandi Arrival types
│   └── productDemo.ts    ← Product Demo types
└── utils/
    ├── colors.ts                   ← Design system color tokens
    ├── icons.ts                    ← Centralised lucide-react-native exports
    ├── helpers.ts
    ├── cropMonitoringValidation.ts
    ├── mandiArrivalValidation.ts
    └── productDemoValidation.ts
```

---

## Key Commands

| Command | What it does |
|---|---|
| `npm start` | Start Metro bundler |
| `npm run android:phone` | Build arm64 APK + install on physical device |
| `npm run android:emulator` | Build x86_64 APK + install on emulator |
| `adb reverse tcp:8000 tcp:8000` | Forward backend port over USB (run before launching on device) |
| `adb reverse tcp:8081 tcp:8081` | Forward Metro port over USB |

---

## Navigator

`App.tsx` currently imports **AppNavigatorV2** — the redesigned navigation flow:

```
Splash → Welcome → Login | Sign Up → (auth success) → Drawer Navigator
                                                           └── Bottom Tabs
                                                                 ├── Home (v2)  ← 4 quick-action tiles
                                                                 ├── Crops
                                                                 ├── Mandi
                                                                 └── Reports
```

**Quick-action tiles on Home:**
- **New Visit** → `CropMonitoringForm` (3-step crop monitoring wizard)
- **Mandi** → Mandi tab
- **Product Demo** → `ProductDemoForm` (4-step product demo wizard)
- **Reports** → Reports tab

**All wizard routes:**
| Route | Module | Steps |
|---|---|---|
| `CropMonitoringForm` | Crop Monitoring | 3 (Farmer → Crops → Photos/Location) |
| `MandiArrivalForm` | Mandi Arrival | 5 (Mandi → Varieties → Source → Photos → Location) |
| `ProductDemoForm` | Product Demo | 4 (Farmer → Crop/Stage → Product/Dose → Photos/Result) |

Rollback to v1 by changing the import in `App.tsx` to `AppNavigator`.

---

## Offline-First Behavior

All forms save to WatermelonDB (local SQLite, schema v3) first. Data syncs to the Django backend when internet is available. See `src/sync/` for the sync engine and `src/database/` for the local schema.

Sync status is visible on the Profile tab. WatermelonDB schema version: **3**.
