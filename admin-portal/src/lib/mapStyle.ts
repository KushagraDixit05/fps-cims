// Mappls (MapmyIndia) is India's official Survey of India partner.
// Set NEXT_PUBLIC_MAPPLS_KEY in .env.local to use official India boundaries.
const MAPPLS_KEY = process.env.NEXT_PUBLIC_MAPPLS_KEY;

export const MAP_STYLE_DARK =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  (MAPPLS_KEY
    ? `https://apis.mappls.com/advancedmaps/api/${MAPPLS_KEY}/map_sdk_vindow`
    : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json');

export const MAP_STYLE_LIGHT =
  process.env.NEXT_PUBLIC_MAP_STYLE_LIGHT_URL ??
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Keep MAP_STYLE_URL for the initial Map constructor (always dark on first mount).
export const MAP_STYLE_URL = MAP_STYLE_DARK;

export const mapStyleUrl = (theme: 'dark' | 'light') =>
  theme === 'light' ? MAP_STYLE_LIGHT : MAP_STYLE_DARK;

export const INDIA_INITIAL_VIEW = {
  longitude: 78.9,
  latitude:  20.5,
  zoom:      4.0,
  pitch:     0,
  bearing:   0,
} as const;

// India-only confinement (see docs/agri-intelligence-map/PHASE-1 §1.10a).
// fitBounds target: India fills the viewport on load.
export const INDIA_BOUNDS: [[number, number], [number, number]] =
  [[67.0, 6.0], [98.0, 38.0]];
// Hard pan limit (padded around INDIA_BOUNDS) — camera can't leave India.
export const INDIA_MAX_BOUNDS: [[number, number], [number, number]] =
  [[63.0, 3.0], [101.0, 40.5]];
export const INDIA_MIN_ZOOM = 3.6;
export const INDIA_MAX_ZOOM = 16;

// Bundled official India boundaries (public/geo). Local = offline, fast,
// politically correct. Override via env if a certified set is hosted elsewhere.
export const DISTRICTS_GEOJSON_URL =
  process.env.NEXT_PUBLIC_GEO_DISTRICTS_URL ?? '/geo/india-districts.geojson';

export const INDIA_OUTLINE_URL =
  process.env.NEXT_PUBLIC_GEO_OUTLINE_URL ?? '/geo/india-outline.geojson';
