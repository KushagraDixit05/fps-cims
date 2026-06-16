import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MapMode, HoverInfo } from '@/types/geo';

interface ViewState {
  longitude: number;
  latitude:  number;
  zoom:      number;
  pitch:     number;
  bearing:   number;
}

type ZoomBand = 0 | 1 | 2 | 3 | 4;
type RevealStage = 0 | 1 | 2 | 3;

interface MapStore {
  viewState:         ViewState;
  mapBounds:         [number, number, number, number] | null;
  cameraZoomBand:    ZoomBand;
  activeMode:        MapMode;
  mapTheme:          'dark' | 'light';
  hoverInfo:         HoverInfo | null;
  selectedFeatureId: string | null;
  selectedLevel:     string | null;
  commandPaletteOpen: boolean;
  revealStage:       RevealStage;
  /** Pending camera fly-to; MapCanvas consumes and clears this. */
  flyToTarget:       [number, number, number, number] | null;

  setViewState:         (vs: Partial<ViewState>) => void;
  setMapBounds:         (bounds: [number, number, number, number]) => void;
  setCameraZoomBand:    (band: ZoomBand) => void;
  setActiveMode:        (mode: MapMode) => void;
  setMapTheme:          (t: 'dark' | 'light') => void;
  toggleMapTheme:       () => void;
  setHoverInfo:         (info: HoverInfo | null) => void;
  setSelectedFeature:   (id: string | null, level?: string | null) => void;
  setCommandPaletteOpen:(open: boolean) => void;
  setRevealStage:       (stage: RevealStage) => void;
  setFlyToTarget:       (bounds: [number, number, number, number] | null) => void;
}

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      viewState: {
        longitude: 78.9,
        latitude:  20.5,
        zoom:      4.0,
        pitch:     0,
        bearing:   0,
      },
      mapBounds:          null,
      cameraZoomBand:     0,
      activeMode:         'heat',
      mapTheme:           'dark',
      hoverInfo:          null,
      selectedFeatureId:  null,
      selectedLevel:      null,
      commandPaletteOpen: false,
      revealStage:        0,

      setViewState:         (vs) => set((s) => ({ viewState: { ...s.viewState, ...vs } })),
      setMapBounds:         (bounds) => set({ mapBounds: bounds }),
      setCameraZoomBand:    (band) => set({ cameraZoomBand: band }),
      setActiveMode:        (mode) => set({ activeMode: mode }),
      setMapTheme:          (t) => set({ mapTheme: t }),
      toggleMapTheme:       () => set((s) => ({ mapTheme: s.mapTheme === 'dark' ? 'light' : 'dark' })),
      setHoverInfo:         (info) => set({ hoverInfo: info }),
      setSelectedFeature:   (id, level = null) => set({ selectedFeatureId: id, selectedLevel: level }),
      setCommandPaletteOpen:(open) => set({ commandPaletteOpen: open }),
      setRevealStage:       (stage) => set({ revealStage: stage }),
      flyToTarget:          null,
      setFlyToTarget:       (bounds) => set({ flyToTarget: bounds }),
    }),
    {
      name: 'fps-map',
      partialize: (s) => ({ mapTheme: s.mapTheme }),
    },
  ),
);
