// src/screens/mandiArrival/Step4_PhotosLocation.tsx
// Wizard Step 4 — Photos + Location (merged from old Steps 4 & 5).
// Photos: minimum 2 required. Location: OPTIONAL.
// Reuses shared PhotoPicker and LocationCapture components.

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
import LocationCapture from '../../components/LocationCapture';
import type { PhotoDraft, LocationDraft } from '../../types/cropMonitoring';
import { validateStep4, type Step4Errors } from '../../utils/mandiArrivalValidation';

interface Step4Props {
  photos: PhotoDraft[];
  location: LocationDraft;
  onAddPhoto: (photo: PhotoDraft) => void;
  onRemovePhoto: (uri: string) => void;
  onCaptureLocation: (loc: LocationDraft) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step4_PhotosLocation = ({
  photos,
  location,
  onAddPhoto,
  onRemovePhoto,
  onCaptureLocation,
  onNext,
  onBack,
}: Step4Props) => {
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
        {/* ── Photos Section ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.numberCircle}>
            <Text style={styles.numberText}>4</Text>
          </View>
          <Text style={styles.heading}>Photos & Location</Text>
        </View>

        <Text style={styles.subLabel}>
          Photos <Text style={styles.required}>*</Text>
        </Text>
        <Text style={styles.hint}>Minimum 2 photos required</Text>

        <PhotoPicker
          photos={photos}
          onAdd={onAddPhoto}
          onRemove={onRemovePhoto}
          minPhotos={2}
          error={errors.photos}
        />

        {/* ── Location Section ── */}
        <View style={styles.locationSection}>
          <Text style={styles.subLabel}>GPS Location</Text>
          <Text style={styles.hint}>Optional — capture your current location</Text>

          <LocationCapture
            location={location}
            onCapture={onCaptureLocation}
          />
        </View>

        {/* Nav row */}
        <View style={styles.navRow}>
          <Button title="BACK" onPress={onBack} variant="secondary" style={styles.navBtn} />
          <Button title="REVIEW" onPress={handleNext} style={styles.navBtn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll:          { flex: 1, backgroundColor: colors.background },
  content:         { padding: 20, paddingBottom: 40 },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  numberCircle:    { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numberText:      { color: 'white', fontSize: 14, fontWeight: '700' },
  heading:         { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  subLabel:        { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginBottom: 2 },
  hint:            { fontSize: 11, color: colors.textMuted, marginBottom: 8 },
  required:        { color: colors.error },
  locationSection: { marginTop: 24 },
  navRow:          { flexDirection: 'row', gap: 10, marginTop: 12 },
  navBtn:          { flex: 1 },
});

export default Step4_PhotosLocation;
