// src/utils/headerTokens.ts
// FPS Enterprise Compact Header Design Tokens
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all screen header spacing, sizing, and typography.
// ALL new screens MUST use these tokens instead of hardcoding paddingTop values.
//
// Before: paddingTop: 48–52 → ~90–100dp of green dead-space
// After:  paddingTop: 28    → ~20dp recovered per screen = 1+ row of content
//
// COMPACT_HEADER_REQUIRED — search for this tag to audit compliance.

export const HEADER = {
  // ── Safe area ────────────────────────────────────────────────────────────
  // Calibrated Android status bar offset (24dp standard + 4dp notch buffer).
  // Covers: OnePlus 11R, standard 1080p devices, punch-hole cameras.
  // Edge case (status bar > 32dp): use StatusBar.currentHeight as a follow-up.
  STATUS_BAR_OFFSET: 28,

  // ── Archetype A — Dashboard Header (HomeScreen) ──────────────────────────
  DASHBOARD_PADDING_TOP:    28,   // was 52
  DASHBOARD_PADDING_BOTTOM: 12,   // was 20
  AVATAR_SIZE:              36,   // was 40 (circle diameter, px)
  AVATAR_FONT:              15,   // was 18 (initial letter)
  ROLE_FONT:                15,   // was 18
  GREETING_FONT:            12,   // was 13
  REGION_FONT:              11,   // unchanged

  // ── Archetype B — Module + Wizard Header ─────────────────────────────────
  MODULE_PADDING_TOP:       28,   // was 48–52
  MODULE_PADDING_BOTTOM:    10,   // was 14

  // Back button — 32px circle; outer TouchableOpacity adds 6px padding → 44dp tappable
  BACK_BTN_SIZE:            32,

  // ── Shared typography ─────────────────────────────────────────────────────
  TITLE_FONT:    18,   // was 20
  SUBTITLE_FONT: 12,   // was 13

  // ── HomeScreen summary strip ──────────────────────────────────────────────
  SUMMARY_TILE_PADDING_V: 10,   // was 14

  // ── Section headers (Quick Actions, Recent Visits labels) ─────────────────
  SECTION_HEADER_PADDING_TOP: 12,   // was 18
} as const;
