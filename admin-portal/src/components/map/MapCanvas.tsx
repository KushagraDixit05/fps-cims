"use client";
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { useMapStore } from '@/store/mapStore';
import { MAP_STYLE_URL, INDIA_INITIAL_VIEW } from '@/lib/mapStyle';
import { useDeckLayers } from './hooks/useDeckLayers';

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const overlayRef   = useRef<MapboxOverlay | null>(null);

  const setViewState   = useMapStore((s) => s.setViewState);
  const setMapBounds   = useMapStore((s) => s.setMapBounds);
  const layers         = useDeckLayers();

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
    });

    mapRef.current = map;

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    overlayRef.current = overlay;
    map.addControl(overlay as unknown as maplibregl.IControl);

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

  // Sync deck.gl layers whenever they change
  useEffect(() => {
    overlayRef.current?.setProps({ layers });
  }, [layers]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}
