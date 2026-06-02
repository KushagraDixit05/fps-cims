// src/components/ProblemCheckboxGroup.tsx
// 6-checkbox grid for Pest / Disease / Weather / Price / Labour / Other.
// "Other" checkbox reveals a free-text input below the grid.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { colors } from '../utils/colors';
import type { ProblemType } from '../types/cropMonitoring';

interface ProblemOption {
  value: ProblemType;
  label: string;
}

const PROBLEMS: ProblemOption[] = [
  { value: 'pest',     label: 'Pest' },
  { value: 'disease',  label: 'Disease' },
  { value: 'weather',  label: 'Weather' },
  { value: 'price',    label: 'Price' },
  { value: 'labour',   label: 'Labour' },
  { value: 'other',    label: 'Other' },
];

interface ProblemCheckboxGroupProps {
  selected: ProblemType[];
  onChange: (selected: ProblemType[]) => void;
  otherDetail: string;
  onOtherDetailChange: (text: string) => void;
  error?: string;
}

const ProblemCheckboxGroup = ({
  selected,
  onChange,
  otherDetail,
  onOtherDetailChange,
  error,
}: ProblemCheckboxGroupProps) => {
  const toggle = (value: ProblemType) => {
    if (selected.includes(value)) {
      onChange(selected.filter((p) => p !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const showOtherInput = selected.includes('other');

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        Problems (Select all that apply) <Text style={styles.required}>*</Text>
      </Text>

      <View style={styles.grid}>
        {PROBLEMS.map((prob) => {
          const isChecked = selected.includes(prob.value);
          return (
            <TouchableOpacity
              key={prob.value}
              style={[styles.checkbox, isChecked && styles.checkboxChecked]}
              onPress={() => toggle(prob.value)}
              activeOpacity={0.75}
            >
              {/* Custom checkbox indicator */}
              <View style={[styles.tick, isChecked && styles.tickChecked]}>
                {isChecked && <Text style={styles.tickMark}>✓</Text>}
              </View>
              <Text style={[styles.checkLabel, isChecked && styles.checkLabelChecked]}>
                {prob.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* "Other problem" free-text — only visible when "Other" is checked */}
      {showOtherInput && (
        <View style={styles.otherInputWrapper}>
          <Text style={styles.otherLabel}>
            Other Problem (Please specify) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.otherInput}
            value={otherDetail}
            onChangeText={onOtherDetailChange}
            placeholder="Enter other problem..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tick: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tickMark: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
  checkLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  checkLabelChecked: {
    color: colors.primary,
    fontWeight: '600',
  },
  otherInputWrapper: {
    marginTop: 10,
  },
  otherLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  otherInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    minHeight: 60,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.error,
  },
});

export default ProblemCheckboxGroup;
