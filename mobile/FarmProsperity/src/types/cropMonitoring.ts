// src/types/cropMonitoring.ts
// All TypeScript interfaces for the Crop Monitoring module.
// Kept separate from src/types/index.ts to avoid bloating the shared types file.

// ─── Master data ──────────────────────────────────────────────────────────────

export interface District {
  id: number;
  name: string;
  state: string;
}

export interface Block {
  id: number;
  name: string;
  district: number;
  district_name: string;
}

export interface CropVariety {
  id: number;
  variety_name: string;
}

export interface CropMaster {
  id: number;
  crop_name: string;
  varieties: CropVariety[];
}

// ─── Crop form draft types ────────────────────────────────────────────────────

export type CropStage =
  | 'seedling'
  | 'vegetative'
  | 'flowering'
  | 'fruiting'
  | 'harvesting'
  | 'post_harvest';

export type CropCondition = 'good' | 'average' | 'poor';

export type ProblemType =
  | 'pest'
  | 'disease'
  | 'weather'
  | 'price'
  | 'labour'
  | 'other';

/** In-progress crop card data held in wizard state. Not sent to server as-is. */
export interface CropRecordDraft {
  /** Client-side UUID used as React key — never sent to the server. */
  localKey: string;
  crop_name: string;
  variety: string;
  /** ISO date string: YYYY-MM-DD */
  date_of_sowing: string;
  current_area_acre: string;
  last_year_area_acre: string;
  this_year_area_acre: string;
  crop_stage: CropStage | '';
  crop_condition: CropCondition | '';
  problems: ProblemType[];
  other_problem_detail: string;
  sort_order: number;
}

/** Validation errors keyed by CropRecordDraft field name. */
export type CropRecordErrors = Partial<Record<keyof CropRecordDraft, string>>;

export interface FarmerDetailsDraft {
  farmer_name: string;
  mobile_number: string;
  village_name: string;
  block_name: string;
  district_name: string;
  total_land_acre: string;
}

/** Validation errors keyed by FarmerDetailsDraft field name. */
export type FarmerDetailsErrors = Partial<Record<keyof FarmerDetailsDraft, string>>;

export interface PhotoDraft {
  uri: string;
  name: string;
  type: string;
}

export interface LocationDraft {
  latitude: number | null;
  longitude: number | null;
  captured: boolean;
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

export interface CropMonitoringFormState {
  step: 1 | 2 | 3 | 'review';
  farmerDetails: FarmerDetailsDraft;
  crops: CropRecordDraft[];
  photos: PhotoDraft[];
  location: LocationDraft;
  remark: string;
}

// ─── API response types ───────────────────────────────────────────────────────

export interface FarmerVisitSummary {
  today: number;
  this_week: number;
  this_month: number;
  team_members: number;
}

export interface RecentVisit {
  id: string;
  farmer_name: string;
  village_name: string;
  block_name: string;
  district_name: string;
  crop_count: number;
  submitted_at: string;
  /** True when the record lives only in local WatermelonDB (not yet synced to server). */
  _pending?: boolean;
}

export interface CropRecordResponse {
  id: string;
  crop_name: string;
  variety: string;
  date_of_sowing: string;
  current_area_acre: string;
  last_year_area_acre: string | null;
  this_year_area_acre: string;
  crop_stage: CropStage;
  crop_condition: CropCondition;
  problems: ProblemType[];
  other_problem_detail: string;
  sort_order: number;
}

export interface VisitPhotoResponse {
  id: string;
  image: string;
  uploaded_at: string;
}

export interface FarmerVisitDetail {
  id: string;
  farmer_name: string;
  mobile_number: string;
  village_name: string;
  block_name: string;
  district_name: string;
  total_land_acre: string;
  latitude: number | null;
  longitude: number | null;
  location_display: string | null;
  remark: string;
  submitted_at: string;
  crop_count: number;
  crops: CropRecordResponse[];
  photos: VisitPhotoResponse[];
  local_id: string;
  is_synced: boolean;
}

/** Shape of the POST /api/farmer-visits/ 201 response. */
export interface FarmerVisitCreateResponse {
  id: string;
  submitted_at: string;
  farmer_name: string;
  crop_count: number;
  location: {
    lat: number | null;
    lng: number | null;
  };
}

/** Generic DRF paginated list wrapper. */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
