// src/screens/productDemo/Step1_FarmerDetails.tsx
// Product Demo wizard Step 1 — Farmer & Location Details.
// District → Block → Village cascade using useLocationHierarchy.
// Village uses SmartDropdown (Others fallback for empty/custom villages).

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { colors } from '../../utils/colors';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import InlinePicker from '../../components/InlinePicker';
import SmartDropdown from '../../components/SmartDropdown';
import { OTHERS_VALUE } from '../../utils/othersValidation';
import type { DemoFarmerDetailsDraft, DemoFarmerDetailsErrors } from '../../types/productDemo';
import { validateStep1, hasErrors } from '../../utils/productDemoValidation';
import { useLocationHierarchy } from '../../hooks/useLocationHierarchy';

interface Step1Props {
  data: DemoFarmerDetailsDraft;
  onChange: (data: Partial<DemoFarmerDetailsDraft>) => void;
  onNext: () => void;
}

const Step1_FarmerDetails = ({ data, onChange, onNext }: Step1Props) => {
  const [errors, setErrors] = useState<DemoFarmerDetailsErrors>({});

  const {
    districts, blocks, villages,
    loadingDistricts, loadingBlocks, loadingVillages,
    handleDistrictSelect, handleBlockSelect,
  } = useLocationHierarchy(data.district_name, data.block_name);

  const handleNext = () => {
    const errs = validateStep1(data);
    setErrors(errs);
    if (!hasErrors(errs)) onNext();
  };

  const districtOptions = districts.map(d => ({ value: d.name, label: d.name }));
  const blockOptions    = blocks.map(b => ({ value: b.name, label: b.name }));
  const villageOptions  = villages.map(v => ({ value: v.name, label: v.name }));

  // ── Block SmartDropdown handlers ───────────────────────────────────────────
  const handleBlockSmartSelect = (val: string) => {
    if (val === OTHERS_VALUE) {
      onChange({ block_name: OTHERS_VALUE, custom_block_name: '', village_name: '', village_id: null, custom_village_name: '' });
    } else {
      onChange({ block_name: val, custom_block_name: '' });
      handleBlockSelect(val, onChange);
    }
  };

  // ── Village SmartDropdown handlers ──────────────────────────────────────────
  const handleVillageSmartSelect = (val: string) => {
    if (val === OTHERS_VALUE) {
      onChange({ village_name: OTHERS_VALUE, village_id: null });
    } else {
      const village = villages.find(v => v.name === val);
      onChange({
        village_name:        val,
        village_id:          village?.id ?? null,
        custom_village_name: '',
      });
    }
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
        <Text style={styles.stepLabel}>STEP 1 OF 4</Text>
        <Text style={styles.heading}>Farmer & Location Details</Text>
        <Text style={styles.subtext}>Enter the basic information for this demo visit.</Text>

        {loadingDistricts && (
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

        <InlinePicker
          label="District"
          required
          value={data.district_name}
          options={districtOptions}
          onSelect={name => handleDistrictSelect(name, onChange)}
          placeholder={loadingDistricts ? 'Loading…' : 'Select district…'}
          disabled={loadingDistricts}
          error={errors.district_name}
        />

        {/* Block — SmartDropdown allows custom entry when block not in master list */}
        <SmartDropdown
          label="Block / Taluka"
          required
          value={data.block_name}
          customValue={data.custom_block_name ?? ''}
          options={blockOptions}
          onSelect={handleBlockSmartSelect}
          onCustomChange={text => onChange({ custom_block_name: text })}
          placeholder={
            !data.district_name ? 'Select district first…'
            : loadingBlocks ? 'Loading blocks…'
            : 'Select block…'
          }
          loading={loadingBlocks}
          disabled={!data.district_name}
          error={errors.block_name}
          customError={errors.custom_block_name}
        />

        {/* Village — SmartDropdown handles empty list (Others auto-select) */}
        {/* Disabled when block is Others — no real block ID to cascade from */}
        <SmartDropdown
          label="Village"
          required
          value={data.village_name}
          customValue={data.custom_village_name}
          options={villageOptions}
          onSelect={handleVillageSmartSelect}
          onCustomChange={text => onChange({ custom_village_name: text })}
          placeholder={
            !data.block_name || data.block_name === OTHERS_VALUE ? 'Select block first…'
            : 'Select village…'
          }
          loading={loadingVillages}
          disabled={!data.block_name || data.block_name === OTHERS_VALUE}
          error={errors.village_name}
          customError={errors.custom_village_name}
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
  scroll:           { flex: 1, backgroundColor: colors.background },
  content:          { padding: 20, paddingBottom: 40 },
  stepLabel:        { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  heading:          { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  subtext:          { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  masterLoader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  masterLoaderText: { fontSize: 12, color: colors.textMuted },
});

export default Step1_FarmerDetails;
