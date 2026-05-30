/**
 * Navigation type definitions.
 * Provides type safety for route params across all screens.
 */

import type { CropEntry, MandiArrival } from '../types';

// ─── Root Stack (includes Auth + App) ────────────────────────────────────────

export type RootStackParamList = {
  // Auth
  Login: undefined;

  // Main tab container
  Main: undefined;

  // Detail / Form screens pushed on top of tabs
  CropEntryForm: undefined;
  CropDetail: { entry: CropEntry };
  MandiEntryForm: undefined;
  MandiDetail: { arrival: MandiArrival };
  Profile: undefined;
};

// ─── Main Bottom Tab Navigator ────────────────────────────────────────────────

export type MainTabParamList = {
  Home: undefined;
  Crops: undefined;
  Mandi: undefined;
  Reports: undefined;
};
