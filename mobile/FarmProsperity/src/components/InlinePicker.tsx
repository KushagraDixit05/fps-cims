// src/components/InlinePicker.tsx
// Shared inline dropdown picker used across wizard steps.
// Extracted from Step1_FarmerDetails.tsx so it can be reused in
// the Mandi Arrival module and any future wizard steps.
// Design tokens: colors.border, colors.primary, colors.primaryLight.

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

export interface PickerOption {
  value: string;
  label: string;
}

interface InlinePickerProps {
  label: string;
  value: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

const InlinePicker = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select…',
  disabled = false,
  error,
  required = false,
}: InlinePickerProps) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.req}> *</Text>}
      </Text>
      <View>
        <View
          style={[
            styles.trigger,
            !!error && styles.triggerErr,
            disabled && styles.disabled,
          ]}
          onTouchEnd={() => !disabled && setOpen((p) => !p)}
        >
          <Text style={[styles.triggerTxt, !selected && styles.placeholder]}>
            {selected ? selected.label : placeholder}
          </Text>
          <Text style={styles.arrow}>{open ? '▲' : '▼'}</Text>
        </View>

        {open && (
          <View style={styles.dropdown}>
            {options.map((opt) => (
              <View
                key={opt.value}
                style={[
                  styles.option,
                  opt.value === value && styles.optSelected,
                ]}
                onTouchEnd={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.optTxt,
                    opt.value === value && styles.optTxtSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper:         { marginBottom: 14 },
  label:           { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginBottom: 6 },
  req:             { color: colors.error },
  trigger:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, backgroundColor: colors.surface },
  triggerErr:      { borderColor: colors.error },
  disabled:        { backgroundColor: colors.background, opacity: 0.6 },
  triggerTxt:      { fontSize: 14, color: colors.textPrimary, flex: 1 },
  placeholder:     { color: colors.textMuted },
  arrow:           { fontSize: 11, color: colors.textMuted },
  dropdown:        { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, marginTop: 2, overflow: 'hidden', elevation: 4, zIndex: 100 },
  option:          { paddingVertical: 11, paddingHorizontal: 14 },
  optSelected:     { backgroundColor: colors.primaryLight },
  optTxt:          { fontSize: 14, color: colors.textPrimary },
  optTxtSelected:  { color: colors.primary, fontWeight: '600' },
  err:             { marginTop: 4, fontSize: 12, color: colors.error },
});

export default InlinePicker;
