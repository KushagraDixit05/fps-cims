import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

// ── Shared filter types ───────────────────────────────────────────────────────

export interface VisitFilters {
  date_from?: string;
  date_to?: string;
  executive?: string;
  district?: string;
  crop?: string;
  variety?: string;
  condition?: string;
  page?: number;
  page_size?: number;
}

export interface MandiFilters {
  date_from?: string;
  date_to?: string;
  executive?: string;
  district?: string;
  commodity?: string;
  mandi?: string;
  page?: number;
  page_size?: number;
}

export interface DemoFilters {
  date_from?: string;
  date_to?: string;
  executive?: string;
  district?: string;
  crop?: string;
  variety?: string;
  product?: string;
  result?: string;
  page?: number;
  page_size?: number;
}

// ── Response types ────────────────────────────────────────────────────────────

export interface CropRecordInline {
  crop_name: string;
  variety: string;
  crop_stage: string;
  crop_condition: string;
  this_year_area_acre: string;
  last_year_area_acre: string | null;
  date_of_sowing: string;
  problems: string[];
}

export interface FarmerVisitRow {
  id: string;
  submitted_at: string;
  executive_name: string;
  farmer_name: string;
  mobile_number: string;
  village_name: string;
  block_name: string;
  district_name: string;
  total_land_acre: string;
  crop_count: number;
  dominant_condition: string;
  latitude: number | null;
  longitude: number | null;
  remark: string;
  photo_count: number;
  crops: CropRecordInline[];
}

export interface MandiArrivalRow {
  id: string;
  date: string;
  created_at: string;
  executive_name: string;
  mandi_name: string;
  mandi_district: string;
  mandi_state: string;
  commodity: string;
  arrival_quantity: string;
  avg_rate: string | null;
  min_rate: string | null;
  max_rate: string | null;
  source: string;
  remark: string;
}

export interface ProductDemoRow {
  id: string;
  demo_date: string;
  submitted_at: string;
  executive_name: string;
  farmer_name: string;
  mobile_number: string;
  village_name: string;
  block_name: string;
  district_name: string;
  total_land_acre: string | null;
  crop_name: string;
  variety: string;
  crop_stage: string;
  crop_stage_days: number;
  product_name: string;
  dose: string;
  dose_unit: string;
  demo_result: string;
  additional_observations: string;
  remark: string;
  latitude: number | null;
  longitude: number | null;
  before_photos: number;
  after_photos: number;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useVisits(filters?: VisitFilters) {
  return useQuery({
    queryKey: ["field-data", "visits", filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<FarmerVisitRow>>(
        "/api/admin/field-data/visits/",
        { params: filters }
      );
      return data;
    },
  });
}

export function useMandi(filters?: MandiFilters) {
  return useQuery({
    queryKey: ["field-data", "mandi", filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<MandiArrivalRow>>(
        "/api/admin/field-data/mandi/",
        { params: filters }
      );
      return data;
    },
  });
}

export function useDemos(filters?: DemoFilters) {
  return useQuery({
    queryKey: ["field-data", "demos", filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProductDemoRow>>(
        "/api/admin/field-data/demos/",
        { params: filters }
      );
      return data;
    },
  });
}

// ── CSV export helpers (mirror exportAuditCsv pattern) ───────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportVisitsCsv(filters?: Omit<VisitFilters, "page" | "page_size">) {
  const today = new Date().toISOString().slice(0, 10);
  return api
    .get("/api/admin/field-data/visits/export/", { params: filters, responseType: "blob" })
    .then(({ data }) => downloadBlob(data, `fps-farmer-visits-${today}.csv`));
}

export function exportMandiCsv(filters?: Omit<MandiFilters, "page" | "page_size">) {
  const today = new Date().toISOString().slice(0, 10);
  return api
    .get("/api/admin/field-data/mandi/export/", { params: filters, responseType: "blob" })
    .then(({ data }) => downloadBlob(data, `fps-mandi-arrivals-${today}.csv`));
}

export function exportDemosCsv(filters?: Omit<DemoFilters, "page" | "page_size">) {
  const today = new Date().toISOString().slice(0, 10);
  return api
    .get("/api/admin/field-data/demos/export/", { params: filters, responseType: "blob" })
    .then(({ data }) => downloadBlob(data, `fps-product-demos-${today}.csv`));
}
