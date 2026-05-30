import { colors } from './colors';
import type { CropCondition, CropStage } from '../types';

/**
 * Format an ISO date string (YYYY-MM-DD or full ISO) into a human-readable form.
 * @example formatDate('2025-06-15') → '15 Jun 2025'
 */
export const formatDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

/**
 * Format a number as Indian Rupees.
 * @example formatCurrency(1234) → '₹1,234'
 */
export const formatCurrency = (value?: number | null): string => {
  if (value == null) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
};

/**
 * Format a decimal area value with 2 decimal places + unit.
 * @example formatArea(2.5) → '2.50 Ac'
 */
export const formatArea = (value?: number | null): string => {
  if (value == null) return '—';
  return `${Number(value).toFixed(2)} Ac`;
};

/**
 * Format a quantity in Quintal.
 * @example formatQuantity(1500) → '1,500 Qt'
 */
export const formatQuantity = (value?: number | null): string => {
  if (value == null) return '—';
  return `${Number(value).toLocaleString('en-IN')} Qt`;
};

/**
 * Map crop condition to the brand color for that state.
 */
export const conditionColor = (condition: CropCondition) => {
  const map: Record<CropCondition, string> = {
    good: colors.good,
    average: colors.average,
    poor: colors.poor,
  };
  return map[condition] ?? colors.textMuted;
};

/**
 * Map crop condition to its background color.
 */
export const conditionBgColor = (condition: CropCondition) => {
  const map: Record<CropCondition, string> = {
    good: colors.goodBg,
    average: colors.averageBg,
    poor: colors.poorBg,
  };
  return map[condition] ?? colors.borderLight;
};

/**
 * Human-readable label for crop stage.
 */
export const cropStageLabel = (stage: CropStage): string => {
  const map: Record<CropStage, string> = {
    seedling: 'Seedling',
    vegetative: 'Vegetative',
    flowering: 'Flowering',
    fruiting: 'Fruiting',
    harvesting: 'Harvesting',
    post_harvest: 'Post Harvest',
  };
  return map[stage] ?? stage;
};

/**
 * Human-readable label for crop condition.
 */
export const conditionLabel = (cond: CropCondition): string => {
  const map: Record<CropCondition, string> = {
    good: 'Good',
    average: 'Average',
    poor: 'Poor',
  };
  return map[cond] ?? cond;
};

/**
 * Return today's date as a YYYY-MM-DD string (for default form values).
 */
export const todayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Validate that a string is a plausible mobile number (India).
 */
export const isValidPhone = (phone: string): boolean =>
  /^[6-9]\d{9}$/.test(phone.trim());

/**
 * Truncate a string to maxLen characters, appending '…' if needed.
 */
export const truncate = (str: string, maxLen = 40): string =>
  str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
