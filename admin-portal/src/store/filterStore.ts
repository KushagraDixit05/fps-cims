import { create } from 'zustand';
import type { GeoFilterState } from '@/types/geo';

const DEFAULT: GeoFilterState = {
  crops:       [],
  products:    [],
  commodities: [],
  mandis:      [],
  modules:     ['visit', 'demo', 'mandi'],
  condition:   null,
  district:    null,
  block:       null,
  village:     null,
  executiveId: null,
  dateFrom:    null,
  dateTo:      null,
};

interface FilterStore extends GeoFilterState {
  toggleCrop:      (crop: string) => void;
  toggleProduct:   (product: string) => void;
  toggleCommodity: (commodity: string) => void;
  toggleMandi:     (mandi: string) => void;
  toggleModule:    (module: string) => void;
  setCondition:    (c: string | null) => void;
  setDistrict:     (d: string | null) => void;
  setBlock:        (b: string | null) => void;
  setVillage:      (v: string | null) => void;
  setDateFrom:     (d: string | null) => void;
  setDateTo:       (d: string | null) => void;
  setExecutiveId:  (id: number | null) => void;
  reset:           () => void;
  queryKey:        () => readonly unknown[];
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  ...DEFAULT,

  toggleCrop: (crop) =>
    set((s) => ({
      crops: s.crops.includes(crop)
        ? s.crops.filter((c) => c !== crop)
        : [...s.crops, crop],
    })),

  toggleProduct: (product) =>
    set((s) => ({
      products: s.products.includes(product)
        ? s.products.filter((p) => p !== product)
        : [...s.products, product],
    })),

  toggleCommodity: (commodity) =>
    set((s) => ({
      commodities: s.commodities.includes(commodity)
        ? s.commodities.filter((c) => c !== commodity)
        : [...s.commodities, commodity],
    })),

  toggleMandi: (mandi) =>
    set((s) => ({
      mandis: s.mandis.includes(mandi)
        ? s.mandis.filter((m) => m !== mandi)
        : [...s.mandis, mandi],
    })),

  toggleModule: (module) =>
    set((s) => ({
      modules: s.modules.includes(module)
        ? s.modules.filter((m) => m !== module)
        : [...s.modules, module],
    })),

  setCondition:   (c) => set({ condition:   c }),
  setDistrict:    (d) => set({ district:    d, block: null, village: null }),
  setBlock:       (b) => set({ block:       b, village: null }),
  setVillage:     (v) => set({ village:     v }),
  setDateFrom:    (d) => set({ dateFrom:    d }),
  setDateTo:      (d) => set({ dateTo:      d }),
  setExecutiveId: (id) => set({ executiveId: id }),
  reset:          () => set({ ...DEFAULT }),

  queryKey: () => {
    const s = get();
    return [
      s.crops.join(','),
      s.products.join(','),
      s.commodities.join(','),
      s.mandis.join(','),
      s.modules.join(','),
      s.condition,
      s.district,
      s.block,
      s.village,
      s.executiveId,
      s.dateFrom,
      s.dateTo,
    ] as const;
  },
}));
