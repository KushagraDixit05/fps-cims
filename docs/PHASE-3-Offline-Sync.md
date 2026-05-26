# Phase 3 — Offline-First: WatermelonDB & Sync
**Farm Prosperity Solution · React Native + Django**
**Duration: Week 10–13**

---

## Goal
Make the app work without internet. Field executives in rural Nanded or Guntur areas will have patchy connectivity. Every form they fill must save locally first, then sync to the server when online. This is the most technically complex phase — take it step by step.

---

## 3.1 — How Offline-First Works

```
┌──────────────────────────────────────────────────────┐
│                    MOBILE APP                        │
│                                                      │
│  User fills form                                     │
│       ↓                                              │
│  Save to WatermelonDB (local SQLite)  ←── INSTANT    │
│       ↓                                              │
│  Show in app immediately                             │
│       ↓                                              │
│  Background sync (when WiFi/4G available)            │
│       ↓                                              │
│  POST to Django backend                              │
│       ↓                                              │
│  Mark as synced in WatermelonDB                      │
└──────────────────────────────────────────────────────┘
```

The key rule: **the app never waits for the network to show data or accept input.**

---

## 3.2 — WatermelonDB Setup

### Install
```bash
npm install @nozbe/watermelondb
npm install @nozbe/with-observables

# Native dependencies
npm install react-native-quick-sqlite  # SQLite engine for WatermelonDB

# iOS
cd ios && pod install && cd ..
```

### Configure babel (babel.config.js)
```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ],
};
```

---

## 3.3 — Define Local Database Schema

WatermelonDB needs a schema that mirrors (but doesn't have to be identical to) your Django models.

### src/database/schema.ts
```typescript
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'crop_entries',
      columns: [
        { name: 'farmer_name', type: 'string' },
        { name: 'phone_number', type: 'string', isOptional: true },
        { name: 'village_id', type: 'string', isOptional: true },
        { name: 'village_name', type: 'string' },
        { name: 'district', type: 'string' },
        { name: 'crop_name', type: 'string' },
        { name: 'area_this_year', type: 'number' },
        { name: 'area_last_year', type: 'number', isOptional: true },
        { name: 'sowing_date', type: 'string', isOptional: true },
        { name: 'crop_stage', type: 'string' },
        { name: 'crop_condition', type: 'string' },
        { name: 'expected_yield', type: 'number', isOptional: true },
        { name: 'buyer_interest', type: 'boolean', isOptional: true },
        { name: 'problem_pest', type: 'boolean' },
        { name: 'problem_disease', type: 'boolean' },
        { name: 'problem_weather', type: 'boolean' },
        { name: 'problem_price_concern', type: 'boolean' },
        { name: 'problem_other', type: 'string', isOptional: true },
        { name: 'visit_date', type: 'string' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        // Sync fields
        { name: 'server_id', type: 'string', isOptional: true },  // Django UUID after sync
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at_local', type: 'number' },  // Unix timestamp
      ],
    }),
    tableSchema({
      name: 'mandi_arrivals',
      columns: [
        { name: 'mandi_id', type: 'string' },
        { name: 'mandi_name', type: 'string' },
        { name: 'mandi_state', type: 'string' },
        { name: 'commodity', type: 'string' },
        { name: 'date', type: 'string' },
        { name: 'arrival_quantity', type: 'number' },
        { name: 'avg_rate', type: 'number', isOptional: true },
        { name: 'min_rate', type: 'number', isOptional: true },
        { name: 'max_rate', type: 'number', isOptional: true },
        { name: 'source', type: 'string' },
        { name: 'remark', type: 'string', isOptional: true },
        // Sync fields
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at_local', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'villages',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'taluka', type: 'string' },
        { name: 'district', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'server_id', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'mandis',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'district', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'server_id', type: 'string' },
      ],
    }),
  ],
});
```

---

## 3.4 — Define WatermelonDB Models

### src/database/models/CropEntryModel.ts
```typescript
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class CropEntryModel extends Model {
  static table = 'crop_entries';

  @field('farmer_name') farmerName!: string;
  @field('phone_number') phoneNumber!: string;
  @field('village_name') villageName!: string;
  @field('district') district!: string;
  @field('crop_name') cropName!: string;
  @field('area_this_year') areaThisYear!: number;
  @field('area_last_year') areaLastYear!: number;
  @field('sowing_date') sowingDate!: string;
  @field('crop_stage') cropStage!: string;
  @field('crop_condition') cropCondition!: string;
  @field('expected_yield') expectedYield!: number;
  @field('buyer_interest') buyerInterest!: boolean;
  @field('problem_pest') problemPest!: boolean;
  @field('problem_disease') problemDisease!: boolean;
  @field('problem_weather') problemWeather!: boolean;
  @field('problem_price_concern') problemPriceConcern!: boolean;
  @field('problem_other') problemOther!: string;
  @field('visit_date') visitDate!: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('server_id') serverId!: string;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
}
```

### src/database/models/MandiArrivalModel.ts
```typescript
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class MandiArrivalModel extends Model {
  static table = 'mandi_arrivals';

  @field('mandi_id') mandiId!: string;
  @field('mandi_name') mandiName!: string;
  @field('mandi_state') mandiState!: string;
  @field('commodity') commodity!: string;
  @field('date') date!: string;
  @field('arrival_quantity') arrivalQuantity!: number;
  @field('avg_rate') avgRate!: number;
  @field('source') source!: string;
  @field('remark') remark!: string;
  @field('server_id') serverId!: string;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
}
```

---

## 3.5 — Database Instance

### src/database/index.ts
```typescript
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import { CropEntryModel } from './models/CropEntryModel';
import { MandiArrivalModel } from './models/MandiArrivalModel';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'fps_database',
  jsi: true,        // faster JS interface
  migrationEvents: true,
});

const database = new Database({
  adapter,
  modelClasses: [CropEntryModel, MandiArrivalModel],
});

export default database;
```

---

## 3.6 — Sync Service

This is the heart of offline-first. It finds unsynced records and pushes them to Django.

### src/sync/syncService.ts
```typescript
import database from '../database';
import { CropEntryModel } from '../database/models/CropEntryModel';
import { MandiArrivalModel } from '../database/models/MandiArrivalModel';
import { createCropEntry, createMandiArrival } from '../api/crops';
import NetInfo from '@react-native-community/netinfo';

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Push all unsynced local records to the Django backend.
 * Called automatically when the app detects internet connectivity.
 */
export const syncPendingRecords = async (): Promise<SyncResult> => {
  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  // Check network first
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    return result;
  }

  // Sync crop entries
  const unsyncedCrops = await database.collections
    .get<CropEntryModel>('crop_entries')
    .query(Q.where('is_synced', false))
    .fetch();

  for (const entry of unsyncedCrops) {
    try {
      const serverRecord = await createCropEntry({
        farmer: entry.farmerName,  // In MVP: farmer name as string
        crop_name: entry.cropName,
        area_this_year: entry.areaThisYear,
        area_last_year: entry.areaLastYear,
        sowing_date: entry.sowingDate,
        crop_stage: entry.cropStage as any,
        crop_condition: entry.cropCondition as any,
        expected_yield: entry.expectedYield,
        buyer_interest: entry.buyerInterest,
        problem_pest: entry.problemPest,
        problem_disease: entry.problemDisease,
        problem_weather: entry.problemWeather,
        problem_price_concern: entry.problemPriceConcern,
        problem_other: entry.problemOther,
        visit_date: entry.visitDate,
        latitude: entry.latitude,
        longitude: entry.longitude,
        local_id: entry.id,  // WatermelonDB local ID for reference
      });

      // Mark as synced, store server ID
      await database.write(async () => {
        await entry.update((e) => {
          e.isSynced = true;
          e.serverId = serverRecord.id;
        });
      });

      result.synced++;
    } catch (err: any) {
      result.failed++;
      result.errors.push(`Crop entry ${entry.id}: ${err.message}`);
    }
  }

  // Sync mandi arrivals (same pattern)
  const unsyncedMandi = await database.collections
    .get<MandiArrivalModel>('mandi_arrivals')
    .query(Q.where('is_synced', false))
    .fetch();

  for (const arrival of unsyncedMandi) {
    try {
      const serverRecord = await createMandiArrival({
        mandi: parseInt(arrival.mandiId),
        commodity: arrival.commodity,
        date: arrival.date,
        arrival_quantity: arrival.arrivalQuantity,
        avg_rate: arrival.avgRate,
        source: arrival.source as any,
        remark: arrival.remark,
        local_id: arrival.id,
      });

      await database.write(async () => {
        await arrival.update((a) => {
          a.isSynced = true;
          a.serverId = serverRecord.id;
        });
      });

      result.synced++;
    } catch (err: any) {
      result.failed++;
      result.errors.push(`Mandi arrival ${arrival.id}: ${err.message}`);
    }
  }

  return result;
};

/**
 * Count unsynced records — for the pending badge in the profile screen.
 */
export const getPendingCount = async (): Promise<number> => {
  const { Q } = require('@nozbe/watermelondb');
  const crops = await database.collections
    .get<CropEntryModel>('crop_entries')
    .query(Q.where('is_synced', false))
    .fetchCount();

  const mandis = await database.collections
    .get<MandiArrivalModel>('mandi_arrivals')
    .query(Q.where('is_synced', false))
    .fetchCount();

  return crops + mandis;
};
```

---

## 3.7 — Auto-Sync on Connectivity

Set up a listener that triggers sync whenever the phone gets internet.

### src/sync/useAutoSync.ts
```typescript
import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncPendingRecords } from './syncService';

export const useAutoSync = () => {
  const lastSyncRef = useRef<Date | null>(null);

  useEffect(() => {
    // Listen for connectivity changes
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && state.isInternetReachable) {
        // Throttle: don't sync more than once per minute
        const now = new Date();
        if (lastSyncRef.current) {
          const secondsSinceLast =
            (now.getTime() - lastSyncRef.current.getTime()) / 1000;
          if (secondsSinceLast < 60) return;
        }

        lastSyncRef.current = now;
        const result = await syncPendingRecords();
        if (result.synced > 0) {
          console.log(`✅ Synced ${result.synced} records`);
        }
        if (result.failed > 0) {
          console.warn(`⚠️ Failed to sync ${result.failed} records`);
        }
      }
    });

    return () => unsubscribe();
  }, []);
};
```

Use it in your root App.tsx:
```typescript
import { useAutoSync } from './src/sync/useAutoSync';

const App = () => {
  useAutoSync();  // ← add this
  return (
    <>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <AppNavigator />
    </>
  );
};
```

---

## 3.8 — Update Forms to Save Locally First

Replace the direct API call in your crop entry form:

```typescript
// BEFORE (Phase 2 — online only):
await createCropEntry({ ...data });

// AFTER (Phase 3 — offline first):
await database.write(async () => {
  await database.collections.get('crop_entries').create((entry) => {
    entry.farmerName = data.farmer_name;
    entry.villageName = data.village_name;
    entry.district = data.district;
    entry.cropName = 'Chili';
    entry.areaThisYear = parseFloat(data.area_this_year);
    entry.cropStage = data.crop_stage;
    entry.cropCondition = data.crop_condition;
    entry.expectedYield = parseFloat(data.expected_yield) || 0;
    entry.buyerInterest = data.buyer_interest;
    entry.problemPest = data.problem_pest || false;
    entry.problemDisease = data.problem_disease || false;
    entry.problemWeather = data.problem_weather || false;
    entry.problemPriceConcern = data.problem_price_concern || false;
    entry.visitDate = new Date().toISOString().split('T')[0];
    entry.latitude = location?.lat || 0;
    entry.longitude = location?.lng || 0;
    entry.isSynced = false;  // will be synced in background
    entry.createdAtLocal = Date.now();
  });
});

// The record is saved. Sync will happen in background.
Alert.alert('Saved!', 'Entry saved. Will sync when online.');
navigation.goBack();
```

---

## 3.9 — Sync Status UI

Show the user how many records are pending sync.

### In ProfileScreen.tsx
```typescript
import { useEffect, useState } from 'react';
import { getPendingCount, syncPendingRecords } from '../sync/syncService';

const ProfileScreen = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const load = async () => setPendingCount(await getPendingCount());
    load();
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    const result = await syncPendingRecords();
    setPendingCount(await getPendingCount());
    setSyncing(false);
    Alert.alert('Sync complete', `${result.synced} records synced, ${result.failed} failed`);
  };

  return (
    // ...
    <View style={styles.syncRow}>
      <Text>Pending sync: {pendingCount}</Text>
      <TouchableOpacity onPress={handleManualSync} disabled={syncing}>
        <Text>{syncing ? 'Syncing...' : 'Sync now'}</Text>
      </TouchableOpacity>
    </View>
    // ...
  );
};
```

---

## 3.10 — Pull-Down: Fetch Reference Data Offline

Villages and Mandis should also be cached locally so dropdowns work offline.

```typescript
// src/sync/seedReferenceData.ts
import database from '../database';
import { getVillages, getMandis } from '../api/crops';

export const seedReferenceData = async () => {
  try {
    const villages = await getVillages();
    await database.write(async () => {
      const collection = database.collections.get('villages');
      const existing = await collection.query().fetchCount();
      if (existing === 0) {
        for (const v of villages) {
          await collection.create((rec: any) => {
            rec.name = v.name;
            rec.taluka = v.taluka;
            rec.district = v.district;
            rec.state = v.state;
            rec.serverId = v.id.toString();
          });
        }
      }
    });
  } catch (e) {
    // Silently fail if offline — reference data was seeded earlier
  }
};
```

Call this on login:
```typescript
// In LoginScreen, after successful login:
await seedReferenceData();
navigation.replace('Main');
```

---

## 3.11 — Phase 3 Checklist

- [ ] WatermelonDB installed and schema defined
- [ ] Crop entry form saves to local DB (works offline)
- [ ] Mandi entry form saves to local DB (works offline)
- [ ] Pending count shows on profile screen
- [ ] Background auto-sync triggers when internet detected
- [ ] Manual "Sync now" button works
- [ ] Villages and mandis cached locally for offline dropdowns
- [ ] Test: fill form → turn off WiFi → submit → turn on WiFi → verify synced to backend
- [ ] Django admin shows records submitted from offline mode

---

## What's Next
**Phase 4** — Photos (camera + upload), geo-tagging on map, and polishing the reports/dashboard with real data.
