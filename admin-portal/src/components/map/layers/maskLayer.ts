import { SolidPolygonLayer, GeoJsonLayer } from '@deck.gl/layers';
import type { MaskPolygon } from '@/lib/indiaMask';

export function makeIndiaMaskLayer(
  polygon: MaskPolygon | null,
  fill: [number, number, number, number] = [5, 8, 10, 245],
) {
  if (!polygon) return [];
  return [
    new SolidPolygonLayer<{ polygon: MaskPolygon }>({
      id:           'india-mask',
      data:         [{ polygon }],
      getPolygon:   (d) => d.polygon,
      getFillColor: fill,
      filled:       true,
      pickable:     false,
    }),
  ];
}

export function makeIndiaOutlineLayer(
  outline: GeoJSON.FeatureCollection | null,
  color: [number, number, number, number] = [140, 220, 170, 90],
) {
  if (!outline) return [];
  return [
    new GeoJsonLayer({
      id:                 'india-outline',
      data:               outline,
      filled:             false,
      stroked:            true,
      getLineColor:       color,
      lineWidthMinPixels: 1,
      lineWidthUnits:     'pixels',
      pickable:           false,
    }),
  ];
}
