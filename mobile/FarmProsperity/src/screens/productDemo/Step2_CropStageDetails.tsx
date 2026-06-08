// src/screens/productDemo/Step2_CropStageDetails.tsx
// Product Demo wizard Step 2 — Crop & Stage Details.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { colors } from '../../utils/colors';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import InlinePicker from '../../components/InlinePicker';
import SmartDropdown, { OTHERS_VALUE } from '../../components/SmartDropdown';
import type { CropStageDraft, CropStageErrors } from '../../types/productDemo';
import type { CropMaster } from '../../types/cropMonitoring';
import { validateStep2, hasErrors } from '../../utils/productDemoValidation';
import database from '../../database';
import { CropMasterModel } from '../../database/models/CropMasterModel';
import { getCropMaster } from '../../api/cropMonitoring';

// ── Stage options ──────────────────────────────────────────────────────────────

const STAGE_OPTIONS = [
  { value: 'seedling',     label: 'Seedling' },
  { value: 'vegetative',  label: 'Vegetative' },
  { value: 'flowering',   label: 'Flowering' },
  { value: 'fruiting',    label: 'Fruiting' },
  { value: 'harvesting',  label: 'Harvesting' },
  { value: 'post_harvest', label: 'Post Harvest' },
];

// ── Date helpers ──────────────────────────────────────────────────────────────

const isValidDate = (d: Date): boolean =>
  d instanceof Date && !isNaN(d.getTime());

const parseDate = (s: string): Date | null => {
  if (!s || !s.trim()) return null;
  try {
    const d = new Date(s.trim() + 'T12:00:00');
    return isValidDate(d) ? d : null;
  } catch {
    return null;
  }
};

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Step2Props {
  data: CropStageDraft;
  onChange: (data: Partial<CropStageDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2_CropStageDetails = ({ data, onChange, onNext, onBack }: Step2Props) => {
  const [errors, setErrors] = useState<CropStageErrors>({});
  const [cropMaster, setCropMaster] = useState<CropMaster[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const local = await database.collections
          .get<CropMasterModel>('crop_master')
          .query()
          .fetch();

        if (local.length > 0) {
          setCropMaster(
            local.map((c) => ({
              id:        c.serverId,
              crop_name: c.cropName,
              varieties: JSON.parse(c.varietiesJson || '[]'),
            })),
          );
        } else {
          const apiData = await getCropMaster();
          setCropMaster(apiData);
        }
      } catch { /* silently fall back to empty */ }
      finally { setLoadingMaster(false); }
    };
    load();
  }, []);

  const handleCropSelect = (cropName: string) => {
    onChange({ crop_name: cropName, variety: '', custom_variety: '' });
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed') return;
    if (date && isValidDate(date)) {
      onChange({ demo_date: toISODate(date) });
    }
  };

  const handleNext = () => {
    const errs = validateStep2(data);
    setErrors(errs);
    if (!hasErrors(errs)) onNext();
  };

  const cropOptions = cropMaster.map(c => ({ value: c.crop_name, label: c.crop_name }));
  const selectedCropMaster = cropMaster.find(c => c.crop_name === data.crop_name);
  const varietyOptions = [
    ...(selectedCropMaster?.varieties ?? []).map(v => ({
      value: v.variety_name,
      label: v.variety_name,
    })),
    ...(selectedCropMaster ? [{ value: 'Others', label: 'Others (enter manually)' }] : []),
  ];

  const parsedDate = parseDate(data.demo_date);
  const displayDate = parsedDate
    ? parsedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

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
            <Text style={styles.numberText}>2</Text>
          </View>
          <Text style={styles.heading}>Crop & Stage Details</Text>
        </View>

        {loadingMaster && (
          <View style={styles.masterLoader}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.masterLoaderText}>Loading crops…</Text>
          </View>
        )}

        <InlinePicker
          label="Crop"
          required
          value={data.crop_name}
          options={cropOptions}
          onSelect={handleCropSelect}
          placeholder={loadingMaster ? 'Loading…' : 'Select crop…'}
          disabled={loadingMaster}
          error={errors.crop_name}
        />

        {/* Variety — SmartDropdown handles Others + custom text */}
        <SmartDropdown
          label="Variety"
          required
          value={data.variety}
          customValue={data.custom_variety}
          options={varietyOptions}
          onSelect={v => onChange({ variety: v, custom_variety: v !== OTHERS_VALUE ? '' : data.custom_variety })}
          onCustomChange={v => onChange({ custom_variety: v })}
          placeholder={data.crop_name ? 'Select variety…' : 'Select crop first…'}
          disabled={!data.crop_name}
          error={errors.variety}
          customError={errors.custom_variety}
        />

        <InlinePicker
          label="Crop Stage"
          required
          value={data.crop_stage}
          options={STAGE_OPTIONS}
          onSelect={v => onChange({ crop_stage: v as any })}
          placeholder="Select crop stage…"
          error={errors.crop_stage}
        />

        <FormInput
          label="Crop Stage (In Days)"
          required
          value={data.crop_stage_days}
          onChangeText={v => onChange({ crop_stage_days: v })}
          placeholder="e.g. 45"
          keyboardType="number-pad"
          error={errors.crop_stage_days}
        />

        {/* Demo Date — date picker trigger */}
        <View style={styles.dateWrapper}>
          <Text style={styles.dateLabel}>
            Demo Date <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.dateTrigger, errors.demo_date ? styles.dateTriggerErr : null]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateTriggerText, !displayDate && styles.placeholder]}>
              {displayDate || 'Select demo date…'}
            </Text>
            <Text style={styles.calIcon}>📅</Text>
          </TouchableOpacity>
          {errors.demo_date ? (
            <Text style={styles.errorText}>{errors.demo_date}</Text>
          ) : null}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={parsedDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

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
  masterLoader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  masterLoaderText: { fontSize: 12, color: colors.textMuted },
  dateWrapper:   { marginBottom: 14 },
  dateLabel:     { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginBottom: 6 },
  required:      { color: colors.error },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    backgroundColor: colors.surface,
  },
  dateTriggerErr:  { borderColor: colors.error },
  dateTriggerText: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  placeholder:     { color: colors.textMuted },
  calIcon:         { fontSize: 16 },
  errorText:       { marginTop: 4, fontSize: 12, color: colors.error },
  navRow:          { flexDirection: 'row', gap: 10 },
  navBtn:          { flex: 1 },
});

export default Step2_CropStageDetails;
