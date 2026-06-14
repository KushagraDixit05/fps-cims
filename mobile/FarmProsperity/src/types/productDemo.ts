// src/types/productDemo.ts
// All TypeScript interfaces for the Product Demo module.

import type { PhotoDraft, LocationDraft, VarietyDraft } from './cropMonitoring';

// Re-export shared draft types so callers only need one import
export type { PhotoDraft, LocationDraft, VarietyDraft };

// ─── Enums ────────────────────────────────────────────────────────────────────

export type DemoResult =
  | 'excellent'
  | 'good'
  | 'average'
  | 'poor'
  | 'no_effect';

export type DoseUnit =
  | 'ml/acre'
  | 'gm/acre'
  | 'kg/acre'
  | 'kg/ha'
  | 'lt/acre';

export type CropStage =
  | 'seedling'
  | 'vegetative'
  | 'flowering'
  | 'fruiting'
  | 'harvesting'
  | 'post_harvest';

// ─── Step draft types ─────────────────────────────────────────────────────────

export interface DemoFarmerDetailsDraft {
  farmer_name: string;
  mobile_number: string;
  /** Resolved village name (auto-filled from dropdown OR equals custom_village_name when Others). */
  village_name: string;
  /** Server ID of the selected VillageMaster record. Null when 'Others' is typed manually. */
  village_id: number | null;
  /** Free-text village entered when 'Others (Please specify)' is selected. */
  custom_village_name: string;
  block_name: string;
  /** Free-text block name typed when Others is selected. Resolved before submission. */
  custom_block_name: string;
  district_name: string;
  total_land_acre: string;
}

export type DemoFarmerDetailsErrors = Partial<Record<keyof DemoFarmerDetailsDraft, string>>;

export interface CropStageDraft {
  crop_name: string;
  /** Free-text crop name typed when Others is selected. Resolved before submission. */
  custom_crop_name: string;
  /** One crop, one or more varieties of it. Always has at least one entry. */
  varieties: VarietyDraft[];
  crop_stage: CropStage | '';
  /** Stored as a string for controlled input; parsed to int on submit */
  crop_stage_days: string;
  /** ISO date string: YYYY-MM-DD */
  demo_date: string;
}

export type CropStageErrors = Partial<Record<keyof CropStageDraft, string>> & {
  /** Per-variety error messages, indexed alongside the varieties array. */
  varietyErrors?: string[];
};

export interface ProductDoseDraft {
  product_name: string;
  /** Free-text product name typed when Others is selected. Resolved before submission. */
  custom_product_name: string;
  dose: string;
  dose_unit: DoseUnit | '';
}

export type ProductDoseErrors = Partial<Record<keyof ProductDoseDraft, string>>;

export interface DemoResultDraft {
  before_photos: PhotoDraft[];
  after_photos: PhotoDraft[];
  demo_result: DemoResult | '';
  additional_observations: string;
  remark: string;
}

export interface Step4Errors {
  before_photos?: string;
  after_photos?: string;
  demo_result?: string;
  remark?: string;
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

export interface ProductDemoFormState {
  step: 1 | 2 | 3 | 4 | 'review';
  farmerDetails: DemoFarmerDetailsDraft;
  cropStage: CropStageDraft;
  productDose: ProductDoseDraft;
  result: DemoResultDraft;
  location: LocationDraft;
}

// ─── Local DB save result ─────────────────────────────────────────────────────

export interface ProductDemoSaveResult {
  id: string;
  farmer_name: string;
  product_name: string;
}

// ─── API types ────────────────────────────────────────────────────────────────

export interface ProductDemoSummary {
  today: number;
  this_week: number;
  this_month: number;
}

export interface ProductDemoListItem {
  id: string;
  farmer_name: string;
  village_name: string;
  product_name: string;
  demo_result: DemoResult;
  submitted_at: string;
  _pending?: boolean;
}
