// src/components/DemoResultSelector.tsx
// 5-option radio pill group for product demo result selection.
// Modeled on ConditionSelector.tsx with an extra option.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../utils/colors';
import type { DemoResult } from '../types/productDemo';

interface ResultOption {
  value: DemoResult;
  label: string;
  activeColor: string;
  activeBg: string;
}

const OPTIONS: ResultOption[] = [
  { value: 'excellent', label: 'Excellent', activeColor: '#1A8A3A', activeBg: '#E1F2E8' },
  { value: 'good',      label: 'Good',      activeColor: '#2E7D32', activeBg: '#C8E6C9' },
  { value: 'average',   label: 'Average',   activeColor: colors.average, activeBg: colors.averageBg },
  { value: 'poor',      label: 'Poor',      activeColor: colors.poor,    activeBg: colors.poorBg },
  { value: 'no_effect', label: 'No Effect', activeColor: '#555555',      activeBg: '#EEEEEE' },
];

interface DemoResultSelectorProps {
  value: DemoResult | '';
  onChange: (v: DemoResult) => void;
  error?: string;
}

const DemoResultSelector = ({ value, onChange, error }: DemoResultSelectorProps) => (
  <View style={styles.wrapper}>
    <Text style={styles.label}>
      Demo Result <Text style={styles.required}>*</Text>
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
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  pillText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.error,
  },
});

export default DemoResultSelector;
