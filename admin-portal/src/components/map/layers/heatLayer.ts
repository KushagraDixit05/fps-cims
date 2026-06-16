import { HeatmapLayer } from '@deck.gl/aggregation-layers';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PickHandler = (info: any) => boolean | void;
import type { GeoAggregateFeature } from '@/types/geo';

const DEFAULT_COLOR_RANGE: [number, number, number][] = [
  [0,   0,   0  ],
  [10,  40,  25 ],
  [20,  100, 60 ],
  [34,  180, 100],
  [52,  224, 138],
  [200, 255, 230],
];

export function makeHeatLayer(
  data: GeoAggregateFeature[],
  opacity: number,
  zoom: number,
  onHover: PickHandler,
  colorRange: [number, number, number][] = DEFAULT_COLOR_RANGE,
) {
  const radiusPixels = Math.max(40, Math.min(90, 40 + (7 - zoom) * 8));

  return new HeatmapLayer<GeoAggregateFeature>({
    id:           'heat',
    data,
    opacity,
    getPosition:  (d) => d.geometry.coordinates as [number, number],
    getWeight:    (d) => d.properties.count,
    radiusPixels,
    colorRange,
    pickable:     true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onHover:      onHover as any,
    transitions:  { opacity: { duration: 400 } },
  });
}
