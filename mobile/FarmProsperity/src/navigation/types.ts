/**
 * Navigation type definitions.
 * Provides type safety for route params across all screens.
 */

import type { CropEntry, MandiArrival } from '../types';

// ─── Auth Stack (pre-login screens) ──────────────────────────────────────────

export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Signup: undefined;
  Login: undefined;
};

// ─── Root Stack (includes Auth + App) ────────────────────────────────────────

export type RootStackParamList = {
  // Auth flow container (v2 navigator only)
  Auth: undefined;
  // Legacy auth (v1 navigator)
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
  /** List of all past field visits. */
  CropMonitoringList: undefined;
  /** Review & Confirm screen — wizard state flows via the hook. */
  CropMonitoringReview: undefined;
  /** Post-submit success screen. */
  CropMonitoringSuccess: undefined;
  /** Full visit detail (tapped from dashboard Recent Entries). */
  CropMonitoringDetail: { visitId: string };

  // ── Mandi Arrival Module (new) ──────────────────────────────────────────────
  /** Entry point — launches 5-step mandi arrival wizard. */
  MandiArrivalForm: undefined;

  // ── Product Demo Module (new) ────────────────────────────────────────────────
  /** Entry point — lists past product demos */
  ProductDemoList: undefined;
  /** Entry point — launches 4-step product demo wizard. */
  ProductDemoForm: undefined;
  /** Full demo detail (tapped from history). */
  ProductDemoDetail: { demoId: string };

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
