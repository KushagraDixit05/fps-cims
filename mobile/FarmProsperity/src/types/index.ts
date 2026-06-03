/**
 * Domain types for Farm Prosperity Solutions mobile app.
 * All API responses and form data are shaped by these interfaces.
 */

// ─── Users & Auth ────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: 'field_executive' | 'admin' | 'viewer';
  region: string;
  phone_number?: string;
}

// ─── Geography ───────────────────────────────────────────────────────────────

export interface Village {
  id: number;
  name: string;
  taluka: string;
  district: string;
  state: string;
}

// ─── Farmers ─────────────────────────────────────────────────────────────────

export interface Farmer {
  id: number;
  name: string;
  phone_number: string;
  village: number;
  village_name?: string;
  district?: string;
}

// ─── Crops ───────────────────────────────────────────────────────────────────

export type CropCondition = 'good' | 'average' | 'poor';

export type CropStage =
  | 'seedling'
  | 'vegetative'
  | 'flowering'
  | 'fruiting'
  | 'harvesting'
  | 'post_harvest';

export interface CropPhoto {
  id: number;
  photo: string;   // URL
  caption: string;
}

export interface CropEntry {
  id: string;                    // UUID
  farmer: number;
  farmer_name?: string;
  village_name?: string;
  district?: string;
  crop_name: string;
  area_this_year: number;
  area_last_year?: number;
  sowing_date?: string;          // YYYY-MM-DD
  crop_stage: CropStage;
  crop_condition: CropCondition;
  expected_yield?: number;       // Qt/Acre
  buyer_interest?: boolean;
  problem_pest: boolean;
  problem_disease: boolean;
  problem_weather: boolean;
  problem_price_concern: boolean;
  problem_other: string;
  visit_date: string;            // YYYY-MM-DD
  created_at?: string;
  latitude?: number;
  longitude?: number;
  local_id?: string;
  photos?: CropPhoto[];
}

/** Data sent to the POST /api/crops/ endpoint */
export type CropEntryPayload = Omit<CropEntry, 'id' | 'created_at' | 'photos'>;

export interface DashboardSummary {
  total_entries: number;
  total_acreage: number | null;
  by_condition: { good: number; average: number; poor: number };
  by_stage?: Record<CropStage, number>;
}

// ─── Mandi ───────────────────────────────────────────────────────────────────

export interface Mandi {
  id: number;
  name: string;
  district: string;
  state: string;
  is_active: boolean;
}

export type MandiSource = 'trader' | 'farmer' | 'official';

export interface MandiArrival {
  id: string;                    // UUID
  mandi: number;
  mandi_name?: string;
  mandi_state?: string;
  commodity: string;
  date: string;                  // YYYY-MM-DD
  arrival_quantity: number;      // Quintal
  avg_rate?: number;             // ₹/Qt
  min_rate?: number;
  max_rate?: number;
  source: MandiSource;
  remark: string;
  created_at?: string;
  local_id?: string;
}

export type MandiArrivalPayload = Omit<MandiArrival, 'id' | 'created_at'>;

export interface YoYComparison {
  mandi_id: string;
  commodity: string;
  this_year: {
    year: number;
    total_quantity: number | null;
    entries: number;
  };
  last_year: {
    year: number;
    total_quantity: number | null;
    entries: number;
  };
}

// ─── Navigation Param Lists ───────────────────────────────────────────────────
// (Re-exported from navigation/types.ts — kept here for convenience)
