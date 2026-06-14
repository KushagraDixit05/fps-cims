// src/types/mandiArrival.ts
// All TypeScript interfaces for the Mandi Arrival module wizard.
// Kept separate from src/types/index.ts to keep the shared types file lean.
// Mirrors the pattern of src/types/cropMonitoring.ts.

import type { PhotoDraft, LocationDraft } from './cropMonitoring';

// ─── Crop Variety Card ────────────────────────────────────────────────────────

/** In-progress crop variety card held in wizard state. Not sent to server as-is. */
export interface CropVarietyDraft {
  /** Client-side UUID used as React key — never sent to the server. */
  localKey: string;
  /** e.g. "Soybean JS 9560" — holds OTHERS_VALUE when Others is selected. */
  crop_variety_name: string;
  /** Free-text variety name typed when Others is selected. Resolved before submission. */
  custom_crop_variety_name: string;
  /** Arrival quantity in quintal — stored as string while user is typing */
  quantity_qt: string;
  /** Top (highest) rate ₹/Qt */
  top_rate: string;
  /** Mostly used rate ₹/Qt */
  mostly_sales_rate: string;
  /** Bottom (lowest) rate ₹/Qt */
  bottom_rate: string;
  /** Sort order for display */
  sort_order: number;
}

/** Validation errors keyed by CropVarietyDraft field name. */
export type CropVarietyErrors = Partial<Record<keyof CropVarietyDraft, string>>;

// ─── Mandi Details (Step 1) ───────────────────────────────────────────────────

export interface MandiDetailsDraft {
  /** Stringified integer — mandi selector; sentinel 'others' for custom entry */
  mandi_id: string;
  /** Display name — set when mandi is selected */
  mandi_name: string;
  /** Free-text name entered by user when mandi_id === 'others' */
  custom_mandi_name?: string;
  /** ISO date string: YYYY-MM-DD */
  date: string;
  /** Total arrival across all crops, in quintal — manual entry field */
  total_arrival_qt: string;
}

/** Validation errors keyed by MandiDetailsDraft field name. */
export type MandiDetailsErrors = Partial<Record<keyof MandiDetailsDraft, string>>;

// ─── Source of Information ────────────────────────────────────────────────────

/** 4 source options + sentinel for the "Others" free-text path. */
export type MandiArrivalSource = 'Trader' | 'Farmer' | 'FPS Staff' | 'Mandi' | '__others__';

export const MANDI_SOURCES: { value: MandiArrivalSource; label: string }[] = [
  { value: 'Trader',    label: 'Trader' },
  { value: 'Farmer',    label: 'Farmer' },
  { value: 'FPS Staff', label: 'FPS Staff' },
  { value: 'Mandi',     label: 'Mandi' },
];

// ─── Wizard State ─────────────────────────────────────────────────────────────

export interface MandiArrivalFormState {
  step: 1 | 2 | 3 | 4 | 5 | 'review';
  mandiDetails: MandiDetailsDraft;
  varieties: CropVarietyDraft[];
  source: MandiArrivalSource | '';
  /** Free-text source description typed when Others is selected. Resolved before submission. */
  custom_source: string;
  remark: string;
  photos: PhotoDraft[];    // reuse from cropMonitoring types
  location: LocationDraft; // reuse from cropMonitoring types
}

// ─── DB Payload ───────────────────────────────────────────────────────────────

/** Shape of the varieties array stored as JSON in the DB column. */
export interface CropVarietyPayload {
  crop_variety_name: string;
  quantity_qt: number;
  top_rate: number;
  mostly_sales_rate: number;
  bottom_rate: number;
  sort_order: number;
}

/** Return type from saveMandiArrivalWizardLocally(). */
export interface MandiArrivalSaveResult {
  id: string;
  mandi_name: string;
  variety_count: number;
}
