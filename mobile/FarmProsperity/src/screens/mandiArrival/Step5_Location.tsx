// src/screens/mandiArrival/Step5_Location.tsx
// Wizard Step 5 — GPS Location capture.
// Reuses the shared LocationCapture component identically to CMM Step3.

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
import LocationCapture from '../../components/LocationCapture';
import type { LocationDraft } from '../../types/cropMonitoring';
import { validateStep5, type Step5Errors } from '../../utils/mandiArrivalValidation';

interface Step5Props {
  location: LocationDraft;
  onCapture: (loc: LocationDraft) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step5_Location = ({ location, onCapture, onNext, onBack }: Step5Props) => {
  const [errors, setErrors] = useState<Step5Errors>({});

  const handleNext = () => {
    const errs = validateStep5(location);
    setErrors(errs);
    if (!errs.location) onNext();
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
            <Text style={styles.numberText}>5</Text>
          </View>
          <Text style={styles.heading}>Location Details</Text>
        </View>

        <LocationCapture
          location={location}
          onCapture={onCapture}
          error={errors.location}
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

export default Step5_Location;
