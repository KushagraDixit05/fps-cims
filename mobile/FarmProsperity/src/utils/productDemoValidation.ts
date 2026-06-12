// src/utils/productDemoValidation.ts
// Pure, unit-testable validation functions for each Product Demo wizard step.
// Returns a map of { fieldName → errorMessage }. Empty map = valid.

import type {
  DemoFarmerDetailsDraft,
  DemoFarmerDetailsErrors,
  CropStageDraft,
  CropStageErrors,
  ProductDoseDraft,
  ProductDoseErrors,
  DemoResultDraft,
  Step4Errors,
  PhotoDraft,
} from '../types/productDemo';
import { OTHERS_VALUE } from '../components/SmartDropdown';

// ─── Step 1 — Farmer Details ──────────────────────────────────────────────────

export const validateStep1 = (
  data: DemoFarmerDetailsDraft,
): DemoFarmerDetailsErrors => {
  const errors: DemoFarmerDetailsErrors = {};

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

  if (!data.district_name.trim()) {
    errors.district_name = 'District is required.';
  }

  if (!data.block_name.trim()) {
    errors.block_name = 'Block is required.';
  }

  // Village: require either a master selection (village_id) or a custom entry (Others path)
  if (data.village_name === OTHERS_VALUE || !data.village_id) {
    if (data.village_name === OTHERS_VALUE) {
      if (!data.custom_village_name || data.custom_village_name.trim().length < 2) {
        errors.custom_village_name = 'Please enter the village name (at least 2 characters).';
      }
    } else {
      errors.village_name = 'Please select a village from the list.';
    }
  }

  const landVal = parseFloat(data.total_land_acre);
  if (!data.total_land_acre.trim()) {
    errors.total_land_acre = 'Total land (acre) is required.';
  } else if (isNaN(landVal) || landVal <= 0) {
    errors.total_land_acre = 'Total land must be greater than 0.';
  }

  return errors;
};

// ─── Step 2 — Crop & Stage Details ───────────────────────────────────────────

export const validateStep2 = (data: CropStageDraft): CropStageErrors => {
  const errors: CropStageErrors = {};

  if (!data.crop_name.trim()) {
    errors.crop_name = 'Please select a crop.';
  }

  // Varieties — at least one, each resolved, no duplicates.
  if (!data.varieties || data.varieties.length === 0) {
    errors.varieties = 'Please add at least one variety.';
  } else {
    const varietyErrors: string[] = [];
    const seen = new Set<string>();
    let hasVarietyError = false;

    data.varieties.forEach((v, i) => {
      let msg = '';
      let resolved = '';
      if (!v.variety.trim()) {
        msg = 'Please select a variety.';
      } else if (v.variety === OTHERS_VALUE) {
        if (!v.custom_variety || v.custom_variety.trim().length < 2) {
          msg = 'Please enter the variety name (at least 2 characters).';
        } else {
          resolved = v.custom_variety.trim().toLowerCase();
        }
      } else {
        resolved = v.variety.trim().toLowerCase();
      }

      if (!msg && resolved) {
        if (seen.has(resolved)) {
          msg = 'Duplicate variety — please remove it.';
        } else {
          seen.add(resolved);
        }
      }

      varietyErrors[i] = msg;
      if (msg) hasVarietyError = true;
    });

    if (hasVarietyError) errors.varietyErrors = varietyErrors;
  }

  if (!data.crop_stage) {
    errors.crop_stage = 'Please select a crop stage.';
  }

  const days = parseInt(data.crop_stage_days, 10);
  if (!data.crop_stage_days.trim()) {
    errors.crop_stage_days = 'Crop stage (in days) is required.';
  } else if (isNaN(days) || days <= 0) {
    errors.crop_stage_days = 'Enter a valid number of days.';
  }

  if (!data.demo_date || !data.demo_date.trim()) {
    errors.demo_date = 'Demo date is required.';
  } else {
    try {
      const demo = new Date(data.demo_date.trim() + 'T12:00:00');
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (isNaN(demo.getTime())) {
        errors.demo_date = 'Invalid date. Please re-select.';
      } else if (demo > today) {
        errors.demo_date = 'Demo date cannot be a future date.';
      }
    } catch {
      errors.demo_date = 'Invalid date. Please re-select.';
    }
  }

  return errors;
};

// ─── Step 3 — Product & Dose Details ─────────────────────────────────────────

export const validateStep3 = (data: ProductDoseDraft): ProductDoseErrors => {
  const errors: ProductDoseErrors = {};

  if (!data.product_name.trim()) {
    errors.product_name = 'Please select a product.';
  }

  const dose = parseFloat(data.dose);
  if (!data.dose.trim()) {
    errors.dose = 'Dose is required.';
  } else if (isNaN(dose) || dose <= 0) {
    errors.dose = 'Dose must be greater than 0.';
  }

  if (!data.dose_unit) {
    errors.dose_unit = 'Please select a dose unit.';
  }

  return errors;
};

// ─── Step 4 — Photos, Result & Remark ────────────────────────────────────────

// Step 4 of the create wizard now captures BEFORE-demo photos only.
export const validateStep4 = (
  data: DemoResultDraft,
  minPhotos: number = 2,
): Step4Errors => {
  const errors: Step4Errors = {};

  if (data.before_photos.length < minPhotos) {
    errors.before_photos = `At least ${minPhotos} before-demo photos are required.`;
  }

  return errors;
};

// ─── After update — deferred result + after-photos (detail screen) ────────────

export interface AfterUpdateErrors {
  demo_result?: string;
  after_photos?: string;
  remark?: string;
}

export const validateAfterUpdate = (
  data: { demo_result: string; after_photos: PhotoDraft[]; remark: string },
  minPhotos: number = 2,
): AfterUpdateErrors => {
  const errors: AfterUpdateErrors = {};

  if (!data.demo_result) {
    errors.demo_result = 'Please select a demo result.';
  }

  if (data.after_photos.length < minPhotos) {
    errors.after_photos = `At least ${minPhotos} after-demo photos are required.`;
  }

  if (data.remark.length > 500) {
    errors.remark = `Remark must not exceed 500 characters (${data.remark.length}/500).`;
  }

  return errors;
};

// ─── Utility ──────────────────────────────────────────────────────────────────

export const hasErrors = (
  errors: object,
): boolean =>
  Object.values(errors).some((v) => v !== undefined && v !== '');
