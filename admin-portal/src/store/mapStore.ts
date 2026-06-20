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

export interface SelectedRecord {
  id: string;
  module: 'visit' | 'demo' | 'mandi';
  preview?: {
    name?: string;
    village?: string;
    district?: string;
    date?: string;
    condition?: string;
  };
}

interface MapStore {
  viewState:         ViewState;
  mapBounds:         [number, number, number, number] | null;
  cameraZoomBand:    ZoomBand;
  activeMode:        MapMode;
  mapTheme:          'light';
  hoverInfo:         HoverInfo | null;
  selectedFeatureId: string | null;
  selectedLevel:     string | null;
  selectedRecord:    SelectedRecord | null;
  selectedRecordGroup: SelectedRecord[] | null;
  commandPaletteOpen: boolean;
  revealStage:       RevealStage;
  /** Pending camera fly-to; MapCanvas consumes and clears this. */
  flyToTarget:       [number, number, number, number] | null;

  setViewState:           (vs: Partial<ViewState>) => void;
  setMapBounds:           (bounds: [number, number, number, number]) => void;
  setCameraZoomBand:      (band: ZoomBand) => void;
  setActiveMode:          (mode: MapMode) => void;
  setHoverInfo:           (info: HoverInfo | null) => void;
  setSelectedFeature:     (id: string | null, level?: string | null) => void;
  setSelectedRecord:      (rec: SelectedRecord | null) => void;
  setSelectedRecordGroup: (group: SelectedRecord[] | null) => void;
  setCommandPaletteOpen:  (open: boolean) => void;
  setRevealStage:         (stage: RevealStage) => void;
  setFlyToTarget:         (bounds: [number, number, number, number] | null) => void;
}

export const useMapStore = create<MapStore>()(
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
      mapTheme:           'light',
      hoverInfo:           null,
      selectedFeatureId:   null,
      selectedLevel:       null,
      selectedRecord:      null,
      selectedRecordGroup: null,
      commandPaletteOpen:  false,
      revealStage:         0,

      setViewState:           (vs) => set((s) => ({ viewState: { ...s.viewState, ...vs } })),
      setMapBounds:           (bounds) => set({ mapBounds: bounds }),
      setCameraZoomBand:      (band) => set({ cameraZoomBand: band }),
      setActiveMode:          (mode) => set({ activeMode: mode }),
      setHoverInfo:           (info) => set({ hoverInfo: info }),
      setSelectedFeature:     (id, level = null) => set({ selectedFeatureId: id, selectedLevel: level, selectedRecord: null, selectedRecordGroup: null }),
      setSelectedRecord:      (rec) => set({ selectedRecord: rec, selectedFeatureId: null, selectedLevel: null }),
      setSelectedRecordGroup: (group) => set({
        selectedRecordGroup: group,
        // Auto-select only for single-record groups; multi-record → show list first
        selectedRecord: group && group.length === 1 ? group[0] : null,
        selectedFeatureId: null,
        selectedLevel: null,
      }),
      setCommandPaletteOpen:  (open) => set({ commandPaletteOpen: open }),
      setRevealStage:         (stage) => set({ revealStage: stage }),
      flyToTarget:            null,
      setFlyToTarget:         (bounds) => set({ flyToTarget: bounds }),
    }),
);
