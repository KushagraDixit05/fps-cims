// src/screens/productDemo/Step4_PhotosResultRemark.tsx
// Product Demo wizard Step 4 — Before/After Photos, Demo Result & Remark.

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
import PhotoPicker from '../../components/PhotoPicker';
import DemoResultSelector from '../../components/DemoResultSelector';
import FormInput from '../../components/FormInput';
import type {
  DemoResultDraft,
  Step4Errors,
  PhotoDraft,
  DemoResult,
} from '../../types/productDemo';
import { validateStep4, hasErrors } from '../../utils/productDemoValidation';

interface Step4Props {
  data: DemoResultDraft;
  onAddBeforePhoto: (photo: PhotoDraft) => void;
  onRemoveBeforePhoto: (uri: string) => void;
  onUpdateResult: (data: Partial<DemoResultDraft>) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const Step4_PhotosResultRemark = ({
  data,
  onAddBeforePhoto,
  onRemoveBeforePhoto,
  onUpdateResult,
  onSubmit,
  onBack,
}: Step4Props) => {
  const [errors, setErrors] = useState<Step4Errors>({});

  const handleSubmit = () => {
    const errs = validateStep4(data);
    setErrors(errs);
    if (!hasErrors(errs)) onSubmit();
  };

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
        <View style={styles.sectionHeader}>
          <View style={styles.numberCircle}>
            <Text style={styles.numberText}>4</Text>
          </View>
          <Text style={styles.heading}>Photos, Result & Remark</Text>
        </View>

        {/* Before Photos */}
        <View style={styles.photoSection}>
          <Text style={styles.photoSectionLabel}>
            Photos — Before Demo <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.photoSectionHint}>Minimum 2 photos required</Text>
          <PhotoPicker
            photos={data.before_photos}
            onAdd={onAddBeforePhoto}
            onRemove={onRemoveBeforePhoto}
            minPhotos={2}
            error={errors.before_photos}
          />
        </View>

        {/* Demo Result selector */}
        <DemoResultSelector
          value={data.demo_result}
          onChange={(v: DemoResult) => onUpdateResult({ demo_result: v })}
          error={errors.demo_result}
        />

        {/* Additional Observations */}
        <FormInput
          label="Additional Observations"
          value={data.additional_observations}
          onChangeText={v => onUpdateResult({ additional_observations: v })}
          placeholder="Enter any additional observations (optional)"
          multiline
          numberOfLines={3}
        />

        {/* Remark with char counter */}
        <View style={styles.remarkWrapper}>
          <View style={styles.remarkHeader}>
            <Text style={styles.remarkLabel}>Remark / Notes</Text>
            <Text style={styles.remarkCounter}>{data.remark.length}/500</Text>
          </View>
          <TextInput
            style={[styles.remarkInput, errors.remark ? styles.remarkErr : null]}
            value={data.remark}
            onChangeText={v => onUpdateResult({ remark: v })}
            placeholder="Enter remark or notes (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            maxLength={510}
            textAlignVertical="top"
          />
          {errors.remark ? (
            <Text style={styles.errorText}>{errors.remark}</Text>
          ) : null}
        </View>

        <View style={styles.navRow}>
          <Button title="BACK" onPress={onBack} variant="secondary" style={styles.navBtn} />
          <Button title="REVIEW" onPress={handleSubmit} style={styles.navBtn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: colors.background },
  content:       { padding: 20, paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  numberCircle:  { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numberText:    { color: 'white', fontSize: 14, fontWeight: '700' },
  heading:       { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  required:      { color: colors.error },
  photoSection:  { marginBottom: 8 },
  photoSectionLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginBottom: 2 },
  photoSectionHint:  { fontSize: 11, color: colors.textMuted, marginBottom: 8 },
  remarkWrapper: { marginBottom: 20 },
  remarkHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  remarkLabel:   { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  remarkCounter: { fontSize: 12, color: colors.textMuted },
  remarkInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    minHeight: 100,
  },
  remarkErr:   { borderColor: colors.error },
  errorText:   { marginTop: 4, fontSize: 12, color: colors.error },
  navRow:      { flexDirection: 'row', gap: 10 },
  navBtn:      { flex: 1 },
});

export default Step4_PhotosResultRemark;
