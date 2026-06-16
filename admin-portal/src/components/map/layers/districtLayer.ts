import { GeoJsonLayer } from '@deck.gl/layers';
import type { GeoAggregateFeature } from '@/types/geo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PickHandler = (info: any) => boolean | void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DistrictPolygon = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function districtName(d: any): string {
  const p = d?.properties ?? {};
  return p.NAME_2 ?? p.NAME_1 ?? p.district ?? p.name ?? '';
}

function scoreToColor(score: number, opacity = 200): [number, number, number, number] {
  if (score > 0.66) return [52,  224, 138, opacity];
  if (score > 0.33) return [245, 197, 66,  opacity];
  return [251, 106, 106, opacity];
}

export function makeDistrictLayer(
  boundaries: DistrictPolygon[] | null,
  stats: GeoAggregateFeature[],
  opacity: number,
  onHover: PickHandler,
  onClick: PickHandler,
) {
  if (!boundaries) return [];

  const statsMap = new Map<string, GeoAggregateFeature>();
  for (const f of stats) statsMap.set(f.properties.name.toLowerCase(), f);

  return [
    new GeoJsonLayer({
      id:           'districts',
      data:         { type: 'FeatureCollection', features: boundaries },
      opacity,
      filled:       true,
      stroked:      true,
      getLineColor: [140, 220, 170, 40] as [number,number,number,number],
      lineWidthMinPixels: 0.5,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getFillColor: (d: any) => {
        const name = districtName(d).toLowerCase();
        const stat = statsMap.get(name);
        if (!stat) return [20, 40, 30, 60] as [number,number,number,number];
        return scoreToColor(stat.properties.score, 160);
      },
      pickable:     true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onHover:      onHover as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onClick:      onClick as any,
      transitions:  { opacity: { duration: 400 } },
      updateTriggers: { getFillColor: [stats] },
    }),
  ];
}
