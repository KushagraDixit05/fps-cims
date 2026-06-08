// src/screens/mandiArrival/Step4_Photos.tsx
// Wizard Step 4 — Photo capture (minimum 2 required).
// Reuses the shared PhotoPicker component identically to CMM Step3.

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
import type { PhotoDraft } from '../../types/cropMonitoring';
import { validateStep4, type Step4Errors } from '../../utils/mandiArrivalValidation';

interface Step4Props {
  photos: PhotoDraft[];
  onAdd: (photo: PhotoDraft) => void;
  onRemove: (uri: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step4_Photos = ({ photos, onAdd, onRemove, onNext, onBack }: Step4Props) => {
  const [errors, setErrors] = useState<Step4Errors>({});

  const handleNext = () => {
    const errs = validateStep4(photos);
    setErrors(errs);
    if (!errs.photos) onNext();
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
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View style={styles.numberCircle}>
            <Text style={styles.numberText}>4</Text>
          </View>
          <Text style={styles.heading}>Photos</Text>
        </View>

        <PhotoPicker
          photos={photos}
          onAdd={onAdd}
          onRemove={onRemove}
          minPhotos={2}
          error={errors.photos}
        />

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
  scroll:        { flex: 1, backgroundColor: colors.background },
  content:       { padding: 20, paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  numberCircle:  { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numberText:    { color: 'white', fontSize: 14, fontWeight: '700' },
  heading:       { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  navRow:        { flexDirection: 'row', gap: 10, marginTop: 8 },
  navBtn:        { flex: 1 },
});

export default Step4_Photos;
