import { DISTRICTS_GEOJSON_URL } from './mapStyle';

export interface DistrictEntry {
  district: string;
  state:    string;
  /** [west, south, east, north] */
  bounds:   [number, number, number, number];
}

let cache: DistrictEntry[] | null = null;
let inflight: Promise<DistrictEntry[]> | null = null;

function ringsOf(geometry: GeoJSON.Geometry): number[][][] {
  if (geometry.type === 'Polygon')      return geometry.coordinates as number[][][];
  if (geometry.type === 'MultiPolygon') return (geometry.coordinates as number[][][][]).flat();
  return [];
}

function featureBounds(geometry: GeoJSON.Geometry): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const ring of ringsOf(geometry)) {
    for (const [lng, lat] of ring) {
      if (lng < w) w = lng;
      if (lng > e) e = lng;
      if (lat < s) s = lat;
      if (lat > n) n = lat;
    }
  }
  return [w, s, e, n];
}

export function loadDistrictIndex(): Promise<DistrictEntry[]> {
  if (cache)    return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = fetch(DISTRICTS_GEOJSON_URL)
    .then((r) => r.json())
    .then((data) => {
      const features: GeoJSON.Feature[] = data?.features ?? [];
      const seen = new Set<string>();
      const entries: DistrictEntry[] = [];

      for (const f of features) {
        const district = (f.properties?.district as string | undefined) ?? '';
        const state    = (f.properties?.state    as string | undefined) ?? '';
        if (!district || seen.has(district + '|' + state)) continue;
        seen.add(district + '|' + state);
        entries.push({ district, state, bounds: featureBounds(f.geometry) });
      }

      // Also add unique state-level entries (union of all districts' bounds)
      const stateMap = new Map<string, [number, number, number, number]>();
      for (const e of entries) {
        const cur = stateMap.get(e.state);
        if (!cur) { stateMap.set(e.state, [...e.bounds]); continue; }
        if (e.bounds[0] < cur[0]) cur[0] = e.bounds[0];
        if (e.bounds[1] < cur[1]) cur[1] = e.bounds[1];
        if (e.bounds[2] > cur[2]) cur[2] = e.bounds[2];
        if (e.bounds[3] > cur[3]) cur[3] = e.bounds[3];
      }
      for (const [state, bounds] of stateMap) {
        entries.push({ district: state, state, bounds });
      }

      entries.sort((a, b) => a.district.localeCompare(b.district));
      cache = entries;
      return entries;
    })
    .catch(() => {
      inflight = null;
      return [];
    });

  return inflight;
}

export function searchDistricts(query: string, entries: DistrictEntry[], limit = 6): DistrictEntry[] {
  const q = query.toLowerCase();
  const exact:   DistrictEntry[] = [];
  const startsWith: DistrictEntry[] = [];
  const contains:   DistrictEntry[] = [];

  for (const e of entries) {
    const d = e.district.toLowerCase();
    const s = e.state.toLowerCase();
    if (d === q || s === q)           { exact.push(e); continue; }
    if (d.startsWith(q))              { startsWith.push(e); continue; }
    if (d.includes(q) || s.includes(q)) contains.push(e);
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit);
}
