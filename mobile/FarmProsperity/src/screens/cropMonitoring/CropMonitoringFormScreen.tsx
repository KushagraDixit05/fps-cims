// src/screens/cropMonitoring/CropMonitoringFormScreen.tsx
// Wizard shell — owns useCropMonitoringForm hook, renders the correct
// step sub-component based on state.step. Handles API submission.

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
import { useCropMonitoringForm } from '../../hooks/useCropMonitoringForm';
import AppIcon from '../../components/AppIcon';
import { ChevronLeft, IconStroke } from '../../utils/icons';
import Step1_FarmerDetails from './Step1_FarmerDetails';
import Step2_CropDetails from './Step2_CropDetails';
import Step3_PhotosLocation from './Step3_PhotosLocation';
import ReviewScreen from './ReviewScreen';
import SuccessScreen from './SuccessScreen';

type Nav = StackNavigationProp<RootStackParamList>;

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ step }: { step: 1 | 2 | 3 | 'review' }) => {
  const numericStep = step === 'review' ? 3 : step;
  const pct = ((numericStep - 1) / 2) * 100;
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${pct}%` }]} />
    </View>
  );
};
const pb = StyleSheet.create({
  track: { height: 4, backgroundColor: colors.borderLight, width: '100%' },
  fill:  { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
});

// ── Main shell ────────────────────────────────────────────────────────────────
const CropMonitoringFormScreen = () => {
  const navigation = useNavigation<Nav>();
  const form = useCropMonitoringForm();
  const { state } = form;

  const [submitting, setSubmitting] = useState(false);
  // Holds the 201 response data for the Success screen
  const [successData, setSuccessData] = useState<{
    id: string;
    farmer_name: string;
    crop_count: number;
  } | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await form.submit();
      setSuccessData(result);
      form.setStep('review'); // keeps step as 'review' in state — success rendered below
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

  // ── Show success screen once we have a result ──
  if (successData) {
    return (
      <SuccessScreen
        farmerName={successData.farmer_name}
        cropCount={successData.crop_count}
        onAddNew={handleAddNew}
        onDashboard={handleDashboard}
      />
    );
  }

  return (
    <View style={styles.root}>
      {/* ── Top bar with back button + progress bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (state.step === 1) {
              navigation.goBack();
            } else if (state.step === 2) {
              form.setStep(1);
            } else if (state.step === 3) {
              form.setStep(2);
            } else {
              form.setStep(3);
            }
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon icon={ChevronLeft} size={22} color="white" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Crop Monitoring</Text>
        <View style={{ width: 36 }} />
      </View>

      {state.step !== 'review' && <ProgressBar step={state.step} />}

      {/* ── Step renderer ── */}
      {state.step === 1 && (
        <Step1_FarmerDetails
          data={state.farmerDetails}
          onChange={form.updateFarmerDetails}
          onNext={() => form.setStep(2)}
        />
      )}

      {state.step === 2 && (
        <Step2_CropDetails
          crops={state.crops}
          onUpdate={form.updateCrop}
          onAdd={form.addCrop}
          onRemove={form.removeCrop}
          onNext={() => form.setStep(3)}
          onBack={() => form.setStep(1)}
        />
      )}

      {state.step === 3 && (
        <Step3_PhotosLocation
          photos={state.photos}
          location={state.location}
          remark={state.remark}
          onAddPhoto={form.addPhoto}
          onRemovePhoto={form.removePhoto}
          onSetLocation={form.setLocation}
          onSetRemark={form.setRemark}
          onSubmit={() => form.setStep('review')}
          onBack={() => form.setStep(2)}
        />
      )}

      {state.step === 'review' && (
        <ReviewScreen
          state={state}
          onEditFarmer={() => form.setStep(1)}
          onEditCrops={() => form.setStep(2)}
          onEditPhotos={() => form.setStep(3)}
          onSubmit={handleSubmit}
          onBack={() => form.setStep(3)}
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
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn:   { width: 36, height: 36, justifyContent: 'center' },
  topTitle:  { fontSize: 17, fontWeight: '700', color: 'white' },
});

export default CropMonitoringFormScreen;
