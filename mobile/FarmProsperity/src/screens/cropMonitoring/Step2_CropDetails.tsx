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
import database from '../../database';
import { CropMasterModel } from '../../database/models/CropMasterModel';

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
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const loadCropMaster = async () => {
      try {
        // Phase 3: load from local DB first (works offline)
        const localCrops = await database.collections
          .get<CropMasterModel>('crop_master')
          .query()
          .fetch();

        if (localCrops.length > 0) {
          setCropMaster(
            localCrops.map((c) => ({
              id:        c.serverId,
              crop_name: c.cropName,
              varieties: JSON.parse(c.varietiesJson || '[]'),
            })),
          );
        } else {
          // Cache empty — try API
          const apiCrops = await getCropMaster();
          setCropMaster(apiCrops);
        }
      } catch {
        // crops array stays empty; user sees no options in dropdowns
      } finally {
        setLoading(false);
      }
    };
    loadCropMaster();
  }, []);

  const handleAddCrop = () => {
    onAdd();
    // Scroll to bottom after render so the new card is visible
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleNext = () => {
    if (isValidating) {
      return;
    }

    setIsValidating(true);

    try {
      const errs = validateStep2(crops);
      setCropErrors(errs);

      if (!hasCropErrors(errs)) {
        // Small delay to ensure any open native pickers are fully closed
        // before unmounting this component. Prevents JNI crashes on some Android builds.
        setTimeout(() => {
          onNext();
          setIsValidating(false);
        }, 150);
      } else {
        setIsValidating(false);
        Alert.alert('Fix Errors', 'Please fix all errors in the crop cards before continuing.');
      }
    } catch (e) {
      setIsValidating(false);
      Alert.alert('Error', 'An unexpected error occurred. Please restart the form and try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loaderText}>Loading crop data...</Text>
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
        {/* Section header with circled number */}
        <View style={styles.sectionHeader}>
          <View style={styles.numberCircle}>
            <Text style={styles.numberText}>2</Text>
          </View>
          <Text style={styles.heading}>Crop Details</Text>
        </View>

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

        {/* Add Another Crop button — dashed border, wireframe style */}
        <TouchableOpacity style={styles.addCropBtn} onPress={handleAddCrop}>
          <View style={styles.addCropIconCircle}>
            <Text style={styles.addCropIconText}>+</Text>
          </View>
          <Text style={styles.addCropText}>ADD ANOTHER CROP</Text>
        </TouchableOpacity>

        {/* Nav row */}
        <View style={styles.navRow}>
          <Button
            title="BACK"
            onPress={onBack}
            variant="secondary"
            style={styles.navBtn}
            disabled={isValidating}
          />
          <Button
            title={isValidating ? "VALIDATING..." : "NEXT"}
            onPress={handleNext}
            style={styles.navBtn}
            disabled={isValidating}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
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
  },
  addCropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 10,
    backgroundColor: colors.primaryLight,
  },
  addCropIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCropIconText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
    lineHeight: 18,
  },
  addCropText:  { fontSize: 13, color: colors.primary, fontWeight: '700', letterSpacing: 0.5 },
  navRow:       { flexDirection: 'row', gap: 10 },
  navBtn:       { flex: 1 },
});

export default Step2_CropDetails;
