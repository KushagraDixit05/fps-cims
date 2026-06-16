import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { MODULE_COLORS } from '@/lib/mapMotion';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PickHandler = (info: any) => boolean | void;

interface ClusterFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    cluster: boolean;
    cluster_id?: number;
    point_count?: number;
    module?: string;
  };
}

function clusterColor(f: ClusterFeature): [number, number, number, number] {
  if (f.properties.cluster) return [52, 224, 138, 200];
  const m = f.properties.module ?? 'visit';
  return MODULE_COLORS[m] ?? [52, 224, 138, 200];
}

function clusterRadius(f: ClusterFeature): number {
  const count = f.properties.point_count ?? 1;
  return Math.max(12, Math.sqrt(count) * 6);
}

export function makeClusterLayer(
  data: ClusterFeature[],
  opacity: number,
  onHover: PickHandler,
  onClick: PickHandler,
) {
  const circles = new ScatterplotLayer<ClusterFeature>({
    id:              'cluster-circles',
    data,
    opacity,
    getPosition:     (d) => d.geometry.coordinates,
    getRadius:       clusterRadius,
    getFillColor:    clusterColor,
    getLineColor:    [255, 255, 255, 60],
    lineWidthMinPixels: 1,
    stroked:         true,
    pickable:        true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onHover:         onHover as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onClick:         onClick as any,
    transitions:     { opacity: { duration: 400 } },
    radiusUnits:     'pixels',
  });

  const labels = new TextLayer<ClusterFeature>({
    id:           'cluster-labels',
    data:         data.filter((d) => d.properties.cluster),
    getPosition:  (d) => d.geometry.coordinates,
    getText:      (d) => String(d.properties.point_count ?? ''),
    getSize:      10,
    getColor:     [5, 8, 10, 255],
    fontFamily:   'monospace',
    fontWeight:   'bold',
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
  });

  return [circles, labels];
}
