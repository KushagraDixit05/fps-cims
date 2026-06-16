"use client";
import { useMemo, useEffect, useState } from 'react';
import { useMapStore } from '@/store/mapStore';
import { useCameraBand } from './useCameraBand';
import { useGeoAggregate, useGeoPoints, useGeoFlows } from '@/hooks/useGeoData';
import { makeHeatLayer } from '../layers/heatLayer';
import { makeClusterLayer } from '../layers/clusterLayer';
import { makePinLayer } from '../layers/pinLayer';
import { makeDistrictLayer } from '../layers/districtLayer';
import { makeFlowLayer } from '../layers/flowLayer';
import { DISTRICTS_GEOJSON_URL } from '@/lib/mapStyle';
import type { GeoAggregateFeature, GeoPointFeature, FlowArc } from '@/types/geo';

export function useDeckLayers() {
  const activeMode       = useMapStore((s) => s.activeMode);
  const mapBounds        = useMapStore((s) => s.mapBounds);
  const zoom             = useMapStore((s) => s.viewState.zoom);
  const setHoverInfo     = useMapStore((s) => s.setHoverInfo);
  const setSelectedFeature = useMapStore((s) => s.setSelectedFeature);

  const { opacity } = useCameraBand();

  // Data queries
  const aggregateQ  = useGeoAggregate('district');
  const stateAggQ   = useGeoAggregate('state');
  const pointsQ     = useGeoPoints(mapBounds);
  const flowsQ      = useGeoFlows('mandi');

  // District boundaries (fetched once, cached)
  const [districtBoundaries, setDistrictBoundaries] = useState<object[] | null>(null);
  useEffect(() => {
    if (districtBoundaries) return;
    fetch(DISTRICTS_GEOJSON_URL)
      .then((r) => r.json())
      .then((data) => {
        const features = data?.features ?? data?.objects
          ? Object.values(data.objects).flatMap((o: unknown) => (o as { geometries?: unknown[] }).geometries ?? [])
          : [];
        setDistrictBoundaries(features.length ? features : data?.features ?? []);
      })
      .catch(() => setDistrictBoundaries([]));
  }, [districtBoundaries]);

  const hoverHandler  = useMemo(() => (info: { object?: unknown; x: number; y: number }) => {
    if (!info.object) { setHoverInfo(null); return; }
    setHoverInfo({ x: info.x, y: info.y, feature: info.object as GeoAggregateFeature, mode: activeMode });
  }, [activeMode, setHoverInfo]);

  const clickHandler = useMemo(() => (info: { object?: unknown }) => {
    if (!info.object) return;
    const feat = info.object as GeoAggregateFeature;
    const id   = feat?.properties?.id ?? (feat as unknown as { properties: { id: string } })?.properties?.id;
    setSelectedFeature(id ?? null, 'district');
  }, [setSelectedFeature]);

  const aggregateFeatures = (aggregateQ.data?.features ?? []) as GeoAggregateFeature[];
  const stateFeatures     = (stateAggQ.data?.features   ?? []) as GeoAggregateFeature[];
  const pointFeatures     = (pointsQ.data?.features     ?? []) as GeoPointFeature[];
  const flowArcs          = (flowsQ.data?.arcs           ?? []) as FlowArc[];

  return useMemo(() => {
    // Pick the data source and opacity for each mode
    switch (activeMode) {
      case 'heat':
        return [
          makeHeatLayer(aggregateFeatures, opacity.heat, zoom, hoverHandler as Parameters<typeof makeHeatLayer>[3]),
        ].flat();

      case 'cluster':
        return makeClusterLayer(
          pointFeatures as unknown as Parameters<typeof makeClusterLayer>[0],
          opacity.cluster,
          hoverHandler as Parameters<typeof makeClusterLayer>[2],
          clickHandler as Parameters<typeof makeClusterLayer>[3],
        ).flat();

      case 'pin':
        return [
          makePinLayer(
            pointFeatures,
            opacity.pin,
            hoverHandler as Parameters<typeof makePinLayer>[2],
            clickHandler as Parameters<typeof makePinLayer>[3],
          ),
        ];

      case 'district':
        return makeDistrictLayer(
          districtBoundaries as Parameters<typeof makeDistrictLayer>[0],
          aggregateFeatures,
          opacity.district,
          hoverHandler as Parameters<typeof makeDistrictLayer>[3],
          clickHandler as Parameters<typeof makeDistrictLayer>[4],
        ).flat();

      case 'flow':
        return [makeFlowLayer(flowArcs, opacity.flow, hoverHandler as Parameters<typeof makeFlowLayer>[2])];

      default:
        return [];
    }
  }, [
    activeMode, aggregateFeatures, stateFeatures, pointFeatures, flowArcs,
    districtBoundaries, opacity, zoom, hoverHandler, clickHandler,
  ]);
}
