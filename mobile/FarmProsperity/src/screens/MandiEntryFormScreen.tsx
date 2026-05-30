/**
 * MandiEntryFormScreen — Single-page form to submit a mandi arrival.
 *
 * Fields:
 *  - Mandi (picker from /api/mandis/)
 *  - Commodity (text, default 'Chili')
 *  - Date (YYYY-MM-DD, default today)
 *  - Arrival Quantity (Qt)
 *  - Avg / Min / Max Rate (optional)
 *  - Source (trader / farmer / official)
 *  - Remark (optional)
 *
 * On submit: POST /api/mandi-arrivals/ → success → go back.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';

import { createMandiArrival, getMandis } from '../api/mandi';
import { colors } from '../utils/colors';
import { todayISO } from '../utils/helpers';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import type { Mandi, MandiArrivalPayload, MandiSource } from '../types';

const SOURCES: { value: MandiSource; label: string }[] = [
  { value: 'trader', label: 'Trader' },
  { value: 'farmer', label: 'Farmer' },
  { value: 'official', label: 'Mandi Official' },
];

interface FormValues {
  mandi: string;           // ID as string
  commodity: string;
  date: string;
  arrival_quantity: string;
  avg_rate: string;
  min_rate: string;
  max_rate: string;
  source: MandiSource;
  remark: string;
}

const MandiEntryFormScreen = () => {
  const navigation = useNavigation();

  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMandis().then(setMandis).catch(() => {});
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      commodity: 'Chili',
      date: todayISO(),
      source: 'trader',
      remark: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!values.mandi) {
      Alert.alert('Required', 'Please select a mandi.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: MandiArrivalPayload = {
        mandi: Number(values.mandi),
        commodity: values.commodity,
        date: values.date,
        arrival_quantity: parseFloat(values.arrival_quantity),
        avg_rate: values.avg_rate ? parseFloat(values.avg_rate) : undefined,
        min_rate: values.min_rate ? parseFloat(values.min_rate) : undefined,
        max_rate: values.max_rate ? parseFloat(values.max_rate) : undefined,
        source: values.source,
        remark: values.remark,
      };

      await createMandiArrival(payload);
      Alert.alert('✓ Submitted', 'Mandi arrival saved!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg =
        err?.response?.data
          ? JSON.stringify(err.response.data)
          : 'Submission failed. Check connection.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <SectionLabel>Select Mandi</SectionLabel>

      {/* Mandi picker */}
      <Controller
        control={control}
        name="mandi"
        rules={{ required: true }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.mandiGrid}>
            {mandis.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.mandiBtn,
                  value === String(m.id) && styles.mandiBtnActive,
                ]}
                onPress={() => onChange(String(m.id))}
              >
                <Text
                  style={[
                    styles.mandiBtnText,
                    value === String(m.id) && styles.mandiBtnTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {m.name}
                </Text>
                <Text style={styles.mandiBtnSub}>{m.district}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
      {errors.mandi && (
        <Text style={styles.fieldError}>Mandi is required</Text>
      )}

      <SectionLabel>Entry Details</SectionLabel>

      <Controller
        control={control}
        name="commodity"
        rules={{ required: true }}
        render={({ field: { onChange, value } }) => (
          <FormInput
            label="Commodity"
            required
            value={value}
            onChangeText={onChange}
            placeholder="e.g. Chili"
            error={errors.commodity ? 'Required' : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="date"
        rules={{ required: true }}
        render={({ field: { onChange, value } }) => (
          <FormInput
            label="Date"
            required
            value={value}
            onChangeText={onChange}
            placeholder="YYYY-MM-DD"
            error={errors.date ? 'Required' : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="arrival_quantity"
        rules={{ required: true, pattern: /^\d+(\.\d+)?$/ }}
        render={({ field: { onChange, value } }) => (
          <FormInput
            label="Arrival Quantity (Quintal)"
            required
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            placeholder="e.g. 500"
            error={errors.arrival_quantity ? 'Enter a valid quantity' : undefined}
          />
        )}
      />

      <SectionLabel>Price Data (optional)</SectionLabel>

      <Controller
        control={control}
        name="avg_rate"
        render={({ field: { onChange, value } }) => (
          <FormInput
            label="Average Rate (₹/Qt)"
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            placeholder="Optional"
          />
        )}
      />

      <View style={styles.rateRow}>
        <View style={styles.rateField}>
          <Controller
            control={control}
            name="min_rate"
            render={({ field: { onChange, value } }) => (
              <FormInput
                label="Min Rate"
                value={value}
                onChangeText={onChange}
                keyboardType="decimal-pad"
                placeholder="Optional"
              />
            )}
          />
        </View>
        <View style={styles.rateField}>
          <Controller
            control={control}
            name="max_rate"
            render={({ field: { onChange, value } }) => (
              <FormInput
                label="Max Rate"
                value={value}
                onChangeText={onChange}
                keyboardType="decimal-pad"
                placeholder="Optional"
              />
            )}
          />
        </View>
      </View>

      <SectionLabel>Source & Remarks</SectionLabel>

      {/* Source picker */}
      <Controller
        control={control}
        name="source"
        render={({ field: { onChange, value } }) => (
          <View style={styles.sourceRow}>
            {SOURCES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.sourceBtn,
                  value === s.value && styles.sourceBtnActive,
                ]}
                onPress={() => onChange(s.value)}
              >
                <Text
                  style={[
                    styles.sourceBtnText,
                    value === s.value && styles.sourceBtnTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      <Controller
        control={control}
        name="remark"
        render={({ field: { onChange, value } }) => (
          <FormInput
            label="Remarks"
            value={value}
            onChangeText={onChange}
            placeholder="Any additional notes…"
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        )}
      />

      <Button
        title="Submit Entry ✓"
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
        style={{ marginTop: 8 }}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: string }) => (
  <Text style={styles.sectionLabel}>{children}</Text>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  fieldError: { fontSize: 12, color: colors.error, marginTop: -6, marginBottom: 10 },

  // Mandi grid
  mandiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  mandiBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    minWidth: 100,
  },
  mandiBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  mandiBtnText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  mandiBtnTextActive: { color: colors.primary },
  mandiBtnSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  // Rate row
  rateRow: { flexDirection: 'row', gap: 10 },
  rateField: { flex: 1 },

  // Source
  sourceRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  sourceBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  sourceBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  sourceBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  sourceBtnTextActive: { color: colors.primary, fontWeight: '600' },
});

export default MandiEntryFormScreen;
