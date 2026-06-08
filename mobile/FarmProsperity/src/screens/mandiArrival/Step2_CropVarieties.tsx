// src/screens/mandiArrival/Step2_CropVarieties.tsx
// Wizard Step 2 — Repeatable Crop Variety cards.
// Each card captures: variety name, quantity (Qt), top/mostly/bottom rate.
// Mirrors the Step2_CropDetails.tsx pattern from the Crop Monitoring Module.

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
import FormInput from '../../components/FormInput';
import InlinePicker from '../../components/InlinePicker';
import type { CropVarietyDraft, CropVarietyErrors } from '../../types/mandiArrival';
import type { CropMaster } from '../../types/cropMonitoring';
import { validateStep2, hasVarietyErrors } from '../../utils/mandiArrivalValidation';
import database from '../../database';
import { CropMasterModel } from '../../database/models/CropMasterModel';
import { getCropMaster } from '../../api/cropMonitoring';

// ── VarietyCard ───────────────────────────────────────────────────────────────

interface VarietyCardProps {
  index: number;
  data: CropVarietyDraft;
  cropMaster: CropMaster[];
  onChange: (data: Partial<CropVarietyDraft>) => void;
  onDelete?: () => void;
  errors: CropVarietyErrors;
}

const VarietyCard = ({
  index, data, cropMaster, onChange, onDelete, errors,
}: VarietyCardProps) => {
  // Build flat list of all varieties across all crops for the picker
  const varietyOptions = cropMaster.flatMap((c) =>
    c.varieties.map((v) => ({
      value: v.variety_name,
      label: `${c.crop_name} — ${v.variety_name}`,
    })),
  );

  return (
    <View style={card.container}>
      {/* Card header */}
      <View style={card.header}>
        <View style={card.badge}>
          <Text style={card.badgeText}>{index}</Text>
        </View>
        <Text style={card.title}>Crop Variety</Text>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={card.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={card.deleteIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <InlinePicker
        label="Crop Variety Name"
        required
        value={data.crop_variety_name}
        options={varietyOptions}
        onSelect={(v) => onChange({ crop_variety_name: v })}
        placeholder="Select crop variety"
        error={errors.crop_variety_name}
      />

      <FormInput
        label="Crop Arrival Quantity (in Quintal)"
        required
        value={data.quantity_qt}
        onChangeText={(v) => onChange({ quantity_qt: v })}
        placeholder="Enter quantity in quintal"
        keyboardType="decimal-pad"
        error={errors.quantity_qt}
      />

      {/* Rate section */}
      <Text style={card.rateLabel}>Crop Rate (₹ per Quintal)</Text>
      <View style={card.rateRow}>
        <View style={card.rateField}>
          <FormInput
            label="Top Rate"
            required
            value={data.top_rate}
            onChangeText={(v) => onChange({ top_rate: v })}
            placeholder="Rate"
            keyboardType="decimal-pad"
            error={errors.top_rate}
          />
        </View>
        <View style={card.rateField}>
          <FormInput
            label="Mostly Sales Rate"
            required
            value={data.mostly_sales_rate}
            onChangeText={(v) => onChange({ mostly_sales_rate: v })}
            placeholder="Rate"
            keyboardType="decimal-pad"
            error={errors.mostly_sales_rate}
          />
        </View>
        <View style={card.rateField}>
          <FormInput
            label="Bottom Rate"
            required
            value={data.bottom_rate}
            onChangeText={(v) => onChange({ bottom_rate: v })}
            placeholder="Rate"
            keyboardType="decimal-pad"
            error={errors.bottom_rate}
          />
        </View>
      </View>
    </View>
  );
};

const card = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  badge:     { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  title:     { fontSize: 14, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 14, color: colors.error, fontWeight: '700' },
  rateLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rateRow:   { flexDirection: 'row', gap: 8 },
  rateField: { flex: 1 },
});

// ── Step2 ─────────────────────────────────────────────────────────────────────

interface Step2Props {
  varieties: CropVarietyDraft[];
  onUpdate: (localKey: string, data: Partial<CropVarietyDraft>) => void;
  onAdd: () => void;
  onRemove: (localKey: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2_CropVarieties = ({
  varieties, onUpdate, onAdd, onRemove, onNext, onBack,
}: Step2Props) => {
  const scrollRef = useRef<ScrollView>(null);
  const [cropMaster, setCropMaster] = useState<CropMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [varietyErrors, setVarietyErrors] = useState<Map<string, CropVarietyErrors>>(new Map());
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const loadCropMaster = async () => {
      try {
        // Offline-first: local DB → API fallback
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
          const apiCrops = await getCropMaster();
          setCropMaster(apiCrops);
        }
      } catch {
        // stays empty; user types free text
      } finally {
        setLoading(false);
      }
    };
    loadCropMaster();
  }, []);

  const handleAddVariety = () => {
    onAdd();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleNext = () => {
    if (isValidating) return;
    setIsValidating(true);
    try {
      const errs = validateStep2(varieties);
      setVarietyErrors(errs);
      if (!hasVarietyErrors(errs)) {
        setTimeout(() => {
          onNext();
          setIsValidating(false);
        }, 150);
      } else {
        setIsValidating(false);
        Alert.alert('Fix Errors', 'Please fix all errors in the variety cards before continuing.');
      }
    } catch {
      setIsValidating(false);
      Alert.alert('Error', 'An unexpected error occurred. Please restart the form.');
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
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View style={styles.numberCircle}>
            <Text style={styles.numberText}>2</Text>
          </View>
          <Text style={styles.heading}>Crop Variety Details</Text>
        </View>

        {varieties.map((v, i) => (
          <VarietyCard
            key={v.localKey}
            index={i + 1}
            data={v}
            cropMaster={cropMaster}
            onChange={(data) => onUpdate(v.localKey, data)}
            onDelete={i === 0 ? undefined : () => onRemove(v.localKey)}
            errors={varietyErrors.get(v.localKey) ?? {}}
          />
        ))}

        {/* Add Another Variety — dashed border, same as CMM "ADD ANOTHER CROP" */}
        <TouchableOpacity style={styles.addBtn} onPress={handleAddVariety}>
          <View style={styles.addIconCircle}>
            <Text style={styles.addIconText}>+</Text>
          </View>
          <Text style={styles.addText}>ADD ANOTHER VARIETY</Text>
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
            title={isValidating ? 'VALIDATING…' : 'NEXT'}
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
  loader:        { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.background },
  loaderText:    { fontSize: 14, color: colors.textSecondary },
  scroll:        { flex: 1, backgroundColor: colors.background },
  content:       { padding: 16, paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  numberCircle:  { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numberText:    { color: 'white', fontSize: 14, fontWeight: '700' },
  heading:       { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  addBtn: {
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
  addIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconText:   { fontSize: 16, color: colors.primary, fontWeight: '700', lineHeight: 18 },
  addText:       { fontSize: 13, color: colors.primary, fontWeight: '700', letterSpacing: 0.5 },
  navRow:        { flexDirection: 'row', gap: 10 },
  navBtn:        { flex: 1 },
});

export default Step2_CropVarieties;
