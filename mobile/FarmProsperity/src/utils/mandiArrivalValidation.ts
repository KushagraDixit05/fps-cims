// src/utils/mandiArrivalValidation.ts
// Per-step validation for the Mandi Arrival wizard.
// Mirrors the pattern of cropMonitoringValidation.ts.

import type {
  MandiDetailsDraft,
  MandiDetailsErrors,
  CropVarietyDraft,
  CropVarietyErrors,
} from '../types/mandiArrival';
import type { PhotoDraft, LocationDraft } from '../types/cropMonitoring';

// ─── Step 1: Mandi Details ────────────────────────────────────────────────────

export const validateStep1 = (data: MandiDetailsDraft): MandiDetailsErrors => {
  const errors: MandiDetailsErrors = {};

  if (!data.mandi_id) {
    errors.mandi_id = 'Please select a mandi.';
  }

  if (!data.date) {
    errors.date = 'Date is required.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.date = 'Date must be in YYYY-MM-DD format.';
  }

  if (!data.total_arrival_qt) {
    errors.total_arrival_qt = 'Total arrival quantity is required.';
  } else if (isNaN(parseFloat(data.total_arrival_qt)) || parseFloat(data.total_arrival_qt) <= 0) {
    errors.total_arrival_qt = 'Enter a valid positive quantity.';
  }

  return errors;
};

export const hasMandiDetailsErrors = (errors: MandiDetailsErrors): boolean =>
  Object.values(errors).some(Boolean);

// ─── Step 2: Crop Varieties ───────────────────────────────────────────────────

const validateVariety = (v: CropVarietyDraft): CropVarietyErrors => {
  const errors: CropVarietyErrors = {};

  if (!v.crop_variety_name.trim()) {
    errors.crop_variety_name = 'Crop variety name is required.';
  }

  if (!v.quantity_qt) {
    errors.quantity_qt = 'Quantity is required.';
  } else if (isNaN(parseFloat(v.quantity_qt)) || parseFloat(v.quantity_qt) <= 0) {
    errors.quantity_qt = 'Enter a valid positive quantity.';
  }

  if (!v.top_rate) {
    errors.top_rate = 'Required.';
  } else if (isNaN(parseFloat(v.top_rate)) || parseFloat(v.top_rate) <= 0) {
    errors.top_rate = 'Enter a valid rate.';
  }

  if (!v.mostly_sales_rate) {
    errors.mostly_sales_rate = 'Required.';
  } else if (isNaN(parseFloat(v.mostly_sales_rate)) || parseFloat(v.mostly_sales_rate) <= 0) {
    errors.mostly_sales_rate = 'Enter a valid rate.';
  }

  if (!v.bottom_rate) {
    errors.bottom_rate = 'Required.';
  } else if (isNaN(parseFloat(v.bottom_rate)) || parseFloat(v.bottom_rate) <= 0) {
    errors.bottom_rate = 'Enter a valid rate.';
  }

  return errors;
};

export const validateStep2 = (varieties: CropVarietyDraft[]): Map<string, CropVarietyErrors> => {
  const map = new Map<string, CropVarietyErrors>();
  varieties.forEach((v) => {
    const errs = validateVariety(v);
    if (Object.values(errs).some(Boolean)) {
      map.set(v.localKey, errs);
    }
  });
  return map;
};

export const hasVarietyErrors = (errMap: Map<string, CropVarietyErrors>): boolean =>
  errMap.size > 0;

// ─── Step 3: Source & Remark ──────────────────────────────────────────────────

export interface Step3Errors {
  source?: string;
  remark?: string;
}

export const validateStep3 = (source: string, remark: string): Step3Errors => {
  const errors: Step3Errors = {};

  if (!source) {
    errors.source = 'Please select a source of information.';
  }

  if (remark.length > 300) {
    errors.remark = 'Remark must be 300 characters or fewer.';
  }

  return errors;
};

// ─── Step 4: Photos ───────────────────────────────────────────────────────────

export interface Step4Errors {
  photos?: string;
}

export const validateStep4 = (photos: PhotoDraft[]): Step4Errors => {
  const errors: Step4Errors = {};

  if (photos.length < 2) {
    errors.photos = `At least 2 photos are required (${photos.length} added).`;
  }

  return errors;
};

// ─── Step 5: Location ─────────────────────────────────────────────────────────

export interface Step5Errors {
  location?: string;
}

export const validateStep5 = (location: LocationDraft): Step5Errors => {
  const errors: Step5Errors = {};

  if (!location.captured || location.latitude === null || location.longitude === null) {
    errors.location = 'Please capture your GPS location before continuing.';
  }

  return errors;
};
