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
├── database/         ← WatermelonDB schema, models, write operations
├── sync/             ← Sync engine, auto-sync hook, reference data seeder
├── hooks/            ← useCropMonitoringForm (wizard state)
├── store/            ← authStore (React Context + useReducer)
├── navigation/
│   ├── AppNavigator.tsx    ← v1 (preserved, not active)
│   └── AppNavigatorV2.tsx  ← v2 (ACTIVE — imported by App.tsx)
├── screens/          ← v1 production screens
├── screens-v2/       ← v2 redesigned screens (active for auth + home)
├── components/       ← v1 shared UI components
├── components-v2/    ← v2 design-system components (in progress)
├── types/            ← TypeScript interfaces
└── utils/            ← colors, helpers, validation
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
                                                                 ├── Home (v2)
                                                                 ├── Crops
                                                                 ├── Mandi
                                                                 ├── Reports
                                                                 └── Profile
```

Rollback to v1 by changing the import in `App.tsx` to `AppNavigator`.

---

## Offline-First Behavior

All forms save to WatermelonDB (local SQLite) first. Data syncs to the Django backend when internet is available. See `src/sync/` for the sync engine and `src/database/` for the local schema.

Sync status is visible on the Profile tab.
