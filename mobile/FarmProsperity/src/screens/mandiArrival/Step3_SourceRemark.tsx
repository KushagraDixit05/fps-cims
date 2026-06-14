// src/screens/mandiArrival/Step3_SourceRemark.tsx
// Wizard Step 3 — Source of Information & Remark.
// Rendered inside MandiArrivalFormScreen.tsx when step === 3.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../../utils/colors';
import Button from '../../components/Button';
import SmartDropdown from '../../components/SmartDropdown';
import { MANDI_SOURCES, type MandiArrivalSource } from '../../types/mandiArrival';
import { validateStep3, type Step3Errors } from '../../utils/mandiArrivalValidation';

interface Step3Props {
  source: MandiArrivalSource | '';
  customSource: string;
  remark: string;
  onSetSource: (source: MandiArrivalSource) => void;
  onSetCustomSource: (text: string) => void;
  onSetRemark: (text: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step3_SourceRemark = ({
  source, customSource, remark,
  onSetSource, onSetCustomSource, onSetRemark,
  onNext, onBack,
}: Step3Props) => {
  const [errors, setErrors] = useState<Step3Errors>({});

  const handleNext = () => {
    const errs = validateStep3(source, customSource, remark);
    setErrors(errs);
    const hasErrors = Object.values(errs).some(Boolean);
    if (!hasErrors) onNext();
  };

  const sourceOptions = MANDI_SOURCES.map((s) => ({ value: s.value, label: s.label }));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View style={styles.numberCircle}>
            <Text style={styles.numberText}>3</Text>
          </View>
          <Text style={styles.heading}>Source of Information</Text>
        </View>

        {/* Source — SmartDropdown allows custom source when not in the list */}
        <SmartDropdown
          label="Source"
          required
          value={source}
          customValue={customSource}
          options={sourceOptions}
          onSelect={(v) => onSetSource(v as MandiArrivalSource)}
          onCustomChange={onSetCustomSource}
          placeholder="Select Source"
          customMaxLength={100}
          error={errors.source}
          customError={errors.custom_source}
        />

        {/* Remark */}
        <View style={styles.remarkWrapper}>
          <View style={styles.remarkHeader}>
            <Text style={styles.remarkLabel}>Remark</Text>
            <Text style={styles.remarkCounter}>{remark.length}/300</Text>
          </View>
          <TextInput
            style={[styles.remarkInput, errors.remark ? styles.remarkErr : null]}
            value={remark}
            onChangeText={onSetRemark}
            placeholder="Enter remark (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            maxLength={310}
            textAlignVertical="top"
          />
          {errors.remark ? (
            <Text style={styles.errorText}>{errors.remark}</Text>
          ) : null}
        </View>

        {/* Nav row */}
        <View style={styles.navRow}>
          <Button title="BACK" onPress={onBack} variant="secondary" style={styles.navBtn} />
          <Button title="NEXT" onPress={handleNext} style={styles.navBtn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll:         { flex: 1, backgroundColor: colors.background },
  content:        { padding: 20, paddingBottom: 40 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  numberCircle:   { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numberText:     { color: 'white', fontSize: 14, fontWeight: '700' },
  heading:        { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  remarkWrapper:  { marginBottom: 20 },
  remarkHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  remarkLabel:    { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  remarkCounter:  { fontSize: 12, color: colors.textMuted },
  remarkInput:    {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    minHeight: 100,
  },
  remarkErr:      { borderColor: colors.error },
  errorText:      { marginTop: 4, fontSize: 12, color: colors.error },
  navRow:         { flexDirection: 'row', gap: 10 },
  navBtn:         { flex: 1 },
});

export default Step3_SourceRemark;
