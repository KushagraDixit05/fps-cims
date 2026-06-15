// src/sync/syncService.ts
// Production sync engine for FPS Phase 3.
//
// Responsibility: find all unsynced local records → push to Django API →
// mark as synced with server UUID. Failures are isolated per-record; a failed
// record stores its error and is retried on the next sync cycle.
//
// Four record types are synced:
//   1. farmer_visits    → POST /api/farmer-visits/ (multipart/form-data, with photos)
//   2. crop_entries     → POST /api/crops/ (JSON)
//   3. mandi_arrivals   → POST /api/mandi-arrivals/ (JSON)
//   4. product_demos    → POST /api/product-demos/ (multipart/form-data, with photos)

import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import database from '../database';
import { FarmerVisitModel }  from '../database/models/FarmerVisitModel';
import { CropEntryModel }    from '../database/models/CropEntryModel';
import { MandiArrivalModel } from '../database/models/MandiArrivalModel';
import { ProductDemoModel }  from '../database/models/ProductDemoModel';

import { submitFarmerVisit } from '../api/cropMonitoring';
import { createCropEntry }   from '../api/crops';
import { createMandiArrival } from '../api/mandi';
import { submitProductDemo, completeProductDemoAfter } from '../api/productDemo';

import type { SyncResult, SyncStats } from './syncTypes';
import type { CropEntryPayload, MandiArrivalPayload } from '../types';

const LAST_SYNC_KEY = '@fps_last_sync_ts';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Push all unsynced local records to the Django backend.
 * Safe to call at any time — checks connectivity first.
 * A failed record is marked with its error and left unsynced for the next run.
 */
export const syncPendingRecords = async (): Promise<SyncResult> => {
  const result: SyncResult = { synced: 0, failed: 0, errors: [], timestamp: Date.now(), offline: false };

  const netState = await NetInfo.fetch();
  if (!netState.isConnected || !netState.isInternetReachable) {
    result.offline = true;
    console.log('[Sync] Device offline — skipping sync');
    return result;
  }

  console.log('[Sync] Starting sync run...');
  await syncFarmerVisits(result);
  await syncCropEntries(result);
  await syncMandiArrivals(result);
  await syncProductDemos(result);
  await syncProductDemoAfterUpdates(result);

  console.log('[Sync] Complete:', result);

  // Persist last-sync timestamp regardless of partial failures
  await AsyncStorage.setItem(LAST_SYNC_KEY, String(result.timestamp));

  return result;
};

/**
 * Count total pending (unsynced) records across all four tables.
 * Used by ProfileScreen to display the pending badge.
 */
export const getPendingCount = async (): Promise<SyncStats> => {
  const [pendingVisits, pendingCropEntries, pendingMandiArrivals, pendingProductDemos] = await Promise.all([
    database.collections
      .get<FarmerVisitModel>('farmer_visits')
      .query(Q.where('is_synced', false))
      .fetchCount(),
    database.collections
      .get<CropEntryModel>('crop_entries')
      .query(Q.where('is_synced', false))
      .fetchCount(),
    database.collections
      .get<MandiArrivalModel>('mandi_arrivals')
      .query(Q.where('is_synced', false))
      .fetchCount(),
    database.collections
      .get<ProductDemoModel>('product_demos')
      .query(Q.or(Q.where('is_synced', false), Q.where('after_pending_sync', true)))
      .fetchCount(),
  ]);

  return {
    pendingVisits,
    pendingCropEntries,
    pendingMandiArrivals,
    pendingProductDemos,
    total: pendingVisits + pendingCropEntries + pendingMandiArrivals + pendingProductDemos,
  };
};

/**
 * Returns the Unix timestamp (ms) of the last successful sync,
 * or null if no sync has ever completed.
 */
export const getLastSyncTime = async (): Promise<number | null> => {
  const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
  return raw ? parseInt(raw, 10) : null;
};

// ─── Private sync helpers ─────────────────────────────────────────────────────

/**
 * Sync FarmerVisit records (Crop Monitoring wizard).
 * Reconstructs a multipart FormData identical to the online submission path.
 */
const syncFarmerVisits = async (result: SyncResult): Promise<void> => {
  const unsynced = await database.collections
    .get<FarmerVisitModel>('farmer_visits')
    .query(Q.where('is_synced', false))
    .fetch();

  console.log(`[Sync] farmer_visits pending: ${unsynced.length}`);

  for (const visit of unsynced) {
    try {
      const fd = buildFarmerVisitFormData(visit);
      const response = await submitFarmerVisit(fd);

      await database.write(async () => {
        await visit.update((v) => {
          v.isSynced  = true;
          v.serverId  = response.id;
          v.syncError = null;
          v.updatedAtLocal = Date.now();
        });
      });
      result.synced++;
      console.log(`[Sync] farmer_visit synced: ${visit.farmerName} → server id ${response.id}`);
    } catch (err: any) {
      const msg = buildErrorMessage(err);
      result.failed++;
      result.errors.push(`Visit (${visit.farmerName}): ${msg}`);
      console.warn(`[Sync] farmer_visit failed: ${visit.farmerName}`, msg);

      // Persist the error so the Profile screen can surface it
      try {
        await database.write(async () => {
          await visit.update((v) => {
            v.syncError = msg;
            v.updatedAtLocal = Date.now();
          });
        });
      } catch {
        // Best-effort error persistence
      }
    }
  }
};

/**
 * Build a multipart FormData from a FarmerVisitModel.
 * The structure mirrors buildFormData() in useCropMonitoringForm.ts exactly,
 * so the Django backend sees an identical payload regardless of whether the
 * submission is online (direct) or offline (sync).
 */
const buildFarmerVisitFormData = (visit: FarmerVisitModel): FormData => {
  const fd = new FormData();

  fd.append('farmer_name',     visit.farmerName);
  fd.append('mobile_number',   visit.mobileNumber    ?? '');
  fd.append('village_name',    visit.villageName);
  fd.append('block_name',      visit.blockName);
  fd.append('district_name',   visit.districtName);
  fd.append('total_land_acre', visit.totalLandAcre   ?? '');
  fd.append('remark',          visit.remark          ?? '');
  // Stable client id → backend idempotency (no duplicate on retried sync)
  fd.append('local_id',        visit.id);

  if (visit.latitude  !== null && visit.latitude  !== undefined) {
    fd.append('latitude',  String(visit.latitude));
  }
  if (visit.longitude !== null && visit.longitude !== undefined) {
    fd.append('longitude', String(visit.longitude));
  }

  // Crops: already stored as a valid JSON string
  fd.append('crops', visit.cropsJson);

  // Photos: re-attach each local URI as a file
  if (visit.photosJson) {
    try {
      const photos: { uri: string; name: string; type: string }[] = JSON.parse(visit.photosJson);
      photos.forEach((photo, i) => {
        if (photo.uri) {
          fd.append('photos', {
            uri:  photo.uri,
            name: photo.name || `photo_${i}.jpg`,
            type: photo.type || 'image/jpeg',
          } as any);
        }
      });
    } catch {
      // Malformed photos JSON — skip photos, still sync the visit text data
    }
  }

  return fd;
};

/**
 * Sync legacy CropEntry records.
 */
const syncCropEntries = async (result: SyncResult): Promise<void> => {
  const unsynced = await database.collections
    .get<CropEntryModel>('crop_entries')
    .query(Q.where('is_synced', false))
    .fetch();

  console.log(`[Sync] crop_entries pending: ${unsynced.length}`);

  for (const entry of unsynced) {
    try {
      const payload: CropEntryPayload = {
        farmer:               entry.farmerId,
        visit_date:           entry.visitDate,
        crop_name:            entry.cropName,
        area_this_year:       entry.areaThisYear,
        area_last_year:       entry.areaLastYear ?? undefined,
        sowing_date:          entry.sowingDate   ?? undefined,
        crop_stage:           entry.cropStage    as any,
        crop_condition:       entry.cropCondition as any,
        expected_yield:       entry.expectedYield ?? undefined,
        buyer_interest:       entry.buyerInterest,
        problem_pest:         entry.problemPest,
        problem_disease:      entry.problemDisease,
        problem_weather:      entry.problemWeather,
        problem_price_concern: entry.problemPriceConcern,
        problem_other:        entry.problemOther ?? '',
        latitude:             entry.latitude     ?? undefined,
        longitude:            entry.longitude    ?? undefined,
      };

      const serverRecord = await createCropEntry(payload);

      await database.write(async () => {
        await entry.update((e) => {
          e.isSynced       = true;
          e.serverId       = serverRecord.id;
          e.syncError      = null;
          e.updatedAtLocal = Date.now();
        });
      });
      result.synced++;
      console.log(`[Sync] crop_entry synced: ${entry.cropName}`);
    } catch (err: any) {
      const msg = buildErrorMessage(err);
      result.failed++;
      result.errors.push(`Crop entry (${entry.cropName}): ${msg}`);
      console.warn(`[Sync] crop_entry failed: ${entry.cropName}`, msg);
      try {
        await database.write(async () => {
          await entry.update((e) => {
            e.syncError      = msg;
            e.updatedAtLocal = Date.now();
          });
        });
      } catch { /* best-effort */ }
    }
  }
};

/**
 * Maps stored mandi source values to backend choice keys. Accepts both legacy
 * capitalized labels and current lowercase keys so older unsynced records flush.
 */
const SOURCE_KEY: Record<string, string> = {
  Trader: 'trader',  trader: 'trader',
  Farmer: 'farmer',  farmer: 'farmer',
  'FPS Staff': 'fps_staff', fps_staff: 'fps_staff',
  Mandi: 'mandi',    mandi: 'mandi',
};

/**
 * Sync MandiArrival records.
 */
const syncMandiArrivals = async (result: SyncResult): Promise<void> => {
  const unsynced = await database.collections
    .get<MandiArrivalModel>('mandi_arrivals')
    .query(Q.where('is_synced', false))
    .fetch();

  console.log(`[Sync] mandi_arrivals pending: ${unsynced.length}`);

  for (const arrival of unsynced) {
    try {
      // Normalize source to backend choice keys. Handles both already-stored
      // capitalized labels (older records) and current lowercase values. When a
      // custom source was entered ("Others" path), operations.ts stores the free
      // text in `source` and sets `customSource` → map to 'other'.
      const customSrc = (arrival as any).customSource as string | null;
      const normalizedSource = (customSrc && customSrc.trim())
        ? 'other'
        : (SOURCE_KEY[arrival.source] ?? 'other');

      const payload: MandiArrivalPayload = {
        mandi:            arrival.mandiId,
        commodity:        arrival.commodity,
        date:             arrival.date,
        arrival_quantity: arrival.arrivalQuantity,
        avg_rate:         arrival.avgRate    ?? undefined,
        min_rate:         arrival.minRate    ?? undefined,
        max_rate:         arrival.maxRate    ?? undefined,
        source:           normalizedSource   as any,
        custom_source:    customSrc          ?? '',
        remark:           arrival.remark     ?? '',
        // Stable client id → backend idempotency (no duplicate on retried sync)
        local_id:         arrival.id,
      };

      const serverRecord = await createMandiArrival(payload);

      await database.write(async () => {
        await arrival.update((a) => {
          a.isSynced       = true;
          a.serverId       = serverRecord.id;
          a.syncError      = null;
          a.updatedAtLocal = Date.now();
        });
      });
      result.synced++;
      console.log(`[Sync] mandi_arrival synced: ${arrival.commodity}`);
    } catch (err: any) {
      const msg = buildErrorMessage(err);
      result.failed++;
      result.errors.push(`Mandi arrival (${arrival.commodity}): ${msg}`);
      console.warn(`[Sync] mandi_arrival failed: ${arrival.commodity}`, msg);
      try {
        await database.write(async () => {
          await arrival.update((a) => {
            a.syncError      = msg;
            a.updatedAtLocal = Date.now();
          });
        });
      } catch { /* best-effort */ }
    }
  }
};

/**
 * Sync ProductDemo records (Product Demo wizard).
 * Reconstructs a multipart FormData matching the online submission path.
 */
const syncProductDemos = async (result: SyncResult): Promise<void> => {
  const unsynced = await database.collections
    .get<ProductDemoModel>('product_demos')
    .query(Q.where('is_synced', false))
    .fetch();

  console.log(`[Sync] product_demos pending: ${unsynced.length}`);

  for (const demo of unsynced) {
    try {
      const fd = buildProductDemoFormData(demo);
      const response = await submitProductDemo(fd);

      await database.write(async () => {
        await demo.update((d) => {
          d.isSynced       = true;
          d.serverId       = response.id;
          d.syncError      = null;
          d.updatedAtLocal = Date.now();
        });
      });
      result.synced++;
      console.log(`[Sync] product_demo synced: ${demo.farmerName} → server id ${response.id}`);
    } catch (err: any) {
      const msg = buildErrorMessage(err);
      result.failed++;
      result.errors.push(`Product demo (${demo.farmerName} · ${demo.productName}): ${msg}`);
      console.warn(`[Sync] product_demo failed: ${demo.farmerName}`, msg);

      try {
        await database.write(async () => {
          await demo.update((d) => {
            d.syncError      = msg;
            d.updatedAtLocal = Date.now();
          });
        });
      } catch { /* best-effort */ }
    }
  }
};

/**
 * Build a multipart FormData from a ProductDemoModel.
 */
const buildProductDemoFormData = (demo: ProductDemoModel): FormData => {
  const fd = new FormData();

  // Farmer details
  fd.append('farmer_name',     demo.farmerName);
  fd.append('mobile_number',   demo.mobileNumber  ?? '');
  fd.append('village_name',    demo.villageName);
  fd.append('block_name',      demo.blockName);
  fd.append('district_name',   demo.districtName);
  fd.append('total_land_acre', demo.totalLandAcre ?? '');

  // Crop & stage
  fd.append('crop_name',       demo.cropName);
  fd.append('variety',         demo.variety);
  // Multi-variety: send the full list as JSON (backend keeps `variety` = first)
  fd.append('varieties',       demo.varietiesJson ?? JSON.stringify(demo.variety ? [demo.variety] : []));
  fd.append('crop_stage',      demo.cropStage);
  fd.append('crop_stage_days', demo.cropStageDays);
  fd.append('demo_date',       demo.demoDate);

  // Product & dose
  fd.append('product_name',    demo.productName);
  fd.append('dose',            demo.dose);
  fd.append('dose_unit',       demo.doseUnit);
  // Stable client id → backend idempotency (no duplicate on retried sync)
  fd.append('local_id',        demo.id);

  // Result/observations/remark are NOT sent on the create path — the demo is
  // submitted in the 'before' phase and completed later via complete-after.

  // GPS
  if (demo.latitude  !== null && demo.latitude  !== undefined) {
    fd.append('latitude',  String(demo.latitude));
  }
  if (demo.longitude !== null && demo.longitude !== undefined) {
    fd.append('longitude', String(demo.longitude));
  }

  // Before photos
  if (demo.beforePhotosJson) {
    try {
      const photos: { uri: string; name: string; type: string }[] = JSON.parse(demo.beforePhotosJson);
      photos.forEach((photo, i) => {
        if (photo.uri) {
          fd.append('photos_before', {
            uri:  photo.uri,
            name: photo.name || `before_${i}.jpg`,
            type: photo.type || 'image/jpeg',
          } as any);
        }
      });
    } catch { /* malformed — skip photos */ }
  }

  return fd;
};

/**
 * Sync deferred 'After' updates for Product Demos.
 * Picks records that already synced their create (have server_id) and have
 * after-data queued (after_pending_sync), then POSTs to complete-after.
 */
const syncProductDemoAfterUpdates = async (result: SyncResult): Promise<void> => {
  const pending = await database.collections
    .get<ProductDemoModel>('product_demos')
    .query(Q.and(Q.where('after_pending_sync', true), Q.where('server_id', Q.notEq(null))))
    .fetch();

  console.log(`[Sync] product_demo after-updates pending: ${pending.length}`);

  for (const demo of pending) {
    try {
      const afterPhotos: { uri: string; name: string; type: string }[] = demo.afterPhotosJson
        ? JSON.parse(demo.afterPhotosJson)
        : [];

      await completeProductDemoAfter(demo.serverId as string, {
        demo_result:             demo.demoResult ?? '',
        additional_observations: demo.additionalObservations ?? '',
        remark:                  demo.remark ?? '',
        after_photos:            afterPhotos.map((p, i) => ({
          uri:  p.uri,
          name: p.name || `after_${i}.jpg`,
          type: p.type || 'image/jpeg',
        })),
      });

      await database.write(async () => {
        await demo.update((d) => {
          d.afterPendingSync = false;
          d.demoPhase        = 'completed';
          d.afterSyncError   = null;
          d.updatedAtLocal   = Date.now();
        });
      });
      result.synced++;
      console.log(`[Sync] product_demo after-update synced: ${demo.farmerName}`);
    } catch (err: any) {
      const msg = buildErrorMessage(err);
      result.failed++;
      result.errors.push(`Product demo after-update (${demo.farmerName}): ${msg}`);
      console.warn(`[Sync] product_demo after-update failed: ${demo.farmerName}`, msg);

      try {
        await database.write(async () => {
          await demo.update((d) => {
            d.afterSyncError = msg;
            d.updatedAtLocal = Date.now();
          });
        });
      } catch { /* best-effort */ }
    }
  }
};

// ─── Utility ──────────────────────────────────────────────────────────────────

const buildErrorMessage = (err: any): string => {
  if (err?.response?.data) {
    try {
      return JSON.stringify(err.response.data);
    } catch {
      return 'API error';
    }
  }
  return err?.message ?? 'Unknown error';
};
