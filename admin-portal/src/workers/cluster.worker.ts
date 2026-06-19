import Supercluster from 'supercluster';
import type { BBox, GeoJsonProperties } from 'geojson';

let index: Supercluster | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, points, radius, maxZoom, bbox, zoom } = e.data;

  if (type === 'index') {
    index = new Supercluster({ radius: radius ?? 60, maxZoom: maxZoom ?? 14 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    index.load(points as any[]);
    self.postMessage({ type: 'indexed', count: points.length });
    return;
  }

  if (type === 'cluster' && index) {
    const clusters = index.getClusters(bbox as BBox, Math.floor(zoom));
    self.postMessage({ type: 'clusters', clusters });
    return;
  }

  if (type === 'expand' && index) {
    const { clusterId } = e.data as { clusterId: number };
    const leaves = index.getLeaves(clusterId, 100);
    self.postMessage({ type: 'leaves', leaves, clusterId });
    return;
  }
};
