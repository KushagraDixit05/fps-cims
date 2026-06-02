// src/database/operations.ts
// High-level local write helpers for all three form types.
// These are the only functions that form screens call — they hide
// all WatermelonDB API details from the UI layer.

import database from './index';
import type { CropMonitoringFormState, CropRecordDraft, PhotoDraft } from '../types/cropMonitoring';
import type { CropEntryPayload, MandiArrivalPayload } from '../types';
import { CropEntryModel }    from './models/CropEntryModel';
import { MandiArrivalModel } from './models/MandiArrivalModel';
import { FarmerVisitModel }  from './models/FarmerVisitModel';

// ─── Crop Monitoring Wizard ───────────────────────────────────────────────────

/**
 * Save a complete Crop Monitoring wizard submission to WatermelonDB.
 * Returns a synthetic success object in the same shape as the server's 201
 * response — so CropMonitoringFormScreen.tsx needs zero changes.
 *
 * Crops are serialized as a JSON string matching the FormData payload
 * that buildFormData() in useCropMonitoringForm.ts would produce.
 * The sync service will reconstruct multipart/form-data from this JSON.
 */
export const saveVisitLocally = async (
  state: CropMonitoringFormState,
): Promise<{ id: string; farmer_name: string; crop_count: number }> => {
  const { farmerDetails, crops, photos, location, remark } = state;
  const now = Date.now();

  // Build the crops JSON string — same shape as cropsPayload in buildFormData()
  const cropsPayload = crops.map((c: CropRecordDraft, i: number) => ({
    crop_name:            c.crop_name,
    variety:              c.variety,
    date_of_sowing:       c.date_of_sowing,
    current_area_acre:    c.current_area_acre,
    last_year_area_acre:  c.last_year_area_acre || null,
    this_year_area_acre:  c.this_year_area_acre,
    crop_stage:           c.crop_stage,
    crop_condition:       c.crop_condition,
    problems:             c.problems,
    other_problem_detail: c.other_problem_detail,
    sort_order:           i,
  }));

  const photosPayload = photos.map((p: PhotoDraft) => ({
    uri:  p.uri,
    name: p.name,
    type: p.type,
  }));

  let localId = '';

  await database.write(async () => {
    const record = await database.collections
      .get<FarmerVisitModel>('farmer_visits')
      .create((v) => {
        v.farmerName     = farmerDetails.farmer_name.trim();
        v.mobileNumber   = farmerDetails.mobile_number.trim() || null;
        v.villageName    = farmerDetails.village_name.trim();
        v.blockName      = farmerDetails.block_name.trim();
        v.districtName   = farmerDetails.district_name.trim();
        v.totalLandAcre  = farmerDetails.total_land_acre.trim() || null;
        v.latitude       = location.latitude;
        v.longitude      = location.longitude;
        v.remark         = remark.trim() || null;
        v.cropsJson      = JSON.stringify(cropsPayload);
        v.photosJson     = photosPayload.length > 0
          ? JSON.stringify(photosPayload)
          : null;
        v.isSynced       = false;
        v.serverId       = null;
        v.syncError      = null;
        v.createdAtLocal = now;
        v.updatedAtLocal = now;
      });
    localId = record.id;
  });

  return {
    id:           localId,
    farmer_name:  farmerDetails.farmer_name.trim(),
    crop_count:   crops.length,
  };
};

// ─── Legacy Crop Entry ────────────────────────────────────────────────────────

/**
 * Save a legacy CropEntry form submission to WatermelonDB.
 * Called from CropEntryFormScreen.tsx onSubmit().
 */
export const saveCropEntryLocally = async (
  payload: CropEntryPayload & { farmer_name_display?: string },
): Promise<void> => {
  const now = Date.now();

  await database.write(async () => {
    await database.collections
      .get<CropEntryModel>('crop_entries')
      .create((e) => {
        e.farmerId            = Number(payload.farmer);
        e.farmerNameDisplay   = payload.farmer_name_display ?? null;
        e.visitDate           = payload.visit_date;
        e.cropName            = payload.crop_name;
        e.areaThisYear        = payload.area_this_year;
        e.areaLastYear        = payload.area_last_year         ?? null;
        e.sowingDate          = payload.sowing_date            ?? null;
        e.cropStage           = payload.crop_stage;
        e.cropCondition       = payload.crop_condition;
        e.expectedYield       = payload.expected_yield         ?? null;
        e.buyerInterest       = payload.buyer_interest         ?? false;
        e.problemPest         = payload.problem_pest;
        e.problemDisease      = payload.problem_disease;
        e.problemWeather      = payload.problem_weather;
        e.problemPriceConcern = payload.problem_price_concern;
        e.problemOther        = payload.problem_other          ?? null;
        e.latitude            = payload.latitude               ?? null;
        e.longitude           = payload.longitude              ?? null;
        e.isSynced            = false;
        e.serverId            = null;
        e.syncError           = null;
        e.createdAtLocal      = now;
        e.updatedAtLocal      = now;
      });
  });
};

// ─── Mandi Arrival ────────────────────────────────────────────────────────────

/**
 * Save a MandiArrival form submission to WatermelonDB.
 * Called from MandiEntryFormScreen.tsx onSubmit().
 * mandiName is passed separately because the payload only carries mandi integer ID.
 */
export const saveMandiArrivalLocally = async (
  payload: MandiArrivalPayload,
  mandiName?: string,
): Promise<void> => {
  const now = Date.now();

  await database.write(async () => {
    await database.collections
      .get<MandiArrivalModel>('mandi_arrivals')
      .create((a) => {
        a.mandiId          = Number(payload.mandi);
        a.mandiName        = mandiName ?? null;
        a.commodity        = payload.commodity;
        a.date             = payload.date;
        a.arrivalQuantity  = payload.arrival_quantity;
        a.avgRate          = payload.avg_rate   ?? null;
        a.minRate          = payload.min_rate   ?? null;
        a.maxRate          = payload.max_rate   ?? null;
        a.source           = payload.source;
        a.remark           = payload.remark     ?? null;
        a.isSynced         = false;
        a.serverId         = null;
        a.syncError        = null;
        a.createdAtLocal   = now;
        a.updatedAtLocal   = now;
      });
  });
};
