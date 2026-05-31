// src/utils/cropMonitoringValidation.ts
// Pure, unit-testable validation functions for each wizard step.
// Returns a map of { fieldName → errorMessage }. Empty map = valid.

import type {
  FarmerDetailsDraft,
  FarmerDetailsErrors,
  CropRecordDraft,
  CropRecordErrors,
  PhotoDraft,
  LocationDraft,
} from '../types/cropMonitoring';

// ─── Step 1 — Farmer Details ──────────────────────────────────────────────────

export const validateStep1 = (
  data: FarmerDetailsDraft,
): FarmerDetailsErrors => {
  const errors: FarmerDetailsErrors = {};

  if (!data.farmer_name.trim()) {
    errors.farmer_name = 'Farmer name is required.';
  } else if (data.farmer_name.trim().length < 2) {
    errors.farmer_name = 'Farmer name must be at least 2 characters.';
  }

  if (!data.mobile_number.trim()) {
    errors.mobile_number = 'Mobile number is required.';
  } else if (!/^\d{10}$/.test(data.mobile_number.trim())) {
    errors.mobile_number = 'Enter a valid 10-digit mobile number.';
  }

  if (!data.village_name.trim()) {
    errors.village_name = 'Village name is required.';
  }

  if (!data.block_name.trim()) {
    errors.block_name = 'Block name is required.';
  }

  if (!data.district_name.trim()) {
    errors.district_name = 'District name is required.';
  }

  const landVal = parseFloat(data.total_land_acre);
  if (!data.total_land_acre.trim()) {
    errors.total_land_acre = 'Total land (acre) is required.';
  } else if (isNaN(landVal) || landVal <= 0) {
    errors.total_land_acre = 'Total land must be greater than 0.';
  }

  return errors;
};

// ─── Step 2 — Per-crop card ───────────────────────────────────────────────────

export const validateCropRecord = (crop: CropRecordDraft): CropRecordErrors => {
  const errors: CropRecordErrors = {};

  if (!crop.crop_name.trim()) {
    errors.crop_name = 'Please select a crop.';
  }

  if (!crop.variety.trim()) {
    errors.variety = 'Please select a variety.';
  }

  if (!crop.date_of_sowing || !crop.date_of_sowing.trim()) {
    errors.date_of_sowing = 'Date of sowing is required.';
  } else {
    // Parse as local noon, not UTC midnight. Without T12:00:00, a YYYY-MM-DD
    // string is treated as UTC, which shifts the date back by 5h30m in IST.
    // Wrapped in try/catch: a malformed string must never crash the validator.
    try {
      const sowing = new Date(crop.date_of_sowing.trim() + 'T12:00:00');
      const today = new Date();
      today.setHours(23, 59, 59, 999); // allow any time today
      if (isNaN(sowing.getTime())) {
        errors.date_of_sowing = 'Invalid date. Please re-select.';
      } else if (sowing > today) {
        errors.date_of_sowing = 'Date of sowing cannot be a future date.';
      }
    } catch (err) {
      console.error('[validateCropRecord] Date parse error:', err);
      errors.date_of_sowing = 'Invalid date. Please re-select.';
    }
  }

  const currentArea = parseFloat(crop.current_area_acre);
  if (!crop.current_area_acre.trim()) {
    errors.current_area_acre = 'Current area is required.';
  } else if (isNaN(currentArea) || currentArea <= 0) {
    errors.current_area_acre = 'Current area must be greater than 0.';
  }

  const thisYearArea = parseFloat(crop.this_year_area_acre);
  if (!crop.this_year_area_acre.trim()) {
    errors.this_year_area_acre = 'This year area is required.';
  } else if (isNaN(thisYearArea) || thisYearArea <= 0) {
    errors.this_year_area_acre = 'This year area must be greater than 0.';
  }

  if (!crop.crop_stage) {
    errors.crop_stage = 'Please select a crop stage.';
  }

  if (!crop.crop_condition) {
    errors.crop_condition = 'Please select a crop condition.';
  }

  if (crop.problems.length === 0) {
    errors.problems = 'Select at least one problem observed.';
  }

  if (crop.problems.includes('other') && !crop.other_problem_detail.trim()) {
    errors.other_problem_detail = 'Please describe the other problem.';
  }

  return errors;
};

/** Validate all crop cards at once. Returns a map of localKey → errors object. */
export const validateStep2 = (
  crops: CropRecordDraft[],
): Map<string, CropRecordErrors> => {
  const allErrors = new Map<string, CropRecordErrors>();
  crops.forEach((crop) => {
    const errs = validateCropRecord(crop);
    if (Object.keys(errs).length > 0) {
      allErrors.set(crop.localKey, errs);
    }
  });
  return allErrors;
};

// ─── Step 3 — Photos, Location, Remark ───────────────────────────────────────

export interface Step3Errors {
  photos?: string;
  location?: string;
  remark?: string;
}

export const validateStep3 = (
  photos: PhotoDraft[],
  location: LocationDraft,
  remark: string,
  minPhotos: number = 2,
): Step3Errors => {
  const errors: Step3Errors = {};

  if (photos.length < minPhotos) {
    errors.photos = `At least ${minPhotos} photos are required.`;
  }

  if (!location.captured || location.latitude === null || location.longitude === null) {
    errors.location = 'GPS location must be captured before submitting.';
  }

  if (remark.length > 500) {
    errors.remark = `Remark must not exceed 500 characters (${remark.length}/500).`;
  }

  return errors;
};

// ─── Utility: is object empty (no errors) ────────────────────────────────────

export const hasErrors = (
  errors: Record<string, string | undefined>,
): boolean => Object.values(errors).some((v) => v !== undefined && v !== '');

export const hasCropErrors = (errors: Map<string, CropRecordErrors>): boolean =>
  errors.size > 0;
