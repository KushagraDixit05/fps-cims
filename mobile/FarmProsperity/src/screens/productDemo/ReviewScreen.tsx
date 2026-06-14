// src/screens/productDemo/ReviewScreen.tsx
// Read-only summary screen. Shows all entered data before final submission.

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { colors } from '../../utils/colors';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { OTHERS_VALUE, resolveOthersValue } from '../../utils/othersValidation';
import type { ProductDemoFormState, DemoResult } from '../../types/productDemo';

interface ReviewScreenProps {
  state: ProductDemoFormState;
  onEditFarmer:  () => void;
  onEditCrop:    () => void;
  onEditProduct: () => void;
  onEditResult:  () => void;
  onSubmit:      () => void;
  onBack:        () => void;
  submitting:    boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

const SectionHeader = ({ title, onEdit }: { title: string; onEdit?: () => void }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {onEdit && (
      <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.editLink}>EDIT</Text>
      </TouchableOpacity>
    )}
  </View>
);

const RESULT_LABELS: Record<DemoResult, string> = {
  excellent: 'Excellent',
  good:      'Good',
  average:   'Average',
  poor:      'Poor',
  no_effect: 'No Effect',
};

const RESULT_COLOR: Record<DemoResult, string> = {
  excellent: '#1A8A3A',
  good:      '#2E7D32',
  average:   colors.average,
  poor:      colors.poor,
  no_effect: '#555555',
};

const RESULT_BG: Record<DemoResult, string> = {
  excellent: '#E1F2E8',
  good:      '#C8E6C9',
  average:   colors.averageBg,
  poor:      colors.poorBg,
  no_effect: '#EEEEEE',
};

const STAGE_LABELS: Record<string, string> = {
  seedling:    'Seedling',
  vegetative:  'Vegetative',
  flowering:   'Flowering',
  fruiting:    'Fruiting',
  harvesting:  'Harvesting',
  post_harvest: 'Post Harvest',
};

// ── Component ─────────────────────────────────────────────────────────────────

const ReviewScreen = ({
  state,
  onEditFarmer,
  onEditCrop,
  onEditProduct,
  onEditResult,
  onSubmit,
  onBack,
  submitting,
}: ReviewScreenProps) => {
  const { farmerDetails, cropStage, productDose, result } = state;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Review & Confirm</Text>
      <Text style={styles.subtext}>Please verify all details before submitting.</Text>

      {/* Farmer Details */}
      <Card>
        <SectionHeader title="Farmer & Location Details" onEdit={onEditFarmer} />
        <Row label="Farmer Name"      value={farmerDetails.farmer_name} />
        <Row label="Mobile"           value={farmerDetails.mobile_number} />
        <Row label="Village / Block"  value={`${farmerDetails.village_name} / ${resolveOthersValue(farmerDetails.block_name, farmerDetails.custom_block_name ?? '')}`} />
        <Row label="District"         value={farmerDetails.district_name} />
        <Row label="Total Land (Ac)"  value={farmerDetails.total_land_acre} />
      </Card>

      {/* Crop & Stage Details */}
      <Card>
        <SectionHeader title="Crop & Stage Details" onEdit={onEditCrop} />
        <Row label="Crop"             value={resolveOthersValue(cropStage.crop_name, cropStage.custom_crop_name ?? '')} />
        <Row
          label={cropStage.varieties.length > 1 ? 'Varieties' : 'Variety'}
          value={cropStage.varieties
            .map((v) => (v.variety === OTHERS_VALUE ? v.custom_variety.trim() : v.variety))
            .filter((n) => n.length > 0)
            .join(', ')}
        />
        <Row label="Crop Stage"       value={STAGE_LABELS[cropStage.crop_stage] ?? cropStage.crop_stage} />
        <Row label="Stage (Days)"     value={cropStage.crop_stage_days} />
        <Row label="Demo Date"        value={cropStage.demo_date} />
      </Card>

      {/* Product & Dose Details */}
      <Card>
        <SectionHeader title="Product & Dose Details" onEdit={onEditProduct} />
        <Row label="Product Name"     value={resolveOthersValue(productDose.product_name, productDose.custom_product_name ?? '')} />
        <Row label="Dose"             value={`${productDose.dose} ${productDose.dose_unit}`} />
      </Card>

      {/* Before Photos */}
      <Card>
        <SectionHeader title="Before Demo Photos" onEdit={onEditResult} />

        <View style={styles.photoStrip}>
          {result.before_photos.slice(0, 4).map((p) => (
            <Image key={p.uri} source={{ uri: p.uri }} style={styles.photoThumb} />
          ))}
          {result.before_photos.length > 4 && (
            <View style={styles.photoMore}>
              <Text style={styles.photoMoreText}>+{result.before_photos.length - 4}</Text>
            </View>
          )}
          {result.before_photos.length === 0 && (
            <Text style={styles.noneText}>No photos</Text>
          )}
        </View>

        <Text style={styles.afterNote}>
          Demo result and after-demo photos will be added later from the demo
          details, once this entry has synced.
        </Text>
      </Card>

      {/* Nav buttons */}
      <View style={styles.navRow}>
        <Button
          title="BACK"
          onPress={onBack}
          variant="secondary"
          style={styles.navBtn}
        />
        <Button
          title={submitting ? 'Submitting...' : 'CONFIRM & SUBMIT'}
          onPress={onSubmit}
          loading={submitting}
          disabled={submitting}
          style={styles.navBtn}
        />
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll:         { flex: 1, backgroundColor: colors.background },
  content:        { padding: 16, paddingBottom: 40 },
  heading:        { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  subtext:        { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  editLink:       { fontSize: 12, fontWeight: '700', color: colors.primary },
  row:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  rowLabel:       { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue:       { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 2, textAlign: 'right' },
  photoGroupLabel:{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 8, marginBottom: 6 },
  photoStrip:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  photoThumb:     { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.borderLight },
  photoMore:      { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  photoMoreText:  { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  noneText:       { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  afterNote:      { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  resultBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  resultBadge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  resultBadgeText:{ fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  navRow:         { flexDirection: 'row', gap: 10, marginTop: 8 },
  navBtn:         { flex: 1 },
});

export default ReviewScreen;
