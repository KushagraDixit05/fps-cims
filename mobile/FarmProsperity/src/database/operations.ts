// src/database/operations.ts
// High-level local write helpers for all three form types.
// These are the only functions that form screens call — they hide
// all WatermelonDB API details from the UI layer.

import database from './index';
import type { CropMonitoringFormState, CropRecordDraft, PhotoDraft } from '../types/cropMonitoring';
import type { CropEntryPayload, MandiArrivalPayload } from '../types';
import type { MandiArrivalFormState, CropVarietyDraft, MandiArrivalSaveResult } from '../types/mandiArrival';
import type { ProductDemoFormState, ProductDemoSaveResult } from '../types/productDemo';
import { CropEntryModel }    from './models/CropEntryModel';
import { MandiArrivalModel } from './models/MandiArrivalModel';
import { FarmerVisitModel }  from './models/FarmerVisitModel';
import { ProductDemoModel }  from './models/ProductDemoModel';
import { OTHERS_VALUE }      from '../components/SmartDropdown';

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

  // Build the crops JSON string — same shape as cropsPayload in buildFormData().
  // Resolve varieties array; also send first variety in legacy `variety` field.
  const resolveVariety = (v: { variety: string; custom_variety: string }): string =>
    v.variety === 'Others' ? (v.custom_variety.trim() || 'Others') : v.variety;

  const cropsPayload = crops.map((c: CropRecordDraft, i: number) => {
    const resolvedVarieties = (c.varieties ?? []).map(resolveVariety).filter(Boolean);
    return {
      crop_name:            c.crop_name,
      variety:              resolvedVarieties[0] ?? '',
      date_of_sowing:       c.date_of_sowing,
      current_area_acre:    c.current_area_acre,
      last_year_area_acre:  c.last_year_area_acre || null,
      crop_stage:           c.crop_stage,
      crop_condition:       c.crop_condition,
      problems:             c.problems,
      other_problem_detail: c.other_problem_detail,
      sort_order:           i,
    };
  });

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
        // Resolve Others sentinel: store custom text as village_name
        v.villageName    = farmerDetails.village_name === OTHERS_VALUE
          ? (farmerDetails.custom_village_name?.trim() || 'Custom')
          : farmerDetails.village_name.trim();
        (v as any).villageId = farmerDetails.village_name === OTHERS_VALUE
          ? null
          : (farmerDetails.village_id ?? null);
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

// ─── Mandi Arrival Wizard (new 5-step form) ────────────────────────────────────

/**
 * Save a complete Mandi Arrival wizard submission to WatermelonDB.
 * Called from useMandiArrivalForm.ts submit().
 * Returns a synthetic success object used by MandiArrivalFormScreen.tsx.
 *
 * Uses varieties_json / photos_json / latitude / longitude (schema v2).
 * The legacy commodity / arrival_quantity / avg_rate fields are set to
 * defaults so the row is schema-valid for backward-compat sync code.
 */
export const saveMandiArrivalWizardLocally = async (
  state: MandiArrivalFormState,
): Promise<MandiArrivalSaveResult> => {
  const { mandiDetails, varieties, photos, location, source, remark } = state;
  const now = Date.now();

  // Build varieties JSON payload
  const varietiesPayload = varieties.map((v: CropVarietyDraft, i: number) => ({
    crop_variety_name: v.crop_variety_name.trim(),
    quantity_qt:       parseFloat(v.quantity_qt) || 0,
    top_rate:          parseFloat(v.top_rate) || 0,
    mostly_sales_rate: parseFloat(v.mostly_sales_rate) || 0,
    bottom_rate:       parseFloat(v.bottom_rate) || 0,
    sort_order:        i,
  }));

  const photosPayload = photos.map((p: PhotoDraft) => ({
    uri:  p.uri,
    name: p.name,
    type: p.type,
  }));

  // First variety name used for legacy commodity column (required by schema)
  const legacyCommodity = varieties[0]?.crop_variety_name.trim() || 'Unknown';

  let localId = '';

  const isOthersMandi = mandiDetails.mandi_id === 'others';
  const resolvedMandiName = isOthersMandi
    ? (mandiDetails.custom_mandi_name?.trim() || 'Others')
    : (mandiDetails.mandi_name || null);

  await database.write(async () => {
    const record = await database.collections
      .get<MandiArrivalModel>('mandi_arrivals')
      .create((a) => {
        a.mandiId          = isOthersMandi ? 0 : Number(mandiDetails.mandi_id);
        a.mandiName        = resolvedMandiName;
        (a as any).mandiCustomName = isOthersMandi
          ? (mandiDetails.custom_mandi_name?.trim() || null)
          : null;
        // Legacy columns — filled with first variety values for backward compat
        a.commodity        = legacyCommodity;
        a.date             = mandiDetails.date;
        a.arrivalQuantity  = parseFloat(mandiDetails.total_arrival_qt) || 0;
        a.avgRate          = null;
        a.minRate          = null;
        a.maxRate          = null;
        a.source           = source;
        a.remark           = remark.trim() || null;
        // New v2 wizard columns
        (a as any).varietiesJson   = JSON.stringify(varietiesPayload);
        (a as any).photosJson      = photosPayload.length > 0 ? JSON.stringify(photosPayload) : null;
        (a as any).totalArrivalQt  = parseFloat(mandiDetails.total_arrival_qt) || null;
        (a as any).latitude        = location.latitude;
        (a as any).longitude       = location.longitude;
        // Sync tracking
        a.isSynced         = false;
        a.serverId         = null;
        a.syncError        = null;
        a.createdAtLocal   = now;
        a.updatedAtLocal   = now;
      });
    localId = record.id;
  });

  return {
    id:            localId,
    mandi_name:    resolvedMandiName || `Mandi #${mandiDetails.mandi_id}`,
    variety_count: varieties.length,
  };
};

// ─── Product Demo Wizard ──────────────────────────────────────────────────────

/**
 * Save a complete Product Demo wizard submission to WatermelonDB.
 * Returns a synthetic success object used by ProductDemoFormScreen.tsx.
 */
export const saveProductDemoLocally = async (
  state: ProductDemoFormState,
): Promise<ProductDemoSaveResult> => {
  const { farmerDetails, cropStage, productDose, result, location } = state;
  const now = Date.now();

  const beforePhotosPayload = result.before_photos.map((p: PhotoDraft) => ({
    uri: p.uri, name: p.name, type: p.type,
  }));
  const afterPhotosPayload = result.after_photos.map((p: PhotoDraft) => ({
    uri: p.uri, name: p.name, type: p.type,
  }));

  let localId = '';

  await database.write(async () => {
    const record = await database.collections
      .get<ProductDemoModel>('product_demos')
      .create((d) => {
        // Step 1
        d.farmerName     = farmerDetails.farmer_name.trim();
        d.mobileNumber   = farmerDetails.mobile_number.trim() || null;
        // Resolve Others sentinel: store custom text as village_name
        d.villageName    = farmerDetails.village_name === OTHERS_VALUE
          ? (farmerDetails.custom_village_name?.trim() || 'Custom')
          : farmerDetails.village_name.trim();
        (d as any).villageId = farmerDetails.village_name === OTHERS_VALUE
          ? null
          : (farmerDetails.village_id ?? null);
        d.blockName      = farmerDetails.block_name.trim();
        d.districtName   = farmerDetails.district_name.trim();
        d.totalLandAcre  = farmerDetails.total_land_acre.trim() || null;
        // Step 2
        d.cropName       = cropStage.crop_name.trim();
        // Resolve Others variety sentinel
        d.variety        = cropStage.variety === OTHERS_VALUE
          ? (cropStage.custom_variety.trim() || 'Others')
          : cropStage.variety.trim();
        d.cropStage      = cropStage.crop_stage as string;
        d.cropStageDays  = cropStage.crop_stage_days.trim();
        d.demoDate       = cropStage.demo_date.trim();
        // Step 3
        d.productName    = productDose.product_name.trim();
        d.dose           = productDose.dose.trim();
        d.doseUnit       = productDose.dose_unit as string;
        // Step 4
        d.demoResult     = result.demo_result as string;
        d.additionalObservations = result.additional_observations.trim() || null;
        d.remark         = result.remark.trim() || null;
        d.beforePhotosJson = beforePhotosPayload.length > 0
          ? JSON.stringify(beforePhotosPayload)
          : null;
        d.afterPhotosJson  = afterPhotosPayload.length > 0
          ? JSON.stringify(afterPhotosPayload)
          : null;
        // GPS
        d.latitude       = location.latitude;
        d.longitude      = location.longitude;
        // Sync tracking
        d.isSynced       = false;
        d.serverId       = null;
        d.syncError      = null;
        d.createdAtLocal = now;
        d.updatedAtLocal = now;
      });
    localId = record.id;
  });

  return {
    id:           localId,
    farmer_name:  farmerDetails.farmer_name.trim(),
    product_name: productDose.product_name.trim(),
  };
};
