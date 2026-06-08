// src/screens/productDemo/ProductDemoFormScreen.tsx
// Wizard shell — owns useProductDemoForm hook, renders the correct
// step sub-component based on state.step. Handles submission.

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
import { useProductDemoForm } from '../../hooks/useProductDemoForm';
import AppIcon from '../../components/AppIcon';
import { ChevronLeft } from '../../utils/icons';
import Step1_FarmerDetails        from './Step1_FarmerDetails';
import Step2_CropStageDetails     from './Step2_CropStageDetails';
import Step3_ProductDoseDetails   from './Step3_ProductDoseDetails';
import Step4_PhotosResultRemark   from './Step4_PhotosResultRemark';
import ReviewScreen               from './ReviewScreen';
import SuccessScreen              from './SuccessScreen';

type Nav = StackNavigationProp<RootStackParamList>;

// ── Progress bar ──────────────────────────────────────────────────────────────

const ProgressBar = ({ step }: { step: 1 | 2 | 3 | 4 | 'review' }) => {
  const numericStep = step === 'review' ? 4 : step;
  const pct = ((numericStep - 1) / 3) * 100;
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

const ProductDemoFormScreen = () => {
  const navigation = useNavigation<Nav>();
  const form = useProductDemoForm();
  const { state } = form;

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    id: string;
    farmer_name: string;
    product_name: string;
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
    if (state.step === 1)        navigation.goBack();
    else if (state.step === 2)   form.setStep(1);
    else if (state.step === 3)   form.setStep(2);
    else if (state.step === 4)   form.setStep(3);
    else                         form.setStep(4);
  };

  if (successData) {
    return (
      <SuccessScreen
        farmerName={successData.farmer_name}
        productName={successData.product_name}
        onAddNew={handleAddNew}
        onDashboard={handleDashboard}
      />
    );
  }

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon icon={ChevronLeft} size={22} color="white" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Product Demo Entry</Text>
        <View style={{ width: 36 }} />
      </View>

      {state.step !== 'review' && <ProgressBar step={state.step} />}

      {state.step === 1 && (
        <Step1_FarmerDetails
          data={state.farmerDetails}
          onChange={form.updateFarmerDetails}
          onNext={() => form.setStep(2)}
        />
      )}

      {state.step === 2 && (
        <Step2_CropStageDetails
          data={state.cropStage}
          onChange={form.updateCropStage}
          onNext={() => form.setStep(3)}
          onBack={() => form.setStep(1)}
        />
      )}

      {state.step === 3 && (
        <Step3_ProductDoseDetails
          data={state.productDose}
          onChange={form.updateProductDose}
          onNext={() => form.setStep(4)}
          onBack={() => form.setStep(2)}
        />
      )}

      {state.step === 4 && (
        <Step4_PhotosResultRemark
          data={state.result}
          onAddBeforePhoto={form.addBeforePhoto}
          onRemoveBeforePhoto={form.removeBeforePhoto}
          onAddAfterPhoto={form.addAfterPhoto}
          onRemoveAfterPhoto={form.removeAfterPhoto}
          onUpdateResult={form.updateResult}
          onSubmit={() => form.setStep('review')}
          onBack={() => form.setStep(3)}
        />
      )}

      {state.step === 'review' && (
        <ReviewScreen
          state={state}
          onEditFarmer={()  => form.setStep(1)}
          onEditCrop={()    => form.setStep(2)}
          onEditProduct={() => form.setStep(3)}
          onEditResult={()  => form.setStep(4)}
          onSubmit={handleSubmit}
          onBack={() => form.setStep(4)}
          submitting={submitting}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn:  { width: 36, height: 36, justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '700', color: 'white' },
});

export default ProductDemoFormScreen;
