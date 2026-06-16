import { ScatterplotLayer } from '@deck.gl/layers';
import { CONDITION_COLORS, MODULE_COLORS } from '@/lib/mapMotion';
import type { GeoPointFeature } from '@/types/geo';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PickHandler = (info: any) => boolean | void;

function pinColor(d: GeoPointFeature): [number, number, number, number] {
  if (d.properties.condition) {
    return CONDITION_COLORS[d.properties.condition] ?? MODULE_COLORS[d.properties.module];
  }
  return MODULE_COLORS[d.properties.module] ?? [52, 224, 138, 200];
}

export function makePinLayer(
  data: GeoPointFeature[],
  opacity: number,
  onHover: PickHandler,
  onClick: PickHandler,
) {
  return new ScatterplotLayer<GeoPointFeature>({
    id:              'pins',
    data,
    opacity,
    getPosition:     (d) => d.geometry.coordinates as [number, number],
    getRadius:       5,
    getFillColor:    pinColor,
    getLineColor:    [255, 255, 255, 80],
    lineWidthMinPixels: 1,
    stroked:         true,
    pickable:        true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onHover:         onHover as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onClick:         onClick as any,
    radiusUnits:     'pixels',
    transitions:     { opacity: { duration: 400 } },
  });
}
