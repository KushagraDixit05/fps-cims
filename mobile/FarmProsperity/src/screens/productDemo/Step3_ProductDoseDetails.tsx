// src/screens/productDemo/Step3_ProductDoseDetails.tsx
// Product Demo wizard Step 3 — Product & Dose Details.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../../utils/colors';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import InlinePicker from '../../components/InlinePicker';
import type { ProductDoseDraft, ProductDoseErrors, DoseUnit } from '../../types/productDemo';
import { validateStep3, hasErrors } from '../../utils/productDemoValidation';

// ── Static product list (seeded in backend; used offline until sync) ──────────

const PRODUCT_OPTIONS = [
  'Acephate 75% SP',
  'Chlorpyrifos 20% EC',
  'Cypermethrin 10% EC',
  'Emamectin Benzoate 5% SG',
  'Imidacloprid 17.8% SL',
  'Lambda Cyhalothrin 5% EC',
  'Mancozeb 75% WP',
  'Metalaxyl 8% + Mancozeb 64% WP',
  'Profenofos 50% EC',
  'Propiconazole 25% EC',
  'Tebuconazole 25.9% EC',
  'Thiamethoxam 25% WG',
  'Thiram 75% WP',
  'Tricyclazole 75% WP',
  'Azoxystrobin 23% SC',
  'Carbendazim 50% WP',
  'Hexaconazole 5% SC',
  'Dimethoate 30% EC',
  'Monocrotophos 36% SL',
  'Spinosad 45% SC',
].map(p => ({ value: p, label: p }));

// ── Dose unit options ─────────────────────────────────────────────────────────

const DOSE_UNIT_OPTIONS: { value: DoseUnit; label: string }[] = [
  { value: 'ml/acre',  label: 'ml/acre' },
  { value: 'gm/acre',  label: 'gm/acre' },
  { value: 'kg/acre',  label: 'kg/acre' },
  { value: 'lt/acre',  label: 'lt/acre' },
  { value: 'kg/ha',    label: 'kg/ha' },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Step3Props {
  data: ProductDoseDraft;
  onChange: (data: Partial<ProductDoseDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step3_ProductDoseDetails = ({ data, onChange, onNext, onBack }: Step3Props) => {
  const [errors, setErrors] = useState<ProductDoseErrors>({});

  const handleNext = () => {
    const errs = validateStep3(data);
    setErrors(errs);
    if (!hasErrors(errs)) onNext();
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
        <View style={styles.sectionHeader}>
          <View style={styles.numberCircle}>
            <Text style={styles.numberText}>3</Text>
          </View>
          <Text style={styles.heading}>Product & Dose Details</Text>
        </View>

        <InlinePicker
          label="Product Name"
          required
          value={data.product_name}
          options={PRODUCT_OPTIONS}
          onSelect={v => onChange({ product_name: v })}
          placeholder="Select product…"
          error={errors.product_name}
        />

        <View style={styles.doseRow}>
          <View style={styles.doseInput}>
            <FormInput
              label="Dose"
              required
              value={data.dose}
              onChangeText={v => onChange({ dose: v })}
              placeholder="e.g. 200"
              keyboardType="decimal-pad"
              error={errors.dose}
            />
          </View>
          <View style={styles.unitPicker}>
            <InlinePicker
              label="Unit"
              required
              value={data.dose_unit}
              options={DOSE_UNIT_OPTIONS}
              onSelect={v => onChange({ dose_unit: v as DoseUnit })}
              placeholder="Unit…"
              error={errors.dose_unit}
            />
          </View>
        </View>

        <Text style={styles.hint}>e.g. ml/acre, gm/acre, kg/acre, etc.</Text>

        <View style={{ height: 16 }} />

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
  doseRow:       { flexDirection: 'row', gap: 10 },
  doseInput:     { flex: 2 },
  unitPicker:    { flex: 1 },
  hint:          { fontSize: 12, color: colors.textMuted, marginTop: -8, marginBottom: 16 },
  navRow:        { flexDirection: 'row', gap: 10 },
  navBtn:        { flex: 1 },
});

export default Step3_ProductDoseDetails;
