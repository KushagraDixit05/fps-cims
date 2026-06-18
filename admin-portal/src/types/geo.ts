export type MapMode = 'heat' | 'cluster' | 'pin' | 'district' | 'flow';

export interface GeoFilterState {
  crops: string[];
  products: string[];
  commodities: string[];
  modules: string[];
  condition: string | null;
  district: string | null;
  block: string | null;
  village: string | null;
  executiveId: number | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface GeoFacets {
  products: string[];
  commodities: string[];
}

export interface GeoAggregateProperties {
  id: string;
  name: string;
  count: number;
  visit_count: number;
  demo_count: number;
  mandi_count: number;
  good: number;
  average: number;
  poor: number;
  score: number;
}

export interface GeoAggregateFeature {
  type: 'Feature';
  properties: GeoAggregateProperties;
  geometry: { type: 'Point'; coordinates: [number, number] };
}

export interface GeoPointProperties {
  id: string;
  module: 'visit' | 'demo' | 'mandi';
  farmer?: string;
  village?: string;
  district?: string;
  block?: string;
  condition?: 'good' | 'average' | 'poor' | null;
  crop?: string | null;
  commodity?: string;
  product?: string;
  result?: string | null;
  executive_id?: number;
  date: string;
  mandi?: string;
  quantity?: number;
  avg_rate?: number | null;
}

export interface GeoPointFeature {
  type: 'Feature';
  properties: GeoPointProperties;
  geometry: { type: 'Point'; coordinates: [number, number] };
}

export interface RegionSummary {
  region: string;
  level: string;
  kpis: {
    total_visits: number;
    total_demos: number;
    score: number;
    good: number;
    average: number;
    poor: number;
  };
  crop_split: { crop_name: string; count: number }[];
  trend: { date: string; count: number }[];
  top_execs: { id: number; name: string; count: number }[];
}

export interface FlowArc {
  from: [number, number];
  to: [number, number];
  weight: number;
  label: string;
}

export interface TimelineBucket {
  date: string;
  count: number;
  visit_count: number;
  demo_count: number;
}

export interface HoverInfo {
  x: number;
  y: number;
  feature: GeoAggregateFeature | GeoPointFeature | null;
  mode: MapMode;
}
