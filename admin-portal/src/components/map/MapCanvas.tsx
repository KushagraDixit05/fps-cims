"use client";
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { useMapStore } from '@/store/mapStore';
import {
  MAP_STYLE_URL,
  INDIA_INITIAL_VIEW,
  INDIA_BOUNDS,
  INDIA_MAX_BOUNDS,
  INDIA_MIN_ZOOM,
  INDIA_MAX_ZOOM,
  mapStyleUrl,
} from '@/lib/mapStyle';
import { useDeckLayers } from './hooks/useDeckLayers';
import { useGeoPoints } from '@/hooks/useGeoData';
import type { GeoPointFeature } from '@/types/geo';

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const overlayRef   = useRef<MapboxOverlay | null>(null);

  const setViewState   = useMapStore((s) => s.setViewState);
  const setMapBounds   = useMapStore((s) => s.setMapBounds);
  const mapTheme       = useMapStore((s) => s.mapTheme);
  const flyToTarget    = useMapStore((s) => s.flyToTarget);
  const setFlyToTarget = useMapStore((s) => s.setFlyToTarget);
  const layers         = useDeckLayers();

  const mapBounds        = useMapStore((s) => s.mapBounds);
  const pointsQ          = useGeoPoints(mapBounds);
  const pointFeaturesRef = useRef<GeoPointFeature[]>([]);
  useEffect(() => {
    pointFeaturesRef.current = (pointsQ.data?.features ?? []) as GeoPointFeature[];
  }, [pointsQ.data]);

  // Init MapLibre + deck.gl overlay
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:   MAP_STYLE_URL,
      center:  [INDIA_INITIAL_VIEW.longitude, INDIA_INITIAL_VIEW.latitude],
      zoom:    INDIA_INITIAL_VIEW.zoom,
      pitch:   INDIA_INITIAL_VIEW.pitch,
      bearing: INDIA_INITIAL_VIEW.bearing,
      // India-only confinement: camera cannot leave India or zoom out to the globe.
      maxBounds: INDIA_MAX_BOUNDS,
      minZoom:   INDIA_MIN_ZOOM,
      maxZoom:   INDIA_MAX_ZOOM,
    });

    mapRef.current = map;

    // Fit India to the viewport on first paint, so it fills the frame instead of
    // relying on the raw center/zoom guess.
    map.once('load', () => {
      map.fitBounds(INDIA_BOUNDS, { padding: 40, duration: 0 });
    });

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    overlayRef.current = overlay;
    map.addControl(overlay as unknown as maplibregl.IControl);

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      const ov = overlayRef.current;
      if (!ov) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const info = (ov as any).pickObject({ x: e.point.x, y: e.point.y, radius: 8 });
      if (!info?.object) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const feat  = info.object as any;
      const props = feat.properties ?? feat;
      const { setSelectedFeature, setSelectedRecordGroup } = useMapStore.getState();

      if (props.module) {
        const pf = pointFeaturesRef.current;
        const [cx, cy] = (feat.geometry?.coordinates ?? [0, 0]) as [number, number];
        const EPSILON = 0.0001;
        const group = pf
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
        setSelectedRecordGroup(group.length > 0 ? group : [{ id: props.id, module: props.module }]);
      } else if (props.id) {
        setSelectedFeature(props.id, 'district');
      }
    };
    map.on('click', handleMapClick);

    const syncState = () => {
      const c = map.getCenter();
      setViewState({
        longitude: c.lng,
        latitude:  c.lat,
        zoom:      map.getZoom(),
        pitch:     map.getPitch(),
        bearing:   map.getBearing(),
      });
      const b = map.getBounds();
      setMapBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    };

    map.on('move', syncState);
    map.on('load', syncState);

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to a requested region when flyToTarget is set by the command palette.
  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    const [west, south, east, north] = flyToTarget;
    mapRef.current.fitBounds([[west, south], [east, north]], { padding: 60, duration: 900, maxZoom: 10 });
    setFlyToTarget(null);
  }, [flyToTarget, setFlyToTarget]);

  // Swap basemap when the theme changes (skip the initial mount — constructor handled it).
  const isFirstThemeRender = useRef(true);
  useEffect(() => {
    if (isFirstThemeRender.current) { isFirstThemeRender.current = false; return; }
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(mapStyleUrl(mapTheme));
    // Re-apply deck layers after MapLibre rebuilds the style (interleaved layers are dropped).
    map.once('styledata', () => {
      overlayRef.current?.setProps({ layers });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapTheme]);

  // Sync deck.gl layers whenever they change
  useEffect(() => {
    overlayRef.current?.setProps({ layers });
  }, [layers]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}
