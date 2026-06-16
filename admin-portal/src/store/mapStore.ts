import { create } from 'zustand';
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
  mapBounds:         [number, number, number, number] | null; // [west, south, east, north]
  cameraZoomBand:    ZoomBand;
  activeMode:        MapMode;
  hoverInfo:         HoverInfo | null;
  selectedFeatureId: string | null;
  selectedLevel:     string | null;   // 'district' | 'state' | 'block'
  commandPaletteOpen: boolean;
  revealStage:       RevealStage;

  setViewState:         (vs: Partial<ViewState>) => void;
  setMapBounds:         (bounds: [number, number, number, number]) => void;
  setCameraZoomBand:    (band: ZoomBand) => void;
  setActiveMode:        (mode: MapMode) => void;
  setHoverInfo:         (info: HoverInfo | null) => void;
  setSelectedFeature:   (id: string | null, level?: string | null) => void;
  setCommandPaletteOpen:(open: boolean) => void;
  setRevealStage:       (stage: RevealStage) => void;
}

export const useMapStore = create<MapStore>((set) => ({
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
  hoverInfo:          null,
  selectedFeatureId:  null,
  selectedLevel:      null,
  commandPaletteOpen: false,
  revealStage:        0,

  setViewState:         (vs) => set((s) => ({ viewState: { ...s.viewState, ...vs } })),
  setMapBounds:         (bounds) => set({ mapBounds: bounds }),
  setCameraZoomBand:    (band) => set({ cameraZoomBand: band }),
  setActiveMode:        (mode) => set({ activeMode: mode }),
  setHoverInfo:         (info) => set({ hoverInfo: info }),
  setSelectedFeature:   (id, level = null) => set({ selectedFeatureId: id, selectedLevel: level }),
  setCommandPaletteOpen:(open) => set({ commandPaletteOpen: open }),
  setRevealStage:       (stage) => set({ revealStage: stage }),
}));
