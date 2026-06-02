// src/screens/cropMonitoring/Step3_PhotosLocation.tsx
// Wizard Step 3 — Photos, GPS Location, Remark.

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
import LocationCapture from '../../components/LocationCapture';
import type { PhotoDraft, LocationDraft } from '../../types/cropMonitoring';
import { validateStep3, type Step3Errors } from '../../utils/cropMonitoringValidation';

interface Step3Props {
  photos: PhotoDraft[];
  location: LocationDraft;
  remark: string;
  onAddPhoto: (photo: PhotoDraft) => void;
  onRemovePhoto: (uri: string) => void;
  onSetLocation: (loc: LocationDraft) => void;
  onSetRemark: (text: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const Step3_PhotosLocation = ({
  photos, location, remark,
  onAddPhoto, onRemovePhoto, onSetLocation, onSetRemark,
  onSubmit, onBack,
}: Step3Props) => {
  const [errors, setErrors] = useState<Step3Errors>({});

  const handleSubmit = () => {
    const errs = validateStep3(photos, location, remark);
    setErrors(errs);
    const hasErrors = Object.values(errs).some(Boolean);
    if (!hasErrors) onSubmit();
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
        {/* Section header with circled number */}
        <View style={styles.sectionHeader}>
          <View style={styles.numberCircle}>
            <Text style={styles.numberText}>3</Text>
          </View>
          <Text style={styles.heading}>Photos, Location & Remark</Text>
        </View>

        {/* Photo picker */}
        <PhotoPicker
          photos={photos}
          onAdd={onAddPhoto}
          onRemove={onRemovePhoto}
          minPhotos={2}
          error={errors.photos}
        />

        {/* GPS location */}
        <LocationCapture
          location={location}
          onCapture={onSetLocation}
          error={errors.location}
        />

        {/* Remark textarea */}
        <View style={styles.remarkWrapper}>
          <View style={styles.remarkHeader}>
            <Text style={styles.remarkLabel}>Remark (if any)</Text>
            <Text style={styles.remarkCounter}>{remark.length}/500</Text>
          </View>
          <TextInput
            style={[styles.remarkInput, errors.remark ? styles.remarkErr : null]}
            value={remark}
            onChangeText={onSetRemark}
            placeholder="Enter remark (if any)"
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

        {/* Nav row */}
        <View style={styles.navRow}>
          <Button
            title="BACK"
            onPress={onBack}
            variant="secondary"
            style={styles.navBtn}
          />
          <Button
            title="SUBMIT"
            onPress={handleSubmit}
            style={styles.navBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll:         { flex: 1, backgroundColor: colors.background },
  content:        { padding: 20, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  numberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
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

export default Step3_PhotosLocation;
