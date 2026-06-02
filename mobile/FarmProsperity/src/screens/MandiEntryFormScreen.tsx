/**
 * MandiEntryFormScreen — Single-page form to submit a mandi arrival.
 *
 * Phase 3 changes:
 *  - Mandi list loaded from WatermelonDB (offline cache), with API fallback.
 *  - On submit: saves to local DB first → shows success → syncs in background.
 *
 * Fields:
 *  - Mandi (picker from local cache / /api/mandis/)
 *  - Commodity (text, default 'Chili')
 *  - Date (YYYY-MM-DD, default today)
 *  - Arrival Quantity (Qt)
 *  - Avg / Min / Max Rate (optional)
 *  - Source (trader / farmer / official)
 *  - Remark (optional)
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
import { Q } from '@nozbe/watermelondb';

import { getMandis } from '../api/mandi';
import { saveMandiArrivalLocally } from '../database/operations';
import database from '../database';
import { MandiModel } from '../database/models/MandiModel';

import { colors } from '../utils/colors';
import { todayISO } from '../utils/helpers';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import type { Mandi, MandiArrivalPayload, MandiSource } from '../types';

const SOURCES: { value: MandiSource; label: string }[] = [
  { value: 'trader',   label: 'Trader' },
  { value: 'farmer',   label: 'Farmer' },
  { value: 'official', label: 'Mandi Official' },
];

interface FormValues {
  mandi:            string;   // ID as string
  commodity:        string;
  date:             string;
  arrival_quantity: string;
  avg_rate:         string;
  min_rate:         string;
  max_rate:         string;
  source:           MandiSource;
  remark:           string;
}

const MandiEntryFormScreen = () => {
  const navigation = useNavigation();

  const [mandis, setMandis]       = useState<Mandi[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load mandis: local DB first, fall back to API if cache is empty
  useEffect(() => {
    const loadMandis = async () => {
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
              state:     m.state    ?? '',
              is_active: m.isActive,
            })),
          );
        } else {
          // Cache empty — fetch from API (requires connectivity)
          const apiMandis = await getMandis();
          setMandis(apiMandis);
        }
      } catch {
        // If everything fails, leave mandis empty; user sees empty list
      }
    };

    loadMandis();
  }, []);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      commodity: 'Chili',
      date:      todayISO(),
      source:    'trader',
      remark:    '',
    },
  });

  const selectedMandiId = watch('mandi');
  const selectedMandi   = mandis.find((m) => String(m.id) === selectedMandiId);

  const onSubmit = async (values: FormValues) => {
    if (!values.mandi) {
      Alert.alert('Required', 'Please select a mandi.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: MandiArrivalPayload = {
        mandi:            Number(values.mandi),
        commodity:        values.commodity,
        date:             values.date,
        arrival_quantity: parseFloat(values.arrival_quantity),
        avg_rate:         values.avg_rate ? parseFloat(values.avg_rate) : undefined,
        min_rate:         values.min_rate ? parseFloat(values.min_rate) : undefined,
        max_rate:         values.max_rate ? parseFloat(values.max_rate) : undefined,
        source:           values.source,
        remark:           values.remark,
      };

      // Phase 3: save locally first — syncs to server in background when online.
      await saveMandiArrivalLocally(payload, selectedMandi?.name);

      Alert.alert('✓ Saved', 'Mandi arrival saved locally. Will sync when online.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message ?? 'Could not save. Please try again.');
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
            {mandis.length === 0 && (
              <Text style={styles.emptyNote}>
                No mandis cached yet. Connect to internet to load mandi list.
              </Text>
            )}
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

      <SectionLabel>Source &amp; Remarks</SectionLabel>

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
        title="Save Entry ✓"
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
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },

  sectionLabel: {
    fontSize:      11,
    fontWeight:    '700',
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  12,
    marginTop:     4,
  },
  fieldError: { fontSize: 12, color: colors.error, marginTop: -6, marginBottom: 10 },
  emptyNote:  { fontSize: 13, color: colors.textMuted, padding: 8 },

  // Mandi grid
  mandiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  mandiBtn: {
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    minWidth:        100,
  },
  mandiBtnActive:     { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  mandiBtnText:       { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  mandiBtnTextActive: { color: colors.primary },
  mandiBtnSub:        { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  // Rate row
  rateRow:  { flexDirection: 'row', gap: 10 },
  rateField: { flex: 1 },

  // Source
  sourceRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  sourceBtn: {
    flex:            1,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     colors.border,
    paddingVertical: 10,
    alignItems:      'center',
    backgroundColor: colors.surface,
  },
  sourceBtnActive:     { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  sourceBtnText:       { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  sourceBtnTextActive: { color: colors.primary, fontWeight: '600' },
});

export default MandiEntryFormScreen;
