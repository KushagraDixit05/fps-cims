// Mappls (MapmyIndia) is India's official Survey of India partner.
// Set NEXT_PUBLIC_MAPPLS_KEY in .env.local to use official India boundaries.
const MAPPLS_KEY = process.env.NEXT_PUBLIC_MAPPLS_KEY;

export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  (MAPPLS_KEY
    ? `https://apis.mappls.com/advancedmaps/api/${MAPPLS_KEY}/map_sdk_vindow`
    : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json');

export const INDIA_INITIAL_VIEW = {
  longitude: 78.9,
  latitude:  20.5,
  zoom:      4.0,
  pitch:     0,
  bearing:   0,
} as const;

export const DISTRICTS_GEOJSON_URL =
  process.env.NEXT_PUBLIC_GEO_DISTRICTS_URL ??
  'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/india/india-districts.json';
