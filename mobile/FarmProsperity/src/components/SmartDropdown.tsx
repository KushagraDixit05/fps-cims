// src/components/SmartDropdown.tsx
// Enterprise-standard reusable dropdown with built-in "Others (Please specify)" fallback.
//
// BEHAVIOR:
//   Case A — options exist:   show options list + "Others (Please specify)" appended
//   Case B — options empty:   auto-select "Others", show text field immediately
//
// This is the official FPS platform pattern for all master data dropdowns.
// Used for: Village, Variety, and any future dependent master fields.
//
// Styling: extends InlinePicker tokens (colors, border, radius, padding).

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { colors } from '../utils/colors';
import InlinePicker, { type PickerOption } from './InlinePicker';

// Sentinel value used internally to represent "Others" selection.
// Never stored to DB — parent receives it and stores custom text instead.
export const OTHERS_VALUE = '__others__';
export const OTHERS_LABEL = 'Others (Please specify)';

export interface SmartDropdownProps {
  label: string;
  /** Current selected value (from options, or OTHERS_VALUE when Others is active). */
  value: string;
  /** The custom text typed by the user when Others is selected. */
  customValue: string;
  /** Master data options. May be empty — see Case B behavior. */
  options: PickerOption[];

  /** Called when a dropdown option is selected (including OTHERS_VALUE). */
  onSelect: (value: string) => void;
  /** Called when the user types in the custom text field. */
  onCustomChange: (text: string) => void;

  placeholder?: string;
  /** Show activity indicator state while options are being fetched. */
  loading?: boolean;
  disabled?: boolean;

  required?: boolean;
  /** Error message shown on the dropdown trigger. */
  error?: string;
  /** Error message shown on the custom text field. */
  customError?: string;

  /** Max length for custom text. Default: 100. */
  customMaxLength?: number;
}

const SmartDropdown = ({
  label,
  value,
  customValue,
  options,
  onSelect,
  onCustomChange,
  placeholder,
  loading = false,
  disabled = false,
  required = false,
  error,
  customError,
  customMaxLength = 100,
}: SmartDropdownProps) => {
  // ── Auto-select Others when options list is empty (Case B) ──────────────────
  const prevLoadingRef = useRef(loading);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;

    // Only fire auto-select once loading completes and we find no options.
    // Avoid firing on every render or when disabled (no block selected yet).
    if (!disabled && wasLoading && !loading && options.length === 0 && value !== OTHERS_VALUE) {
      onSelect(OTHERS_VALUE);
    }
  }, [loading, options.length, disabled, value, onSelect]);

  // ── Reveal animation for the custom text field ────────────────────────────
  const revealAnim = useRef(new Animated.Value(value === OTHERS_VALUE ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(revealAnim, {
      toValue: value === OTHERS_VALUE ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, revealAnim]);

  // ── Build displayed options (master list + Others appended) ───────────────
  const allOptions: PickerOption[] = [
    ...options,
    { value: OTHERS_VALUE, label: OTHERS_LABEL },
  ];

  // Displayed placeholder adapts to context
  const resolvedPlaceholder =
    loading ? 'Loading…'
    : disabled ? placeholder ?? 'Select…'
    : options.length === 0 ? OTHERS_LABEL  // Case B: hint that Others is auto-active
    : placeholder ?? 'Select…';

  const showCustomField = value === OTHERS_VALUE;

  const maxHeight = revealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 90],
  });
  const opacity = revealAnim;

  return (
    <View style={styles.wrapper}>
      <InlinePicker
        label={label}
        value={value}
        options={allOptions}
        onSelect={onSelect}
        placeholder={resolvedPlaceholder}
        disabled={disabled || loading}
        required={required}
        error={error}
      />

      {/* Custom text field — animated reveal */}
      <Animated.View style={[styles.customFieldWrap, { maxHeight, opacity }]}>
        {showCustomField && (
          <View style={styles.customFieldInner}>
            <TextInput
              style={[styles.customInput, !!customError && styles.customInputErr]}
              value={customValue}
              onChangeText={onCustomChange}
              placeholder={`Enter ${label.toLowerCase()}…`}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              returnKeyType="done"
              maxLength={customMaxLength}
              autoFocus={Platform.OS === 'android'}
            />
            {!!customError && (
              <Text style={styles.customErrTxt}>{customError}</Text>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 0 },

  customFieldWrap: {
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 14,
  },
  customFieldInner: {
    paddingBottom: 2,
  },
  customInput: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  customInputErr: {
    borderColor: colors.error,
  },
  customErrTxt: {
    marginTop: 4,
    fontSize: 12,
    color: colors.error,
  },
});

export default SmartDropdown;
