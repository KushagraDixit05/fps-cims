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

  // ── Legacy Crop Entry screens ──────────────────────────────────────────────
  CropEntryForm: undefined;
  CropDetail: { entry: CropEntry };

  // ── Mandi screens ──────────────────────────────────────────────────────────
  MandiEntryForm: undefined;
  MandiDetail: { arrival: MandiArrival };

  // ── Crop Monitoring Module (new) ───────────────────────────────────────────
  /** Entry point — starts fresh wizard (step 1). */
  CropMonitoringForm: undefined;
  /** Review & Confirm screen — wizard state flows via the hook. */
  CropMonitoringReview: undefined;
  /** Post-submit success screen. */
  CropMonitoringSuccess: undefined;
  /** Full visit detail (tapped from dashboard Recent Entries). */
  CropMonitoringDetail: { visitId: string };

  // ── Misc ───────────────────────────────────────────────────────────────────
  Profile: undefined;
};

// ─── Main Bottom Tab Navigator ────────────────────────────────────────────────

export type MainTabParamList = {
  Home: undefined;
  Crops: undefined;
  Mandi: undefined;
  Reports: undefined;
};
