"use client";
import { useEffect } from 'react';
import { useMapStore } from '@/store/mapStore';

export type ZoomBand = 0 | 1 | 2 | 3 | 4;

/** Maps zoom level → band and emits pitch suggestion. */
export function zoomToBand(zoom: number): ZoomBand {
  if (zoom < 5.0)  return 0; // heat / state
  if (zoom < 6.5)  return 1; // state→district transition
  if (zoom < 8.5)  return 2; // district choropleth
  if (zoom < 10.5) return 3; // village clusters
  return 4;                  // record pins
}

/** Opacity ramp 0–1 for each band given current zoom. */
export function bandOpacity(zoom: number): Record<string, number> {
  return {
    heat:     zoom < 7 ? 1 : Math.max(0, 1 - (zoom - 7) / 2),
    cluster:  zoom >= 4 && zoom < 11 ? 1 : 0,
    pin:      zoom >= 4.5 ? Math.min(1, (zoom - 4.5) / 1.5) : 0,
    district: zoom >= 5 && zoom < 10 ? 1 : 0,
    flow:     1,
  };
}

export function useCameraBand() {
  const zoom         = useMapStore((s) => s.viewState.zoom);
  const setCamBand   = useMapStore((s) => s.setCameraZoomBand);
  const setVS        = useMapStore((s) => s.setViewState);

  useEffect(() => {
    const band = zoomToBand(zoom);
    setCamBand(band);
    // Auto-add pitch when zoomed in to record level
    if (band === 4) setVS({ pitch: 35 });
    else            setVS({ pitch: 0 });
  }, [zoom, setCamBand, setVS]);

  return { band: zoomToBand(zoom), opacity: bandOpacity(zoom) };
}
