// src/screens/mandiArrival/Step1_MandiDetails.tsx
// Wizard Step 1 — Mandi picker, Date, Total Arrival.
// Rendered inside MandiArrivalFormScreen.tsx when step === 1.

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
import type { MandiDetailsDraft, MandiDetailsErrors } from '../../types/mandiArrival';
import { validateStep1, hasMandiDetailsErrors } from '../../utils/mandiArrivalValidation';
import { todayISO } from '../../utils/helpers';
import { Q } from '@nozbe/watermelondb';
import database from '../../database';
import { MandiModel } from '../../database/models/MandiModel';
import { getMandis } from '../../api/mandi';
import type { Mandi } from '../../types';

interface Step1Props {
  data: MandiDetailsDraft;
  onChange: (data: Partial<MandiDetailsDraft>) => void;
  onNext: () => void;
}

const Step1_MandiDetails = ({ data, onChange, onNext }: Step1Props) => {
  const [errors, setErrors] = useState<MandiDetailsErrors>({});
  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [loading, setLoading] = useState(true);

  // Populate today's date as default if not already set
  useEffect(() => {
    if (!data.date) {
      onChange({ date: todayISO() });
    }
  }, []);

  // Load mandis from local DB first (offline-first), API fallback
  useEffect(() => {
    const load = async () => {
      try {
        const localMandis = await database.collections
          .get<MandiModel>('mandis')
          .query(Q.where('is_active', true))
          .fetch();

        if (localMandis.length > 0) {
          setMandis(
            localMandis.map((m) => ({
              id:        m.serverId,
              name:      m.name,
              district:  m.district ?? '',
              state:     m.state ?? '',
              is_active: m.isActive,
            })),
          );
        } else {
          // Cache empty — try API
          const apiMandis = await getMandis();
          setMandis(apiMandis);
        }
      } catch {
        // silently fall back to empty list
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleMandiSelect = (mandiId: string) => {
    const mandi = mandis.find((m) => String(m.id) === mandiId);
    onChange({ mandi_id: mandiId, mandi_name: mandi?.name ?? '' });
  };

  const handleNext = () => {
    const errs = validateStep1(data);
    setErrors(errs);
    if (!hasMandiDetailsErrors(errs)) onNext();
  };

  const mandiOptions = mandis.map((m) => ({
    value: String(m.id),
    label: m.district ? `${m.name} (${m.district})` : m.name,
  }));

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
            <Text style={styles.numberText}>1</Text>
          </View>
          <Text style={styles.heading}>Mandi Details</Text>
        </View>

        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loaderText}>Loading mandis…</Text>
          </View>
        )}

        <InlinePicker
          label="Mandi Name"
          required
          value={data.mandi_id}
          options={mandiOptions}
          onSelect={handleMandiSelect}
          placeholder={loading ? 'Loading mandis…' : 'Select Mandi'}
          disabled={loading}
          error={errors.mandi_id}
        />

        <FormInput
          label="Date"
          required
          value={data.date}
          onChangeText={(v) => onChange({ date: v })}
          placeholder="YYYY-MM-DD"
          error={errors.date}
        />

        <FormInput
          label="Total Arrival (All Crops)"
          required
          value={data.total_arrival_qt}
          onChangeText={(v) => onChange({ total_arrival_qt: v })}
          placeholder="Enter total arrival in quintal"
          keyboardType="decimal-pad"
          error={errors.total_arrival_qt}
        />

        <View style={{ height: 16 }} />
        <Button title="NEXT" onPress={handleNext} />
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
  heading:       { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  loader:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  loaderText:    { fontSize: 12, color: colors.textMuted },
});

export default Step1_MandiDetails;
