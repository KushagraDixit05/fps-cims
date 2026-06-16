import { create } from 'zustand';
import type { TimelineBucket } from '@/types/geo';

interface TimelineStore {
  playing:     boolean;
  currentDate: string | null;
  speed:       1 | 2 | 4;
  buckets:     TimelineBucket[];

  setPlaying:     (p: boolean) => void;
  setCurrentDate: (d: string | null) => void;
  setSpeed:       (s: 1 | 2 | 4) => void;
  setBuckets:     (b: TimelineBucket[]) => void;
}

export const useTimelineStore = create<TimelineStore>((set) => ({
  playing:     false,
  currentDate: null,
  speed:       1,
  buckets:     [],

  setPlaying:     (p) => set({ playing: p }),
  setCurrentDate: (d) => set({ currentDate: d }),
  setSpeed:       (s) => set({ speed: s }),
  setBuckets:     (b) => set({ buckets: b }),
}));
