// src/sync/syncService.ts
// Production sync engine for FPS Phase 3.
//
// Responsibility: find all unsynced local records → push to Django API →
// mark as synced with server UUID. Failures are isolated per-record; a failed
// record stores its error and is retried on the next sync cycle.
//
// Three record types are synced:
//   1. farmer_visits    → POST /api/farmer-visits/ (multipart/form-data, with photos)
//   2. crop_entries     → POST /api/crops/ (JSON)
//   3. mandi_arrivals   → POST /api/mandi-arrivals/ (JSON)

import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import database from '../database';
import { FarmerVisitModel }  from '../database/models/FarmerVisitModel';
import { CropEntryModel }    from '../database/models/CropEntryModel';
import { MandiArrivalModel } from '../database/models/MandiArrivalModel';

import { submitFarmerVisit } from '../api/cropMonitoring';
import { createCropEntry }   from '../api/crops';
import { createMandiArrival } from '../api/mandi';

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
    return result;
  }

  await syncFarmerVisits(result);
  await syncCropEntries(result);
  await syncMandiArrivals(result);

  // Persist last-sync timestamp regardless of partial failures
  await AsyncStorage.setItem(LAST_SYNC_KEY, String(result.timestamp));

  return result;
};

/**
 * Count total pending (unsynced) records across all three tables.
 * Used by ProfileScreen to display the pending badge.
 */
export const getPendingCount = async (): Promise<SyncStats> => {
  const [pendingVisits, pendingCropEntries, pendingMandiArrivals] = await Promise.all([
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
  ]);

  return {
    pendingVisits,
    pendingCropEntries,
    pendingMandiArrivals,
    total: pendingVisits + pendingCropEntries + pendingMandiArrivals,
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
    } catch (err: any) {
      const msg = buildErrorMessage(err);
      result.failed++;
      result.errors.push(`Visit (${visit.farmerName}): ${msg}`);

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
    } catch (err: any) {
      const msg = buildErrorMessage(err);
      result.failed++;
      result.errors.push(`Crop entry (${entry.cropName}): ${msg}`);
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
 * Sync MandiArrival records.
 */
const syncMandiArrivals = async (result: SyncResult): Promise<void> => {
  const unsynced = await database.collections
    .get<MandiArrivalModel>('mandi_arrivals')
    .query(Q.where('is_synced', false))
    .fetch();

  for (const arrival of unsynced) {
    try {
      const payload: MandiArrivalPayload = {
        mandi:            arrival.mandiId,
        commodity:        arrival.commodity,
        date:             arrival.date,
        arrival_quantity: arrival.arrivalQuantity,
        avg_rate:         arrival.avgRate    ?? undefined,
        min_rate:         arrival.minRate    ?? undefined,
        max_rate:         arrival.maxRate    ?? undefined,
        source:           arrival.source     as any,
        remark:           arrival.remark     ?? '',
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
    } catch (err: any) {
      const msg = buildErrorMessage(err);
      result.failed++;
      result.errors.push(`Mandi arrival (${arrival.commodity}): ${msg}`);
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
