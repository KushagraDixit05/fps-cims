/**
 * CropEntryFormScreen — 4-step form to submit a field visit.
 *
 * Steps:
 *  1. Basic Details  — Farmer selection (search), visit date
 *  2. Crop Details   — Name, area, sowing date, stage picker, condition picker, expected yield, buyer interest
 *  3. Issues         — Pest / Disease / Weather / Price concern checkboxes + free text
 *  4. Review & Submit — Summary card + GPS display + submit
 *
 * Notes:
 *  - GPS is captured silently on mount; displayed in step 4.
 *  - react-hook-form manages all field state and validation.
 *  - On submit: POST /api/crops/ → success alert → go back.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';

import { getFarmers } from '../api/crops';
import { saveCropEntryLocally } from '../database/operations';
import { colors } from '../utils/colors';
import { todayISO, cropStageLabel } from '../utils/helpers';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import AppIcon from '../components/AppIcon';
import { Bug, CloudRain, TrendingDown, MapPin, Check, ChevronLeft, ChevronRight, Leaf, IconStroke } from '../utils/icons';
import type { CropCondition, CropStage, CropEntryPayload, Farmer } from '../types';

// ─── Step labels ──────────────────────────────────────────────────────────────
const STEPS = ['Basic Details', 'Crop Details', 'Issues', 'Review & Submit'];

const CROP_STAGES: CropStage[] = [
  'seedling', 'vegetative', 'flowering', 'fruiting', 'harvesting', 'post_harvest',
];

const CONDITIONS: CropCondition[] = ['good', 'average', 'poor'];

// ─── Form type ─────────────────────────────────────────────────────────────────
// All fields as strings initially (TextInput), cast on submit
interface FormValues {
  farmer_id: string;
  farmer_name_display: string; // for UI display only
  visit_date: string;
  crop_name: string;
  area_this_year: string;
  area_last_year: string;
  sowing_date: string;
  crop_stage: CropStage;
  crop_condition: CropCondition;
  expected_yield: string;
  buyer_interest: boolean;
  problem_pest: boolean;
  problem_disease: boolean;
  problem_weather: boolean;
  problem_price_concern: boolean;
  problem_other: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CropEntryFormScreen = () => {
  const navigation = useNavigation();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Farmer search state
  const [farmerQuery, setFarmerQuery] = useState('');
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [farmerLoading, setFarmerLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      visit_date: todayISO(),
      crop_name: 'Chili',
      buyer_interest: false,
      problem_pest: false,
      problem_disease: false,
      problem_weather: false,
      problem_price_concern: false,
      problem_other: '',
      crop_stage: 'vegetative',
      crop_condition: 'good',
    },
  });

  // ── GPS ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Uses @react-native-community/geolocation (Android LocationManager, no GMS/FusedLocation)
    try {
      const Geolocation = require('@react-native-community/geolocation');
      Geolocation.getCurrentPosition(
        (pos: any) =>
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err: any) => {
          console.warn('GPS error:', err.message);
          setLocationError('GPS unavailable — location will not be recorded.');
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    } catch {
      setLocationError('Geolocation module not linked — skipping GPS.');
    }
  }, []);


  // ── Farmer search ────────────────────────────────────────────────────────────
  const searchFarmers = useCallback(async (query: string) => {
    if (query.length < 2) return;
    setFarmerLoading(true);
    try {
      const results = await getFarmers({ search: query });
      setFarmers(results);
    } catch {
      // ignore — user can retry
    } finally {
      setFarmerLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchFarmers(farmerQuery), 350);
    return () => clearTimeout(timer);
  }, [farmerQuery, searchFarmers]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    if (!values.farmer_id) {
      Alert.alert('Validation', 'Please select a farmer.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CropEntryPayload & { farmer_name_display?: string } = {
        farmer: Number(values.farmer_id),
        farmer_name_display: values.farmer_name_display,
        visit_date: values.visit_date,
        crop_name: values.crop_name,
        area_this_year: parseFloat(values.area_this_year),
        area_last_year: values.area_last_year ? parseFloat(values.area_last_year) : undefined,
        sowing_date: values.sowing_date || undefined,
        crop_stage: values.crop_stage,
        crop_condition: values.crop_condition,
        expected_yield: values.expected_yield ? parseFloat(values.expected_yield) : undefined,
        buyer_interest: values.buyer_interest,
        problem_pest: values.problem_pest,
        problem_disease: values.problem_disease,
        problem_weather: values.problem_weather,
        problem_price_concern: values.problem_price_concern,
        problem_other: values.problem_other,
        latitude: location?.lat,
        longitude: location?.lng,
      };

      // Phase 3: save locally first — syncs to server in background when online.
      await saveCropEntryLocally(payload);
      Alert.alert('Saved', 'Entry saved locally. Will sync to server when online.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message ?? 'Could not save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Progress bar ──────────────────────────────────────────────────────────────
  const ProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step && styles.dotActive,
              i < step && styles.dotDone,
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </Text>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ProgressBar />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ═══════════════════ STEP 0: Basic Details ═══════════════════ */}
        {step === 0 && (
          <View>
            <SectionHeader title="Basic Details" />

            {/* Farmer search */}
            <Text style={styles.label}>Farmer <Text style={styles.req}>*</Text></Text>
            <Controller
              control={control}
              name="farmer_name_display"
              rules={{ required: 'Farmer is required' }}
              render={({ field: { onChange, value } }) => (
                <View>
                  <FormInput
                    label=""
                    value={farmerQuery}
                    onChangeText={(text) => {
                      setFarmerQuery(text);
                      // Reset farmer_id if user edits the field
                    }}
                    placeholder="Search farmer name…"
                    autoCapitalize="words"
                    error={errors.farmer_id?.message}
                  />
                  {/* Farmer search results */}
                  {farmers.length > 0 && (
                    <View style={styles.dropdown}>
                      {farmers.map((f) => (
                        <Controller
                          key={f.id}
                          control={control}
                          name="farmer_id"
                          render={({ field: { onChange: setFarmerId } }) => (
                            <TouchableOpacity
                              style={styles.dropdownItem}
                              onPress={() => {
                                setFarmerId(String(f.id));
                                onChange(f.name);
                                setFarmerQuery(f.name);
                                setFarmers([]);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{f.name}</Text>
                              <Text style={styles.dropdownItemSub}>
                                {f.village_name} · {f.district}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}
            />

            {/* Visit date */}
            <Controller
              control={control}
              name="visit_date"
              rules={{ required: 'Visit date is required' }}
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Visit Date"
                  required
                  value={value}
                  onChangeText={onChange}
                  placeholder="YYYY-MM-DD"
                  error={errors.visit_date?.message}
                />
              )}
            />
          </View>
        )}

        {/* ═══════════════════ STEP 1: Crop Details ════════════════════ */}
        {step === 1 && (
          <View>
            <SectionHeader title="Crop Details" />

            <Controller
              control={control}
              name="crop_name"
              rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Crop Name"
                  required
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. Chili"
                  error={errors.crop_name ? 'Crop name is required' : undefined}
                />
              )}
            />

            <Controller
              control={control}
              name="area_this_year"
              rules={{ required: true, pattern: /^\d+(\.\d+)?$/ }}
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Area This Year (Acres)"
                  required
                  value={value}
                  onChangeText={onChange}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 2.5"
                  error={
                    errors.area_this_year ? 'Enter a valid area (number)' : undefined
                  }
                />
              )}
            />

            <Controller
              control={control}
              name="area_last_year"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Area Last Year (Acres)"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                />
              )}
            />

            <Controller
              control={control}
              name="sowing_date"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Sowing Date"
                  value={value}
                  onChangeText={onChange}
                  placeholder="YYYY-MM-DD (optional)"
                />
              )}
            />

            {/* Stage picker */}
            <Text style={styles.label}>Crop Stage <Text style={styles.req}>*</Text></Text>
            <Controller
              control={control}
              name="crop_stage"
              render={({ field: { onChange, value } }) => (
                <View style={styles.chipRow}>
                  {CROP_STAGES.map((stage) => (
                    <TouchableOpacity
                      key={stage}
                      style={[
                        styles.chip,
                        value === stage && styles.chipActive,
                      ]}
                      onPress={() => onChange(stage)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          value === stage && styles.chipTextActive,
                        ]}
                      >
                        {cropStageLabel(stage)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />

            {/* Condition picker */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              Crop Condition <Text style={styles.req}>*</Text>
            </Text>
            <Controller
              control={control}
              name="crop_condition"
              render={({ field: { onChange, value } }) => (
                <View style={styles.condRow}>
                  {CONDITIONS.map((c) => {
                    const activeStyle = c === 'good'
                      ? styles.cond_good
                      : c === 'average'
                      ? styles.cond_average
                      : styles.cond_poor;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.condBtn, value === c && activeStyle]}
                        onPress={() => onChange(c)}
                      >
                        <Text style={styles.condBtnText}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />

            <Controller
              control={control}
              name="expected_yield"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Expected Yield (Qt/Acre)"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                />
              )}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Buyer interest?</Text>
              <Controller
                control={control}
                name="buyer_interest"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor="white"
                  />
                )}
              />
            </View>
          </View>
        )}

        {/* ═══════════════════ STEP 2: Issues ══════════════════════════ */}
        {step === 2 && (
          <View>
            <SectionHeader title="Field Issues" />
            <Text style={styles.issueNote}>
              Check all issues affecting this field:
            </Text>

            {(
              [
                { name: 'problem_pest', label: 'Pest attack' },
                { name: 'problem_disease', label: 'Disease' },
                { name: 'problem_weather', label: 'Weather damage' },
                { name: 'problem_price_concern', label: 'Price concern' },
              ] as const
            ).map(({ name, label }) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field: { onChange, value } }) => (
                  <TouchableOpacity
                    style={[styles.issueRow, value && styles.issueRowActive]}
                    onPress={() => onChange(!value)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[styles.checkbox, value && styles.checkboxChecked]}
                    >
                      {value && <AppIcon icon={Check} size={11} color="white" strokeWidth={3} />}
                    </View>
                    <Text style={styles.issueLabel}>{label}</Text>
                  </TouchableOpacity>
                )}
              />
            ))}

            <Controller
              control={control}
              name="problem_other"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Other issues (optional)"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Describe any other problems…"
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
              )}
            />
          </View>
        )}

        {/* ═══════════════════ STEP 3: Review & Submit ════════════════ */}
        {step === 3 && (
          <View>
            <SectionHeader title="Review & Submit" />

            {/* GPS status */}
            <View style={styles.gpsCard}>
              <View style={styles.gpsTitleRow}>
                <AppIcon icon={MapPin} size={14} color={colors.info} strokeWidth={2} />
                <Text style={styles.gpsTitle}> GPS Location</Text>
              </View>
              {location ? (
                <Text style={styles.gpsCoords}>
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </Text>
              ) : (
                <Text style={styles.gpsError}>
                  {locationError ?? 'Acquiring GPS…'}
                </Text>
              )}
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <SummaryRow label="Farmer" value={watch('farmer_name_display') || '—'} />
              <SummaryRow label="Visit Date" value={watch('visit_date')} />
              <SummaryRow label="Crop" value={watch('crop_name')} />
              <SummaryRow
                label="Area"
                value={`${watch('area_this_year') || '—'} Ac`}
              />
              <SummaryRow label="Stage" value={cropStageLabel(watch('crop_stage'))} />
              <SummaryRow
                label="Condition"
                value={
                  watch('crop_condition').charAt(0).toUpperCase() +
                  watch('crop_condition').slice(1)
                }
              />
            </View>
          </View>
        )}

        {/* ═══════════ Navigation buttons ══════════════════════════════ */}
        <View style={styles.navRow}>
          {step > 0 && (
            <Button
              title="Back"
              variant="secondary"
              onPress={() => setStep((s) => s - 1)}
              style={styles.navBtn}
            />
          )}
          {step < STEPS.length - 1 ? (
            <Button
              title="Next"
              onPress={() => {
                // Basic step validation before advancing
                if (step === 0 && !watch('farmer_id')) {
                  Alert.alert('Required', 'Please select a farmer before proceeding.');
                  return;
                }
                if (step === 1 && !watch('area_this_year')) {
                  Alert.alert('Required', 'Please enter area this year.');
                  return;
                }
                setStep((s) => s + 1);
              }}
              style={styles.navBtn}
            />
          ) : (
            <Button
              title="Submit"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              style={styles.navBtn}
            />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Progress
  progressContainer: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  progressRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8DDD0',
  },
  dotActive: { width: 20, borderRadius: 3, backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.primaryMid },
  stepLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  req: { color: colors.error },

  // Dropdown
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dropdownItemSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Stage chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '600' },

  // Condition buttons
  condRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  condBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  cond_good: { backgroundColor: colors.goodBg, borderColor: colors.good },
  cond_average: { backgroundColor: colors.averageBg, borderColor: colors.average },
  cond_poor: { backgroundColor: colors.poorBg, borderColor: colors.poor },
  condBtnText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },

  // Buyer interest switch
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: 14,
  },
  switchLabel: { fontSize: 14, color: colors.textPrimary },

  // Issues
  issueNote: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 13,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
    gap: 12,
  },
  issueRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  gpsTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 4 },
  issueLabel: { fontSize: 14, color: colors.textPrimary },

  // GPS card
  gpsCard: {
    backgroundColor: colors.infoBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: colors.info,
    marginBottom: 14,
  },
  gpsTitle: { fontSize: 13, fontWeight: '600', color: colors.info },
  gpsCoords: { fontSize: 13, color: colors.info, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  gpsError: { fontSize: 12, color: colors.textMuted },

  // Summary card
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, flex: 1, textAlign: 'right' },

  // Nav
  navRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  navBtn: { flex: 1 },
});

export default CropEntryFormScreen;
