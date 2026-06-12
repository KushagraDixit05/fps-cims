// src/screens/productDemo/Step4_PhotosResultRemark.tsx
// Product Demo wizard Step 4 — Before-Demo Photos.
//
// 'Before' submission only. The demo result, after-photos, observations and
// remark are captured later via the deferred After update on the detail screen.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../../utils/colors';
import Button from '../../components/Button';
import PhotoPicker from '../../components/PhotoPicker';
import type {
  DemoResultDraft,
  Step4Errors,
  PhotoDraft,
} from '../../types/productDemo';
import { validateStep4, hasErrors } from '../../utils/productDemoValidation';

interface Step4Props {
  data: DemoResultDraft;
  onAddBeforePhoto: (photo: PhotoDraft) => void;
  onRemoveBeforePhoto: (uri: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const Step4_PhotosResultRemark = ({
  data,
  onAddBeforePhoto,
  onRemoveBeforePhoto,
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
          <Text style={styles.heading}>Before Demo Photos</Text>
        </View>

        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            Capture the crop condition before the demo. The result and
            after-demo photos can be added later from the demo details once this
            entry has synced.
          </Text>
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  numberCircle:  { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numberText:    { color: 'white', fontSize: 14, fontWeight: '700' },
  heading:       { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  required:      { color: colors.error },
  infoBanner:    { backgroundColor: '#EAF4FF', borderRadius: 8, padding: 12, marginBottom: 18 },
  infoText:      { fontSize: 12, color: '#1B5E9B', lineHeight: 17 },
  photoSection:  { marginBottom: 8 },
  photoSectionLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginBottom: 2 },
  photoSectionHint:  { fontSize: 11, color: colors.textMuted, marginBottom: 8 },
  navRow:      { flexDirection: 'row', gap: 10 },
  navBtn:      { flex: 1 },
});

export default Step4_PhotosResultRemark;
