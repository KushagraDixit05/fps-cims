// src/screens/productDemo/Step1_FarmerDetails.tsx
// Product Demo wizard Step 1 — Farmer & Location Details.
// Identical field set to CMM Step1_FarmerDetails. Reuses all the same
// district→block cascading logic and local DB queries.

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
import InlinePicker from '../../components/InlinePicker';
import type {
  DemoFarmerDetailsDraft,
  DemoFarmerDetailsErrors,
} from '../../types/productDemo';
import type { District, Block } from '../../types/cropMonitoring';
import { getDistricts, getBlocks } from '../../api/cropMonitoring';
import { validateStep1, hasErrors } from '../../utils/productDemoValidation';
import { Q } from '@nozbe/watermelondb';
import database from '../../database';
import { DistrictModel } from '../../database/models/DistrictModel';
import { BlockModel }    from '../../database/models/BlockModel';

interface Step1Props {
  data: DemoFarmerDetailsDraft;
  onChange: (data: Partial<DemoFarmerDetailsDraft>) => void;
  onNext: () => void;
}

const Step1_FarmerDetails = ({ data, onChange, onNext }: Step1Props) => {
  const [errors, setErrors] = useState<DemoFarmerDetailsErrors>({});
  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      try {
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
  const blockOptions    = blocks.map(b => ({ value: b.name, label: b.name }));

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
