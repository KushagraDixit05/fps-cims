# Phase 3 — Offline-First: WatermelonDB & Sync
**Farm Prosperity Solutions · React Native + Django**  
**Status: ✅ Implemented — Week 10–13**

---

## Goal

Make the app work without internet. Field executives in rural Nanded or Guntur areas have patchy connectivity. Every form they fill saves locally first, then syncs to the server when online.

---

## 3.1 — How Offline-First Works

```
┌──────────────────────────────────────────────────────┐
│                    MOBILE APP                        │
│                                                      │
│  User fills form                                     │
│       ↓                                              │
│  saveVisitLocally() / saveCropEntryLocally()         │
│  saveMandiArrivalLocally()  ←── INSTANT              │
│       ↓                                              │
│  WatermelonDB (SQLite) — is_synced = false           │
│       ↓                                              │
│  useAutoSync() detects internet via NetInfo          │
│       ↓                                              │
│  syncPendingRecords() — POST to Django               │
│       ↓                                              │
│  Mark is_synced = true in WatermelonDB               │
└──────────────────────────────────────────────────────┘
```

The key rule: **the app never waits for the network to show data or accept input.**

---

## 3.2 — Installed Packages

```bash
npm install @nozbe/watermelondb
npm install react-native-quick-sqlite
npm install @react-native-community/netinfo
```

Babel configured with decorator support in `babel.config.js`:
```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ],
};
```

---

## 3.3 — Local Database Schema (`src/database/schema.ts`)

Three user-data tables (with `is_synced` + `server_id`) and four reference-data tables:

| Table | Purpose |
|---|---|
| `farmer_visits` | Crop Monitoring wizard submissions |
| `crop_entries` | Legacy 4-step crop entry form |
| `mandi_arrivals` | Mandi arrival data |
| `districts` | Cached from `/api/districts/` on login |
| `blocks` | Cached from `/api/blocks/` on login |
| `crop_master` | Cached from `/api/crop-master/` on login (varieties stored as JSON) |
| `mandis` | Cached from `/api/mandis/` on login |

All user-data tables share these sync columns:
```
server_id       — Django UUID, written after successful sync
is_synced       — boolean, false until synced
sync_error      — last error message (null if clean)
created_at_local — Unix ms timestamp
updated_at_local — Unix ms timestamp
```

---

## 3.4 — WatermelonDB Models (`src/database/models/`)

| Model file | Table | Key fields |
|---|---|---|
| `FarmerVisitModel.ts` | `farmer_visits` | farmerName, villageName, blockName, districtName, cropsJson, photosJson, latitude, longitude, isSynced |
| `CropEntryModel.ts` | `crop_entries` | farmerId, cropName, areaThisYear, cropStage, cropCondition, isSynced |
| `MandiArrivalModel.ts` | `mandi_arrivals` | mandiId, commodity, date, arrivalQuantity, avgRate, isSynced |
| `DistrictModel.ts` | `districts` | serverId, name, state |
| `BlockModel.ts` | `blocks` | serverId, name, districtServerId |
| `CropMasterModel.ts` | `crop_master` | serverId, cropName, varietiesJson |
| `MandiModel.ts` | `mandis` | serverId, name, district, state, isActive |

---

## 3.5 — Database Instance (`src/database/index.ts`)

```typescript
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
// ... all model imports ...

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'fps_offline_db',
  jsi: true,
  migrationEvents: true,
});

const database = new Database({ adapter, modelClasses: [...] });
export default database;
```

---

## 3.6 — Write Operations (`src/database/operations.ts`)

Three functions called by form screens — the only way form screens interact with WatermelonDB:

### `saveVisitLocally(state: CropMonitoringFormState)`
- Saves a complete Crop Monitoring wizard submission to `farmer_visits`
- Serializes crops array as `cropsJson` JSON string (same shape as FormData payload)
- Serializes photos as `photosJson` JSON string
- Returns `{ id, farmer_name, crop_count }` — same shape as the server's 201 response

### `saveCropEntryLocally(payload: CropEntryPayload)`
- Saves a legacy crop entry to `crop_entries`

### `saveMandiArrivalLocally(payload: MandiArrivalPayload, mandiName?)`
- Saves a mandi arrival to `mandi_arrivals`

All three set `isSynced = false`, `serverId = null`, `syncError = null`.

---

## 3.7 — Sync Service (`src/sync/syncService.ts`)

### `syncPendingRecords(): Promise<SyncResult>`

1. Checks `NetInfo.fetch()` — if offline, sets `result.offline = true` and returns immediately.
2. Calls `syncFarmerVisits()`, `syncCropEntries()`, `syncMandiArrivals()` in sequence.
3. Each helper queries `is_synced = false`, POSTs to Django, marks `isSynced = true` and stores `serverId`.
4. Failed records store their error in `syncError` and are retried on the next run.
5. Persists `@fps_last_sync_ts` to AsyncStorage on completion.

**FarmerVisit sync** rebuilds a `multipart/form-data` payload identical to the online submission path,
including re-attaching local photo URIs as file objects.

### `SyncResult` type (from `syncTypes.ts`)
```typescript
interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];   // human-readable error per failed record
  timestamp: number;  // Unix ms
  offline: boolean;   // true when sync aborted due to no connectivity
}
```

> **Why `offline: boolean`?**  
> When offline, `syncPendingRecords()` returns early with `synced=0, failed=0`. Without this flag,
> `handleManualSync()` in ProfileScreen cannot distinguish "offline, didn't try" from "online, nothing
> pending" — causing the bug where it showed "No pending records to sync" while records were queued.

### `getPendingCount(): Promise<SyncStats>`
Queries `is_synced = false` across all three tables and returns:
```typescript
interface SyncStats {
  pendingVisits: number;
  pendingCropEntries: number;
  pendingMandiArrivals: number;
  total: number;
}
```

### `getLastSyncTime(): Promise<number | null>`
Reads `@fps_last_sync_ts` from AsyncStorage.

---

## 3.8 — Auto-Sync Hook (`src/sync/useAutoSync.ts`)

Mounted once at the App root. Listens for NetInfo connectivity changes.

- Fires `syncPendingRecords()` whenever `isConnected && isInternetReachable` becomes true.
- Throttled to **once per 60 seconds** via a ref (no re-renders).
- Guards against concurrent sync runs with `isSyncingRef`.

```typescript
// In App.tsx:
import { useAutoSync } from './src/sync/useAutoSync';
const App = () => {
  useAutoSync();
  return <AppNavigator />;
};
```

---

## 3.9 — Reference Data Seeding (`src/sync/seedReferenceData.ts`)

Called immediately after a successful login. Fetches and caches:
- Districts → `districts` table
- Blocks → `blocks` table
- Crop master + varieties → `crop_master` table
- Mandis → `mandis` table

Skips tables that are already populated. Fails silently if offline — cached data from the previous login is used.

---

## 3.10 — Sync Status UI (`src/screens/ProfileScreen.tsx`)

The Profile screen is the sync dashboard:

| Element | Detail |
|---|---|
| Stats grid | Per-table pending counts (Visits / Crop Entries / Mandi) |
| Pending banner | Shows total when > 0 |
| Connectivity dot | Live indicator (green=online, red=offline) |
| Last synced | Formatted timestamp from `getLastSyncTime()` |
| Sync Now button | Calls `syncPendingRecords()`, shows spinner during sync |
| Error section | Expandable list of sync errors for failed records |

**Offline-aware Sync Now logic:**
```
result.offline === true
  → Alert: "No Internet Connection — N records pending"
result.offline === false && synced === 0 && failed === 0
  → Alert: "Up to date — No pending records to sync"
result.offline === false && failed === 0
  → Alert: "Sync Complete — N record(s) synced"
```

---

## 3.11 — Phase 3 Checklist

- [x] WatermelonDB installed and schema defined
- [x] Crop Monitoring wizard saves to local DB (works offline)
- [x] Legacy crop entry form saves to local DB (works offline)
- [x] Mandi entry form saves to local DB (works offline)
- [x] Pending count shows on profile screen (broken down by table)
- [x] Background auto-sync triggers when internet detected
- [x] Manual "Sync Now" button works correctly when online and offline
- [x] Reference data (crop master, districts, blocks, mandis) cached locally
- [x] Test: fill wizard offline → reconnect → records appear in Django Admin ✅ Verified

---

## What's Next
**Phase 4** — Map view of visit GPS locations, per-photo geo-tagging, edit submitted entries, PDF/Excel report export, push notifications for sync completion.
