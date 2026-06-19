// India-only fog mask geometry (see docs/agri-intelligence-map PHASE-1 §1.10a,
// TECH-DECISIONS ADR-09). Loads the bundled national outline and builds an
// inverse polygon — a world-spanning rectangle with India's rings punched out as
// holes — so a single dark fill covers everything *except* India.
import { INDIA_OUTLINE_URL } from './mapStyle';

type Ring = [number, number][];

// A Web-Mercator-safe world rectangle (avoid the ±90 poles where the projection
// diverges). Wound clockwise; India holes are wound the opposite way by virtue of
// being separate rings — deck.gl's polygon tesselation fills outer-minus-holes.
const WORLD_RING: Ring = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

// deck.gl SolidPolygonLayer accepts a polygon as [outerRing, ...holeRings].
export type MaskPolygon = Ring[];

let outlineCache: Promise<GeoJSON.FeatureCollection> | null = null;

/** Fetch the bundled India outline once; cached module-wide. */
export function loadIndiaOutline(): Promise<GeoJSON.FeatureCollection> {
  if (!outlineCache) {
    outlineCache = fetch(INDIA_OUTLINE_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`india outline ${r.status}`);
        return r.json();
      })
      .catch((e) => {
        outlineCache = null; // allow retry on next call
        throw e;
      });
  }
  return outlineCache;
}

/** Pull every outer ring out of the outline's (Multi)Polygon features. */
function extractIndiaRings(fc: GeoJSON.FeatureCollection): Ring[] {
  const rings: Ring[] = [];
  for (const f of fc.features ?? []) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') {
      // outer ring only — interior holes (enclaves) are irrelevant to the mask
      if (g.coordinates[0]) rings.push(g.coordinates[0] as Ring);
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) {
        if (poly[0]) rings.push(poly[0] as Ring);
      }
    }
  }
  return rings;
}

/**
 * Build the inverse mask polygon: world rectangle as the outer ring, every India
 * landmass ring as a hole. Rendered dark + nearly opaque on top of the deck stack,
 * this hides all neighbouring countries and any heat spillover past the border,
 * while India shows through the holes.
 */
export function buildMaskPolygon(fc: GeoJSON.FeatureCollection): MaskPolygon {
  return [WORLD_RING, ...extractIndiaRings(fc)];
}
