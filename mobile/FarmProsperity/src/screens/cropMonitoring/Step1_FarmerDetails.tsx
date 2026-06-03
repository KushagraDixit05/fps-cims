// src/screens/cropMonitoring/Step1_FarmerDetails.tsx
// Wizard Step 1 — Farmer Basic Details form sub-component.
// Rendered inside CropMonitoringFormScreen.tsx when step === 1.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../utils/colors';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import type { FarmerDetailsDraft, FarmerDetailsErrors, District, Block } from '../../types/cropMonitoring';
import { getDistricts, getBlocks } from '../../api/cropMonitoring';
import { validateStep1, hasErrors } from '../../utils/cropMonitoringValidation';
import { Q } from '@nozbe/watermelondb';
import database from '../../database';
import { DistrictModel } from '../../database/models/DistrictModel';
import { BlockModel }    from '../../database/models/BlockModel';

// Simple inline dropdown (reuse the same pattern as CropCard.tsx)
interface PickerProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

const InlinePicker = ({
  label, value, options, onSelect,
  placeholder = 'Select…', disabled = false, error, required = false,
}: PickerProps) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View style={picker.wrapper}>
      <Text style={picker.label}>
        {label}{required && <Text style={picker.req}> *</Text>}
      </Text>
      <View>
        <View
          style={[picker.trigger, !!error && picker.triggerErr, disabled && picker.disabled]}
          onTouchEnd={() => !disabled && setOpen(p => !p)}
        >
          <Text style={[picker.triggerTxt, !selected && picker.placeholder]}>
            {selected ? selected.label : placeholder}
          </Text>
          <Text style={picker.arrow}>{open ? '▲' : '▼'}</Text>
        </View>
        {open && (
          <View style={picker.dropdown}>
            {options.map(opt => (
              <View
                key={opt.value}
                style={[picker.option, opt.value === value && picker.optSelected]}
                onTouchEnd={() => { onSelect(opt.value); setOpen(false); }}
              >
                <Text style={[picker.optTxt, opt.value === value && picker.optTxtSelected]}>
                  {opt.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {error ? <Text style={picker.err}>{error}</Text> : null}
    </View>
  );
};

const picker = StyleSheet.create({
  wrapper:       { marginBottom: 14 },
  label:         { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginBottom: 6 },
  req:           { color: colors.error },
  trigger:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, backgroundColor: colors.surface },
  triggerErr:    { borderColor: colors.error },
  disabled:      { backgroundColor: colors.background, opacity: 0.6 },
  triggerTxt:    { fontSize: 14, color: colors.textPrimary, flex: 1 },
  placeholder:   { color: colors.textMuted },
  arrow:         { fontSize: 11, color: colors.textMuted },
  dropdown:      { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, marginTop: 2, overflow: 'hidden', elevation: 4, zIndex: 100 },
  option:        { paddingVertical: 11, paddingHorizontal: 14 },
  optSelected:   { backgroundColor: colors.primaryLight },
  optTxt:        { fontSize: 14, color: colors.textPrimary },
  optTxtSelected:{ color: colors.primary, fontWeight: '600' },
  err:           { marginTop: 4, fontSize: 12, color: colors.error },
});

// ── Step1 ──────────────────────────────────────────────────────────────────────

interface Step1Props {
  data: FarmerDetailsDraft;
  onChange: (data: Partial<FarmerDetailsDraft>) => void;
  onNext: () => void;
}

const Step1_FarmerDetails = ({ data, onChange, onNext }: Step1Props) => {
  const [errors, setErrors] = useState<FarmerDetailsErrors>({});
  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Selected district ID for block filtering
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      try {
        // Phase 3: load from local DB first (works offline)
        const localDistricts = await database.collections
          .get<DistrictModel>('districts')
          .query()
          .fetch();

        if (localDistricts.length > 0) {
          setDistricts(
            localDistricts.map((d) => ({
              id:    d.serverId,
              name:  d.name,
              state: d.state ?? '',
            })),
          );
        } else {
          // Cache empty — try API
          const dists = await getDistricts();
          setDistricts(dists);
        }
      } catch { /* silently fall back to empty */ }
      finally { setLoadingMaster(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedDistrictId === undefined) return;

    const loadBlocks = async () => {
      try {
        // Phase 3: load from local DB first (works offline)
        const localBlocks = await database.collections
          .get<BlockModel>('blocks')
          .query(Q.where('district_server_id', selectedDistrictId))
          .fetch();

        if (localBlocks.length > 0) {
          setBlocks(
            localBlocks.map((b) => ({
              id:            b.serverId,
              name:          b.name,
              district:      b.districtServerId,
              district_name: b.districtName ?? '',
            })),
          );
        } else {
          // Cache empty — try API
          const apiBlocks = await getBlocks(selectedDistrictId);
          setBlocks(apiBlocks);
        }
      } catch {
        setBlocks([]);
      }
    };

    loadBlocks();
  }, [selectedDistrictId]);

  const handleDistrictSelect = (districtName: string) => {
    const district = districts.find(d => d.name === districtName);
    onChange({ district_name: districtName, block_name: '' });
    setSelectedDistrictId(district?.id);
    setBlocks([]);
  };

  const handleNext = () => {
    const errs = validateStep1(data);
    setErrors(errs);
    if (!hasErrors(errs)) onNext();
  };

  const districtOptions = districts.map(d => ({ value: d.name, label: d.name }));
  const blockOptions = blocks.map(b => ({ value: b.name, label: b.name }));

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
        <Text style={styles.stepLabel}>STEP 1 OF 3</Text>
        <Text style={styles.heading}>Farmer Details</Text>
        <Text style={styles.subtext}>Enter the basic information for this field visit.</Text>

        {loadingMaster && (
          <View style={styles.masterLoader}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.masterLoaderText}>Loading master data…</Text>
          </View>
        )}

        <FormInput
          label="Farmer Name"
          required
          value={data.farmer_name}
          onChangeText={v => onChange({ farmer_name: v })}
          placeholder="e.g. Suresh Singh"
          error={errors.farmer_name}
          autoCapitalize="words"
        />

        <FormInput
          label="Mobile Number"
          required
          value={data.mobile_number}
          onChangeText={v => onChange({ mobile_number: v })}
          placeholder="10-digit number"
          keyboardType="number-pad"
          maxLength={10}
          error={errors.mobile_number}
        />

        <FormInput
          label="Village Name"
          required
          value={data.village_name}
          onChangeText={v => onChange({ village_name: v })}
          placeholder="e.g. Rampura"
          error={errors.village_name}
          autoCapitalize="words"
        />

        <InlinePicker
          label="District"
          required
          value={data.district_name}
          options={districtOptions}
          onSelect={handleDistrictSelect}
          placeholder={loadingMaster ? 'Loading…' : 'Select district…'}
          disabled={loadingMaster}
          error={errors.district_name}
        />

        <InlinePicker
          label="Block / Taluka"
          required
          value={data.block_name}
          options={blockOptions}
          onSelect={v => onChange({ block_name: v })}
          placeholder={data.district_name ? 'Select block…' : 'Select district first…'}
          disabled={!data.district_name || blocks.length === 0}
          error={errors.block_name}
        />

        <FormInput
          label="Total Land (Acre)"
          required
          value={data.total_land_acre}
          onChangeText={v => onChange({ total_land_acre: v })}
          placeholder="e.g. 10.50"
          keyboardType="decimal-pad"
          error={errors.total_land_acre}
        />

        <View style={{ height: 16 }} />
        <Button title="NEXT" onPress={handleNext} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll:     { flex: 1, backgroundColor: colors.background },
  content:    { padding: 20, paddingBottom: 40 },
  stepLabel:  { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  heading:    { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  subtext:    { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  masterLoader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  masterLoaderText: { fontSize: 12, color: colors.textMuted },
});

export default Step1_FarmerDetails;
