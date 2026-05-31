// src/components/ConditionSelector.tsx
// Good / Average / Poor pill-button group for crop condition selection.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../utils/colors';
import type { CropCondition } from '../types/cropMonitoring';

interface ConditionOption {
  value: CropCondition;
  label: string;
  activeColor: string;
  activeBg: string;
}

const OPTIONS: ConditionOption[] = [
  { value: 'good',    label: 'Good',    activeColor: colors.good,    activeBg: colors.goodBg },
  { value: 'average', label: 'Average', activeColor: colors.average, activeBg: colors.averageBg },
  { value: 'poor',    label: 'Poor',    activeColor: colors.poor,    activeBg: colors.poorBg },
];

interface ConditionSelectorProps {
  value: CropCondition | '';
  onChange: (v: CropCondition) => void;
  error?: string;
}

const ConditionSelector = ({ value, onChange, error }: ConditionSelectorProps) => (
  <View style={styles.wrapper}>
    <Text style={styles.label}>
      Crop Condition <Text style={styles.required}>*</Text>
    </Text>

    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.pill,
              isSelected && {
                backgroundColor: opt.activeBg,
                borderColor: opt.activeColor,
              },
            ]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.pillText,
                isSelected && { color: opt.activeColor, fontWeight: '700' },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>

    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.error,
  },
});

export default ConditionSelector;
