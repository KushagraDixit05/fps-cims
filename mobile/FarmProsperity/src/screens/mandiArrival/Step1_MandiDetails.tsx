// src/screens/mandiArrival/Step1_MandiDetails.tsx
// Wizard Step 1 — Mandi picker, Date, Total Arrival.
// Rendered inside MandiArrivalFormScreen.tsx when step === 1.

import React, { useState, useEffect } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../utils/colors';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import InlinePicker from '../../components/InlinePicker';
import type { MandiDetailsDraft, MandiDetailsErrors } from '../../types/mandiArrival';
import { validateStep1, hasMandiDetailsErrors } from '../../utils/mandiArrivalValidation';
import { todayISO } from '../../utils/helpers';
import database from '../../database';
import { MandiModel } from '../../database/models/MandiModel';
import { getMandis } from '../../api/mandi';
import type { Mandi } from '../../types';

const OTHERS_MANDI_ID = 'others';

interface Step1Props {
  data: MandiDetailsDraft;
  onChange: (data: Partial<MandiDetailsDraft>) => void;
  onNext: () => void;
}

const Step1_MandiDetails = ({ data, onChange, onNext }: Step1Props) => {
  const [errors, setErrors] = useState<MandiDetailsErrors>({});
  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const datePickerValue = (() => {
    const d = new Date(data.date);
    return isNaN(d.getTime()) ? new Date() : d;
  })();

  const handleDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) {
      onChange({ date: selected.toISOString().split('T')[0] });
    }
  };

  // Populate today's date as default if not already set
  useEffect(() => {
    if (!data.date) {
      onChange({ date: todayISO() });
    }
  }, []);

  // Load mandis from local DB first (offline-first), API fallback
  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      // Query all locally stored mandis (no is_active filter — show everything)
      const localMandis = await database.collections
        .get<MandiModel>('mandis')
        .query()
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
      // leave mandis empty — retry button will be shown
    } finally {
      setLoading(false);
    }
  };

  const handleMandiSelect = (mandiId: string) => {
    if (mandiId === OTHERS_MANDI_ID) {
      onChange({ mandi_id: OTHERS_MANDI_ID, mandi_name: 'Others', custom_mandi_name: '' });
    } else {
      const mandi = mandis.find((m) => String(m.id) === mandiId);
      onChange({ mandi_id: mandiId, mandi_name: mandi?.name ?? '', custom_mandi_name: '' });
    }
  };

  const handleNext = () => {
    const errs = validateStep1(data);
    setErrors(errs);
    if (!hasMandiDetailsErrors(errs)) onNext();
  };

  const mandiOptions = [
    ...mandis.map((m) => ({
      value: String(m.id),
      label: m.district ? `${m.name} (${m.district})` : m.name,
    })),
    { value: OTHERS_MANDI_ID, label: 'Others (Please Specify)' },
  ];

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

        {!loading && mandis.length === 0 && (
          <View style={styles.retryRow}>
            <Text style={styles.retryMsg}>Could not load mandi list.</Text>
            <TouchableOpacity onPress={load} style={styles.retryBtn} activeOpacity={0.75}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
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

        {data.mandi_id === OTHERS_MANDI_ID && (
          <FormInput
            label="Mandi Name (Custom)"
            required
            value={data.custom_mandi_name ?? ''}
            onChangeText={(v) => onChange({ custom_mandi_name: v })}
            placeholder="Enter mandi name"
            error={errors.custom_mandi_name}
          />
        )}

        <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
          <FormInput
            label="Date"
            required
            value={data.date}
            editable={false}
            pointerEvents="none"
            placeholder="YYYY-MM-DD"
            error={errors.date}
          />
        </TouchableOpacity>

        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={datePickerValue}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
        {showDatePicker && Platform.OS === 'ios' && (
          <DateTimePicker
            value={datePickerValue}
            mode="date"
            display="inline"
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

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
  retryRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: 10, backgroundColor: '#FFF3CD', borderRadius: 8 },
  retryMsg:      { fontSize: 13, color: '#856404', flex: 1 },
  retryBtn:      { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primary, borderRadius: 6 },
  retryBtnText:  { color: 'white', fontSize: 13, fontWeight: '600' },
});

export default Step1_MandiDetails;
