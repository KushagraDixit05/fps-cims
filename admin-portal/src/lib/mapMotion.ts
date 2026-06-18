export const SPRING = {
  tactile: { type: 'spring' as const, stiffness: 520, damping: 32, mass: 0.7 },
  panel:   { type: 'spring' as const, stiffness: 260, damping: 30, mass: 0.9 },
  cinema:  { type: 'spring' as const, stiffness: 170, damping: 26, mass: 1.1 },
  counter: { type: 'spring' as const, stiffness: 90,  damping: 20 },
} as const;

export const CAMERA = {
  flyDuration: 1400,
  flyCurve: 1.42,
  easeStep: 650,
} as const;

export const CONDITION_COLORS: Record<string, [number, number, number, number]> = {
  good:    [52,  224, 138, 255],
  average: [245, 197, 66,  255],
  poor:    [251, 106, 106, 255],
};

export const MODULE_COLORS: Record<string, [number, number, number, number]> = {
  visit: [52,  224, 138, 255],
  mandi: [251, 191, 36,  255],
  demo:  [34,  211, 238, 255],
};

export const CROP_COLORS: Record<string, [number, number, number, number]> = {
  Chilli:  [255, 77,  77,  200],
  Cotton:  [230, 236, 242, 200],
  Soybean: [245, 197, 66,  200],
  Wheat:   [255, 215, 120, 200],
  Rice:    [100, 230, 180, 200],
  Maize:   [255, 180, 60,  200],
};

export const HEAT_RAMP: [number, number, number][] = [
  [0,   0,   0  ],
  [10,  40,  25 ],
  [20,  100, 60 ],
  [34,  180, 100],
  [52,  224, 138],
  [200, 255, 230],
];
