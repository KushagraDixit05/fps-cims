/**
 * Brand color tokens for Farm Prosperity Solutions.
 * All UI components should reference these — never use raw hex strings in components.
 */
export const colors = {
  // ── Brand ────────────────────────────────────────────────────────────────
  primary: '#1A4A2E',       // dark green
  primaryLight: '#E1F2E8',
  primaryMid: '#2A6A44',

  // ── Condition Status ──────────────────────────────────────────────────────
  good: '#1A8A3A',
  goodBg: '#E1F2E8',
  average: '#C8900A',
  averageBg: '#FEF3DA',
  poor: '#D63333',
  poorBg: '#FCEBEB',

  // ── Neutrals ─────────────────────────────────────────────────────────────
  background: '#F8F6F1',
  surface: '#FFFFFF',
  border: '#E0DDD5',
  borderLight: '#F0EDE6',
  textPrimary: '#1A3A25',
  textSecondary: '#6A7A6A',
  textMuted: '#8A8A7A',
  textWhite: '#FFFFFF',

  // ── Info / Links ──────────────────────────────────────────────────────────
  info: '#185FA5',
  infoBg: '#E6F1FB',

  // ── Semantic ─────────────────────────────────────────────────────────────
  error: '#D63333',
  errorBg: '#FCEBEB',
  success: '#1A8A3A',
  successBg: '#E1F2E8',
  warning: '#C8900A',
  warningBg: '#FEF3DA',

  // ── Transparent overlays ─────────────────────────────────────────────────
  overlay: 'rgba(0,0,0,0.4)',
} as const;

export type ColorKey = keyof typeof colors;
