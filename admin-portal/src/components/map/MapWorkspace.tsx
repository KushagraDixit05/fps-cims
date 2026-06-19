"use client";

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { MapCanvas }        from './MapCanvas';
import { MapTopBar }        from './chrome/MapTopBar';
import { ModeRail }         from './chrome/ModeRail';
import { FilterRail }       from './chrome/FilterRail';
import { InsightPanel }     from './chrome/InsightPanel';
import { TimelineDock }     from './chrome/TimelineDock';
import { CommandPalette }   from './chrome/CommandPalette';
import { TooltipPortal }    from './tooltips/TooltipPortal';
import { useCameraBand }    from './hooks/useCameraBand';
import { useMapKeyboard }   from './hooks/useMapKeyboard';
import { useMapReveal }     from './hooks/useMapReveal';
import { useMapStore }      from '@/store/mapStore';

function MapInner() {
  useCameraBand();
  useMapKeyboard();
  useMapReveal();
  const mapTheme = useMapStore((s) => s.mapTheme);

  return (
    <div
      data-map-theme={mapTheme}
      style={{ position: 'relative', width: '100vw', height: '100dvh', background: 'var(--map-bg-0)' }}
    >
      {/* WebGL canvas — fills entire container */}
      <MapCanvas />

      {/* Tooltip portal root */}
      <div id="map-tooltip-root" />

      {/* Chrome overlays */}
      <MapTopBar />
      <ModeRail />
      <FilterRail />
      <InsightPanel />
      <TimelineDock />
      <CommandPalette />

      {/* Tooltip rendering */}
      <TooltipPortal />
    </div>
  );
}

export function MapWorkspace() {
  return (
    <QueryClientProvider client={queryClient}>
      <MapInner />
    </QueryClientProvider>
  );
}
