// src/screens/cropMonitoring/Step2_CropDetails.tsx
// Wizard Step 2 — dynamic list of CropCard components.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../../utils/colors';
import Button from '../../components/Button';
import CropCard from '../../components/CropCard';
import type { CropRecordDraft, CropRecordErrors, CropMaster } from '../../types/cropMonitoring';
import { getCropMaster } from '../../api/cropMonitoring';
import { validateStep2, hasCropErrors } from '../../utils/cropMonitoringValidation';

interface Step2Props {
  crops: CropRecordDraft[];
  onUpdate: (localKey: string, data: Partial<CropRecordDraft>) => void;
  onAdd: () => void;
  onRemove: (localKey: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2_CropDetails = ({
  crops, onUpdate, onAdd, onRemove, onNext, onBack,
}: Step2Props) => {
  const scrollRef = useRef<ScrollView>(null);
  const [cropMaster, setCropMaster] = useState<CropMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [cropErrors, setCropErrors] = useState<Map<string, CropRecordErrors>>(new Map());

  useEffect(() => {
    getCropMaster()
      .then(setCropMaster)
      .catch(() => { /* crops array stays empty; user sees no options */ })
      .finally(() => setLoading(false));
  }, []);

  const handleAddCrop = () => {
    onAdd();
    // Scroll to bottom after render so the new card is visible
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleNext = () => {
    console.log('[Step2] handleNext called. Crop count:', crops.length);
    console.log('[Step2] Crop data snapshot:', JSON.stringify(crops.map(c => ({
      localKey: c.localKey,
      crop_name: c.crop_name,
      variety: c.variety,
      date_of_sowing: c.date_of_sowing,
      current_area_acre: c.current_area_acre,
      this_year_area_acre: c.this_year_area_acre,
      crop_stage: c.crop_stage,
      crop_condition: c.crop_condition,
      problems: c.problems,
    })), null, 2));

    try {
      const errs = validateStep2(crops);
      console.log('[Step2] Validation complete. Errors:', errs.size > 0 ? Object.fromEntries(errs) : 'none');
      setCropErrors(errs);
      if (!hasCropErrors(errs)) {
        console.log('[Step2] Validation passed → advancing to Step 3.');
        onNext();
      } else {
        console.warn('[Step2] Validation failed — showing error alert.');
        Alert.alert(
          'Fix Errors',
          'Please fix all errors in the crop cards before continuing.',
        );
      }
    } catch (e) {
      console.error('[Step2] Unexpected error during validation:', e);
      Alert.alert('Error', 'An unexpected error occurred. Please restart the form and try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loaderText}>Loading crop data…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>STEP 2 OF 3</Text>
        <Text style={styles.heading}>Crop Details</Text>
        <Text style={styles.subtext}>
          Add details for each crop grown by this farmer.
        </Text>

        {crops.map((crop, i) => (
          <CropCard
            key={crop.localKey}
            index={i + 1}
            data={crop}
            cropMaster={cropMaster}
            onChange={data => onUpdate(crop.localKey, data)}
            onDelete={i === 0 ? undefined : () => onRemove(crop.localKey)}
            errors={cropErrors.get(crop.localKey) ?? {}}
          />
        ))}

        {/* Add Crop button */}
        <TouchableOpacity style={styles.addCropBtn} onPress={handleAddCrop}>
          <Text style={styles.addCropIcon}>+</Text>
          <Text style={styles.addCropText}>ADD ANOTHER CROP</Text>
        </TouchableOpacity>

        <View style={styles.navRow}>
          <Button
            title="← BACK"
            onPress={onBack}
            variant="secondary"
            style={styles.navBtn}
          />
          <Button
            title="NEXT →"
            onPress={handleNext}
            style={styles.navBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  loader:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.background },
  loaderText:   { fontSize: 14, color: colors.textSecondary },
  scroll:       { flex: 1, backgroundColor: colors.background },
  content:      { padding: 16, paddingBottom: 40 },
  stepLabel:    { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 4, paddingHorizontal: 4 },
  heading:      { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 4, paddingHorizontal: 4 },
  subtext:      { fontSize: 13, color: colors.textSecondary, marginBottom: 16, paddingHorizontal: 4 },
  addCropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 8,
    backgroundColor: colors.primaryLight,
  },
  addCropIcon:  { fontSize: 18, color: colors.primary, fontWeight: '700' },
  addCropText:  { fontSize: 13, color: colors.primary, fontWeight: '700', letterSpacing: 0.5 },
  navRow:       { flexDirection: 'row', gap: 10 },
  navBtn:       { flex: 1 },
});

export default Step2_CropDetails;
