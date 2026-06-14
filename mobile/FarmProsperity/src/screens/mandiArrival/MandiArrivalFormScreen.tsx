// src/screens/mandiArrival/MandiArrivalFormScreen.tsx
// Wizard shell — owns useMandiArrivalForm hook, renders the correct step
// sub-component based on state.step. Handles local DB submission.
// Mirrors CropMonitoringFormScreen.tsx exactly in structure and styling.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/types';

import { colors } from '../../utils/colors';
import { useMandiArrivalForm } from '../../hooks/useMandiArrivalForm';
import ScreenHeader from '../../components/ScreenHeader';

import Step1_MandiDetails   from './Step1_MandiDetails';
import Step2_CropVarieties  from './Step2_CropVarieties';
import Step3_SourceRemark   from './Step3_SourceRemark';
import Step4_Photos         from './Step4_Photos';
import Step5_Location       from './Step5_Location';
import ReviewScreen         from './ReviewScreen';
import SuccessScreen        from './SuccessScreen';

type Nav = StackNavigationProp<RootStackParamList>;

const TOTAL_STEPS = 5;

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ step }: { step: 1 | 2 | 3 | 4 | 5 | 'review' }) => {
  const numericStep = step === 'review' ? TOTAL_STEPS : step;
  const pct = ((numericStep - 1) / (TOTAL_STEPS - 1)) * 100;
  return (
    <View style={pb.wrapper}>
      <Text style={pb.label}>Step {numericStep} of {TOTAL_STEPS}</Text>
      <View style={pb.track}>
        <View style={[pb.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
};

const pb = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, backgroundColor: colors.background },
  label:   { fontSize: 12, color: colors.primary, fontWeight: '600', textAlign: 'right', marginBottom: 4 },
  track:   { height: 4, backgroundColor: colors.borderLight, width: '100%', borderRadius: 2 },
  fill:    { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
});

// ── Main shell ────────────────────────────────────────────────────────────────
const MandiArrivalFormScreen = () => {
  const navigation = useNavigation<Nav>();
  const form = useMandiArrivalForm();
  const { state } = form;

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    id: string;
    mandi_name: string;
    variety_count: number;
  } | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await form.submit();
      setSuccessData(result);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Submission failed. Please check your connection and try again.';
      Alert.alert('Submission Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNew = () => {
    form.reset();
    setSuccessData(null);
  };

  const handleDashboard = () => {
    form.reset();
    setSuccessData(null);
    navigation.navigate('Main');
  };

  const handleBack = () => {
    const s = state.step;
    if (s === 1)         navigation.goBack();
    else if (s === 2)    form.setStep(1);
    else if (s === 3)    form.setStep(2);
    else if (s === 4)    form.setStep(3);
    else if (s === 5)    form.setStep(4);
    else                 form.setStep(5); // 'review' → step 5
  };

  // Show success screen once we have a local result
  if (successData) {
    return (
      <SuccessScreen
        mandiName={successData.mandi_name}
        varietyCount={successData.variety_count}
        onAddNew={handleAddNew}
        onDashboard={handleDashboard}
      />
    );
  }

  return (
    <View style={styles.root}>
      {/* ── Compact header ── */}
      <ScreenHeader
        title="Market Intelligence — New Entry"
        subtitle={state.step !== 'review' ? `Step ${state.step} of 5` : 'Review'}
        onBack={handleBack}
      />

      {/* ── Progress bar (hidden on review step) ── */}
      {state.step !== 'review' && <ProgressBar step={state.step} />}

      {/* ── Step renderer ── */}
      {state.step === 1 && (
        <Step1_MandiDetails
          data={state.mandiDetails}
          onChange={form.updateMandiDetails}
          onNext={() => form.setStep(2)}
        />
      )}

      {state.step === 2 && (
        <Step2_CropVarieties
          varieties={state.varieties}
          onUpdate={form.updateVariety}
          onAdd={form.addVariety}
          onRemove={form.removeVariety}
          onNext={() => form.setStep(3)}
          onBack={() => form.setStep(1)}
        />
      )}

      {state.step === 3 && (
        <Step3_SourceRemark
          source={state.source}
          customSource={state.custom_source}
          remark={state.remark}
          onSetSource={form.setSource}
          onSetCustomSource={form.setCustomSource}
          onSetRemark={form.setRemark}
          onNext={() => form.setStep(4)}
          onBack={() => form.setStep(2)}
        />
      )}

      {state.step === 4 && (
        <Step4_Photos
          photos={state.photos}
          onAdd={form.addPhoto}
          onRemove={form.removePhoto}
          onNext={() => form.setStep(5)}
          onBack={() => form.setStep(3)}
        />
      )}

      {state.step === 5 && (
        <Step5_Location
          location={state.location}
          onCapture={form.setLocation}
          onNext={() => form.setStep('review')}
          onBack={() => form.setStep(4)}
        />
      )}

      {state.step === 'review' && (
        <ReviewScreen
          state={state}
          onEditMandi={() => form.setStep(1)}
          onEditVarieties={() => form.setStep(2)}
          onEditSource={() => form.setStep(3)}
          onSubmit={handleSubmit}
          onBack={() => form.setStep(5)}
          submitting={submitting}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 28,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  backBtn:  { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 17, fontWeight: '700', color: 'white' },
});

export default MandiArrivalFormScreen;
