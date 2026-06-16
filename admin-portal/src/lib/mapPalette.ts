// Theme-dependent deck.gl layer colors. Pure function — no React, no imports.
// Pass mapTheme from the store; layer factories consume the returned palette.

export interface MapPalette {
  maskFill:       [number, number, number, number];
  outlineColor:   [number, number, number, number];
  heatColorRange: [number, number, number][];
  clusterLabel:   [number, number, number, number];
  districtNoData: [number, number, number, number];
}

const DARK_PALETTE: MapPalette = {
  maskFill:       [5, 8, 10, 245],
  outlineColor:   [140, 220, 170, 90],
  heatColorRange: [
    [0,   0,   0  ],
    [10,  40,  25 ],
    [20,  100, 60 ],
    [34,  180, 100],
    [52,  224, 138],
    [200, 255, 230],
  ],
  clusterLabel:   [5, 8, 10, 255],
  districtNoData: [20, 40, 30, 60],
};

const LIGHT_PALETTE: MapPalette = {
  maskFill:       [244, 246, 248, 235],
  outlineColor:   [40, 120, 80, 110],
  // Light ramp: transparent low density → vivid green → amber → red hot.
  // No black start so it reads cleanly on the light positron basemap.
  heatColorRange: [
    [200, 240, 220],
    [120, 210, 160],
    [52,  180, 110],
    [34,  140, 80 ],
    [31,  174, 107],
    [200, 80,  60 ],
  ],
  clusterLabel:   [245, 247, 249, 255],
  districtNoData: [225, 235, 228, 90],
};

export const mapPalette = (theme: 'dark' | 'light'): MapPalette =>
  theme === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
