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
import { makeIndiaMaskLayer, makeIndiaOutlineLayer } from '../layers/maskLayer';
import { DISTRICTS_GEOJSON_URL } from '@/lib/mapStyle';
import { loadIndiaOutline, buildMaskPolygon, type MaskPolygon } from '@/lib/indiaMask';
import { mapPalette } from '@/lib/mapPalette';
import type { GeoAggregateFeature, GeoPointFeature, FlowArc } from '@/types/geo';

export function useDeckLayers() {
  const activeMode       = useMapStore((s) => s.activeMode);
  const mapBounds        = useMapStore((s) => s.mapBounds);
  const zoom             = useMapStore((s) => s.viewState.zoom);
  const mapTheme         = useMapStore((s) => s.mapTheme);
  const setHoverInfo            = useMapStore((s) => s.setHoverInfo);
  const setSelectedFeature      = useMapStore((s) => s.setSelectedFeature);
  const setSelectedRecordGroup  = useMapStore((s) => s.setSelectedRecordGroup);

  const { opacity } = useCameraBand();

  // Data queries
  const aggregateQ  = useGeoAggregate('district');
  const stateAggQ   = useGeoAggregate('state');
  const pointsQ     = useGeoPoints(mapBounds);
  const flowsQ      = useGeoFlows('mandi');

  // District boundaries (fetched once, cached). Bundled file is plain GeoJSON;
  // still tolerate a TopoJSON source via the env override.
  const [districtBoundaries, setDistrictBoundaries] = useState<object[] | null>(null);
  useEffect(() => {
    if (districtBoundaries) return;
    fetch(DISTRICTS_GEOJSON_URL)
      .then((r) => r.json())
      .then((data) => {
        const features = data?.type === 'Topology'
          ? Object.values(data.objects ?? {}).flatMap(
              (o: unknown) => (o as { geometries?: unknown[] }).geometries ?? [],
            )
          : (data?.features ?? []);
        setDistrictBoundaries(features);
      })
      .catch(() => setDistrictBoundaries([]));
  }, [districtBoundaries]);

  // India outline → fog mask polygon + glowing border (loaded once, cached).
  const [outline, setOutline]     = useState<GeoJSON.FeatureCollection | null>(null);
  const [maskPolygon, setMask]    = useState<MaskPolygon | null>(null);
  useEffect(() => {
    loadIndiaOutline()
      .then((fc) => { setOutline(fc); setMask(buildMaskPolygon(fc)); })
      .catch(() => { setOutline(null); setMask(null); });
  }, []);

  const hoverHandler  = useMemo(() => (info: { object?: unknown; x: number; y: number }) => {
    if (!info.object) { setHoverInfo(null); return; }
    setHoverInfo({ x: info.x, y: info.y, feature: info.object as GeoAggregateFeature, mode: activeMode });
  }, [activeMode, setHoverInfo]);

  // For individual records in any mode: always shows RecordTip (mode='pin').
  const recordHoverHandler = useMemo(() => (info: { object?: unknown; x: number; y: number }) => {
    if (!info.object) { setHoverInfo(null); return; }
    setHoverInfo({ x: info.x, y: info.y, feature: info.object as GeoAggregateFeature, mode: 'pin' });
  }, [setHoverInfo]);

  // For aggregate views (district): opens region summary panel.
  const regionClickHandler = useMemo(() => (info: { object?: unknown }) => {
    if (!info.object) return;
    const feat = info.object as GeoAggregateFeature;
    const id   = feat?.properties?.id ?? (feat as unknown as { properties: { id: string } })?.properties?.id;
    setSelectedFeature(id ?? null, 'district');
  }, [setSelectedFeature]);

  const aggregateFeatures = (aggregateQ.data?.features ?? []) as GeoAggregateFeature[];
  const stateFeatures     = (stateAggQ.data?.features   ?? []) as GeoAggregateFeature[];
  const pointFeatures     = (pointsQ.data?.features     ?? []) as GeoPointFeature[];
  const flowArcs          = (flowsQ.data?.arcs           ?? []) as FlowArc[];

  // For pin/cluster/heat modes: opens individual record detail panel.
  // Collects all co-located features (within ~10m) and sets the group with preview data.
  const recordClickHandler = useMemo(() => (info: { object?: unknown }) => {
    if (!info.object) return;
    const feat = info.object as GeoPointFeature;
    const id     = feat?.properties?.id;
    const module = feat?.properties?.module;
    if (!id || !module) return;

    const [cx, cy] = feat.geometry.coordinates as [number, number];
    const EPSILON = 0.0001;
    const group = pointFeatures
      .filter((f) => {
        const [fx, fy] = f.geometry.coordinates as [number, number];
        return Math.abs(fx - cx) <= EPSILON && Math.abs(fy - cy) <= EPSILON;
      })
      .map((f) => ({
        id: f.properties.id,
        module: f.properties.module,
        preview: {
          name:      f.properties.farmer ?? f.properties.mandi,
          village:   f.properties.village,
          district:  f.properties.district,
          date:      f.properties.date,
          condition: f.properties.condition ?? undefined,
        },
      }));

    setSelectedRecordGroup(group.length > 0 ? group : [{ id, module }]);
  }, [pointFeatures, setSelectedRecordGroup]);

  return useMemo(() => {
    const palette = mapPalette(mapTheme);

    // Pick the data source and opacity for the active mode.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let modeLayers: any[];
    switch (activeMode) {
      case 'heat':
        modeLayers = [
          makeHeatLayer(
            pointFeatures, opacity.heat, zoom,
            hoverHandler as Parameters<typeof makeHeatLayer>[3],
            palette.heatColorRange,
          ),
          // Invisible pick layer so individual records are hoverable/clickable in heat mode.
          makePinLayer(
            pointFeatures, 0,
            recordHoverHandler as Parameters<typeof makePinLayer>[2],
            recordClickHandler as Parameters<typeof makePinLayer>[3],
            'heat-pick',
          ),
        ].flat();
        break;

      case 'cluster':
        modeLayers = makeClusterLayer(
          pointFeatures as unknown as Parameters<typeof makeClusterLayer>[0],
          opacity.cluster,
          recordHoverHandler as Parameters<typeof makeClusterLayer>[2],
          recordClickHandler as Parameters<typeof makeClusterLayer>[3],
          palette.clusterLabel,
        ).flat();
        break;

      case 'pin':
        modeLayers = [
          makePinLayer(
            pointFeatures,
            opacity.pin,
            hoverHandler as Parameters<typeof makePinLayer>[2],
            recordClickHandler as Parameters<typeof makePinLayer>[3],
          ),
        ];
        break;

      case 'district':
        modeLayers = makeDistrictLayer(
          districtBoundaries as Parameters<typeof makeDistrictLayer>[0],
          aggregateFeatures,
          opacity.district,
          hoverHandler as Parameters<typeof makeDistrictLayer>[3],
          regionClickHandler as Parameters<typeof makeDistrictLayer>[4],
          palette.districtNoData,
        ).flat();
        break;

      case 'flow':
        modeLayers = [makeFlowLayer(flowArcs, opacity.flow, hoverHandler as Parameters<typeof makeFlowLayer>[2])];
        break;

      default:
        modeLayers = [];
    }

    // India-only stack: glowing border underneath, mode data, fog mask on top.
    return [
      ...makeIndiaOutlineLayer(outline, palette.outlineColor),
      ...modeLayers,
      ...makeIndiaMaskLayer(maskPolygon, palette.maskFill),
    ];
  }, [
    activeMode, aggregateFeatures, stateFeatures, pointFeatures, flowArcs,
    districtBoundaries, opacity, zoom, hoverHandler, recordHoverHandler,
    regionClickHandler, recordClickHandler,
    outline, maskPolygon, mapTheme,
  ]);
}
