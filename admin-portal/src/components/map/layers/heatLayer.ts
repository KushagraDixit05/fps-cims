import { HeatmapLayer } from '@deck.gl/aggregation-layers';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PickHandler = (info: any) => boolean | void;
import type { GeoPointFeature } from '@/types/geo';

const DEFAULT_COLOR_RANGE: [number, number, number][] = [
  [0,   0,   0  ],
  [10,  40,  25 ],
  [20,  100, 60 ],
  [34,  180, 100],
  [52,  224, 138],
  [200, 255, 230],
];

export function makeHeatLayer(
  data: GeoPointFeature[],
  opacity: number,
  zoom: number,
  onHover: PickHandler,
  colorRange: [number, number, number][] = DEFAULT_COLOR_RANGE,
) {
  const radiusPixels = Math.max(15, Math.min(45, 15 + (7 - zoom) * 6));

  return new HeatmapLayer<GeoPointFeature>({
    id:           'heat',
    data,
    opacity,
    getPosition:  (d) => d.geometry.coordinates as [number, number],
    getWeight:    () => 1,
    radiusPixels,
    colorRange,
    pickable:     true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onHover:      onHover as any,
    transitions:  { opacity: { duration: 400 } },
  });
}
