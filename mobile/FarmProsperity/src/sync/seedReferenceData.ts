// src/sync/seedReferenceData.ts
// Seeds reference data (districts, blocks, crop master, mandis) into the
// local WatermelonDB on login and when the app comes back online.
//
// Strategy:
//   - Check if data exists locally first.
//   - If not, fetch from API and insert.
//   - If data already exists, refresh only when more than 24 hours old
//     (checked via AsyncStorage timestamp).
//   - Always silently fails on network errors — local cache remains usable.
//
// Called from:
//   - LoginScreen (after successful login)
//   - AppNavigator (on reconnect, throttled to 24 h via LAST_SEED_KEY)

import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';

import database from '../database';
import { DistrictModel }   from '../database/models/DistrictModel';
import { BlockModel }      from '../database/models/BlockModel';
import { CropMasterModel } from '../database/models/CropMasterModel';
import { MandiModel }      from '../database/models/MandiModel';

import { getDistricts, getBlocks, getCropMaster } from '../api/cropMonitoring';
import { getMandis } from '../api/mandi';

const LAST_SEED_KEY = '@fps_last_seed_ts';
const SEED_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Seeds all reference data into WatermelonDB.
 *
 * Call fire-and-forget on login:
 *   `seedReferenceData().catch(() => {});`
 *
 * Pass `force = true` to bypass the 24-hour throttle (e.g. pull-to-refresh).
 */
export const seedReferenceData = async (force: boolean = false): Promise<void> => {
  try {
    const now = Date.now();

    if (!force) {
      const lastSeedRaw = await AsyncStorage.getItem(LAST_SEED_KEY);
      if (lastSeedRaw) {
        const lastSeed = parseInt(lastSeedRaw, 10);
        if (now - lastSeed < SEED_INTERVAL_MS) {
          return; // Data is fresh — skip
        }
      }
    }

    // Seed in parallel — each is independently fault-tolerant
    await Promise.allSettled([
      seedDistricts(),
      seedCropMaster(),
      seedMandis(),
      // Blocks depend on districts being available from API, not local DB,
      // so they can also run in parallel with the district seed.
      seedBlocks(),
    ]);

    await AsyncStorage.setItem(LAST_SEED_KEY, String(now));
  } catch (err: any) {
    // Outer catch: silently fail — the app can still work with stale / empty local data
    console.warn('[FPS Seed] seedReferenceData failed:', err?.message);
  }
};

// ─── Per-table seeders ────────────────────────────────────────────────────────

const seedDistricts = async (): Promise<void> => {
  try {
    const apiDistricts = await getDistricts();
    const collection = database.collections.get<DistrictModel>('districts');

    await database.write(async () => {
      for (const d of apiDistricts) {
        // Upsert: check if already exists by server_id
        const existing = await collection
          .query(Q.where('server_id', d.id))
          .fetch();

        if (existing.length === 0) {
          await collection.create((rec) => {
            rec.serverId = d.id;
            rec.name     = d.name;
            rec.state    = d.state ?? null;
          });
        } else {
          // Update in case name changed on the server
          await existing[0].update((rec) => {
            rec.name  = d.name;
            rec.state = d.state ?? null;
          });
        }
      }
    });
  } catch (err: any) {
    console.warn('[FPS Seed] Districts seed failed:', err?.message);
  }
};

const seedBlocks = async (): Promise<void> => {
  try {
    // Fetch all blocks (no district filter = full list)
    const apiBlocks = await getBlocks();
    const collection = database.collections.get<BlockModel>('blocks');

    await database.write(async () => {
      for (const b of apiBlocks) {
        const existing = await collection
          .query(Q.where('server_id', b.id))
          .fetch();

        if (existing.length === 0) {
          await collection.create((rec) => {
            rec.serverId         = b.id;
            rec.name             = b.name;
            rec.districtServerId = b.district;
            rec.districtName     = b.district_name ?? null;
          });
        } else {
          await existing[0].update((rec) => {
            rec.name         = b.name;
            rec.districtName = b.district_name ?? null;
          });
        }
      }
    });
  } catch (err: any) {
    console.warn('[FPS Seed] Blocks seed failed:', err?.message);
  }
};

const seedCropMaster = async (): Promise<void> => {
  try {
    const apiCrops = await getCropMaster();
    const collection = database.collections.get<CropMasterModel>('crop_master');

    await database.write(async () => {
      for (const c of apiCrops) {
        const existing = await collection
          .query(Q.where('server_id', c.id))
          .fetch();

        const varietiesJson = JSON.stringify(c.varieties ?? []);

        if (existing.length === 0) {
          await collection.create((rec) => {
            rec.serverId      = c.id;
            rec.cropName      = c.crop_name;
            rec.varietiesJson = varietiesJson;
          });
        } else {
          await existing[0].update((rec) => {
            rec.cropName      = c.crop_name;
            rec.varietiesJson = varietiesJson;
          });
        }
      }
    });
  } catch (err: any) {
    console.warn('[FPS Seed] CropMaster seed failed:', err?.message);
  }
};

const seedMandis = async (): Promise<void> => {
  try {
    const apiMandis = await getMandis();
    const collection = database.collections.get<MandiModel>('mandis');

    await database.write(async () => {
      for (const m of apiMandis) {
        const existing = await collection
          .query(Q.where('server_id', m.id))
          .fetch();

        if (existing.length === 0) {
          await collection.create((rec) => {
            rec.serverId = m.id;
            rec.name     = m.name;
            rec.district = m.district ?? null;
            rec.state    = m.state    ?? null;
            rec.isActive = m.is_active;
          });
        } else {
          await existing[0].update((rec) => {
            rec.name     = m.name;
            rec.district = m.district ?? null;
            rec.state    = m.state    ?? null;
            rec.isActive = m.is_active;
          });
        }
      }
    });
  } catch (err: any) {
    console.warn('[FPS Seed] Mandis seed failed:', err?.message);
  }
};
