import { api } from './api';
import type { GeoFilterState } from '@/types/geo';

function toParams(f: Partial<GeoFilterState>): URLSearchParams {
  const p = new URLSearchParams();
  f.crops?.forEach((c) => p.append('crops', c));
  f.modules?.forEach((m) => p.append('modules', m));
  if (f.condition)   p.set('condition',    f.condition);
  if (f.district)    p.set('district',     f.district);
  if (f.block)       p.set('block',        f.block);
  if (f.dateFrom)    p.set('date_from',    f.dateFrom);
  if (f.dateTo)      p.set('date_to',      f.dateTo);
  if (f.executiveId) p.set('executive_id', String(f.executiveId));
  if (f.productName) p.set('product_name', f.productName);
  return p;
}

export const geoApi = {
  aggregate(level: string, f: Partial<GeoFilterState> = {}) {
    const p = toParams(f);
    p.set('level', level);
    return api.get('/api/geo/aggregate/', { params: p });
  },

  points(bbox: [number, number, number, number], f: Partial<GeoFilterState> = {}) {
    const p = toParams(f);
    p.set('bbox', bbox.join(','));
    return api.get('/api/geo/points/', { params: p });
  },

  record(id: string, module: string) {
    return api.get(`/api/geo/record/${id}/`, { params: { module } });
  },

  regionSummary(level: string, regionId: string, f: Partial<GeoFilterState> = {}) {
    const p = toParams(f);
    return api.get(`/api/geo/region/${level}/${encodeURIComponent(regionId)}/summary/`, { params: p });
  },

  flows(type: string, f: Partial<GeoFilterState> = {}) {
    const p = toParams(f);
    p.set('type', type);
    return api.get('/api/geo/flows/', { params: p });
  },

  timeline(bucket: string, f: Partial<GeoFilterState> = {}) {
    const p = toParams(f);
    p.set('bucket', bucket);
    return api.get('/api/geo/timeline/', { params: p });
  },
};
