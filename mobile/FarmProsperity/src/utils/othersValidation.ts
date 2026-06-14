// src/utils/othersValidation.ts
// Single source of truth for the "Others (Please specify)" pattern across all modules.
// SmartDropdown, all form hooks, validation utils, and operations.ts import from here.

/** Sentinel stored in form state when "Others (Please specify)" is selected. Never persisted to DB. */
export const OTHERS_VALUE = '__others__';

/** Display label appended to every SmartDropdown option list. */
export const OTHERS_LABEL = 'Others (Please specify)';

/**
 * Trims whitespace and truncates to maxLength.
 * Call before persisting custom values.
 */
export function sanitizeOthersInput(value: string, maxLength = 100): string {
  return value.trim().slice(0, maxLength);
}

/**
 * Validates the custom text entered when Others is selected.
 * Returns an error string, or null if valid.
 */
export function validateOthersInput(
  customValue: string,
  label = 'This field',
  minLength = 2,
  maxLength = 100,
): string | null {
  const t = customValue.trim();
  if (!t) return `${label} is required when "Others" is selected.`;
  if (t.length < minLength) return `${label}: enter at least ${minLength} characters.`;
  if (t.length > maxLength) return `${label}: cannot exceed ${maxLength} characters.`;
  return null;
}

/**
 * Resolves a (dropdown value, custom text) pair to the final string for submission.
 * When value is OTHERS_VALUE, returns the trimmed custom text (never the sentinel).
 */
export function resolveOthersValue(value: string, customValue: string): string {
  if (value === OTHERS_VALUE) {
    return customValue.trim() || 'Others';
  }
  return value.trim();
}
