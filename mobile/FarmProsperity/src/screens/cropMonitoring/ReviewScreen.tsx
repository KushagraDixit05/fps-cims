// src/screens/cropMonitoring/ReviewScreen.tsx
// Read-only summary screen. Shows all entered data before final submission.

import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { colors } from '../../utils/colors';
import Button from '../../components/Button';
import Card from '../../components/Card';
import AppIcon from '../../components/AppIcon';
import ShareReceiptCard from '../../components/share/ShareReceiptCard';
import { Share2, IconStroke } from '../../utils/icons';
import { shareReviewDetails } from '../../utils/shareReviewDetails';
import { buildCropSharePayload } from '../../utils/shareEntry';
import type { CropMonitoringFormState } from '../../types/cropMonitoring';
import { OTHERS_VALUE, resolveOthersValue } from '../../utils/othersValidation';

interface ReviewScreenProps {
  state: CropMonitoringFormState;
  onEditFarmer: () => void;
  onEditCrops: () => void;
  onEditPhotos: () => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
}

// ── Helper row ────────────────────────────────────────────────────────────────
const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

// ── Section header with optional EDIT link ────────────────────────────────────
const SectionHeader = ({
  title,
  onEdit,
}: {
  title: string;
  onEdit?: () => void;
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {onEdit && (
      <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.editLink}>EDIT</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── Condition badge ───────────────────────────────────────────────────────────
const conditionColor = (c: string) =>
  c === 'good' ? colors.good : c === 'poor' ? colors.poor : colors.average;
const conditionBg = (c: string) =>
  c === 'good' ? colors.goodBg : c === 'poor' ? colors.poorBg : colors.averageBg;

// ── Main component ────────────────────────────────────────────────────────────
const ReviewScreen = ({
  state,
  onEditFarmer,
  onEditCrops,
  onEditPhotos,
  onSubmit,
  onBack,
  submitting,
}: ReviewScreenProps) => {
  const { farmerDetails, crops, photos, location, remark } = state;
  const shareRef = useRef<React.ElementRef<typeof ViewShot>>(null);

  const locationStr =
    location.captured && location.latitude !== null
      ? `${Math.abs(location.latitude).toFixed(4)}° N, ${Math.abs(location.longitude!).toFixed(4)}° E`
      : 'Not captured';

  const sharePayload = buildCropSharePayload({
    farmerName: farmerDetails.farmer_name,
    village: farmerDetails.village_name,
    block: resolveOthersValue(farmerDetails.block_name, farmerDetails.custom_block_name ?? ''),
    district: farmerDetails.district_name,
    mobile: farmerDetails.mobile_number,
    totalLandAcre: farmerDetails.total_land_acre,
    locationDisplay: locationStr,
    photoCount: photos.length,
    date: crops[0]?.date_of_sowing || new Date().toISOString().slice(0, 10),
    remark,
    crops: crops.map((crop) => ({
      name: resolveOthersValue(crop.crop_name, crop.custom_crop_name ?? ''),
      varieties: (crop.varieties ?? [])
        .map((v) => (v.variety === OTHERS_VALUE ? (v.custom_variety || 'Others') : v.variety))
        .filter(Boolean)
        .join(', '),
      areaAcre: crop.current_area_acre,
      condition: crop.crop_condition,
    })),
  });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Off-screen branded card captured for image sharing */}
      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot ref={shareRef}>
          <ShareReceiptCard data={sharePayload} />
        </ViewShot>
      </View>

      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Review & Confirm</Text>
          <Text style={styles.subtext}>
            Please verify all details before submitting.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => shareReviewDetails(sharePayload, shareRef)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon icon={Share2} size={20} color={colors.primary} strokeWidth={IconStroke} />
        </TouchableOpacity>
      </View>

      {/* ── Farmer Details ── */}
      <Card>
        <SectionHeader title="Farmer Details" onEdit={onEditFarmer} />
        <Row label="Farmer Name" value={farmerDetails.farmer_name} />
        <Row label="Mobile Number" value={farmerDetails.mobile_number} />
        <Row label="Village / Block" value={`${farmerDetails.village_name} / ${resolveOthersValue(farmerDetails.block_name, farmerDetails.custom_block_name ?? '')}`} />
        <Row label="District" value={farmerDetails.district_name} />
        <Row label="Total Land (Acre)" value={farmerDetails.total_land_acre} />
      </Card>

      {/* ── Crops ── */}
      <Card>
        <SectionHeader
          title={`Crops Added (${crops.length})`}
          onEdit={onEditCrops}
        />
        {/* Table header */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, styles.tableHeadText, { flex: 2 }]}>Crop</Text>
          <Text style={[styles.tableCell, styles.tableHeadText, { flex: 2 }]}>Varieties</Text>
          <Text style={[styles.tableCell, styles.tableHeadText]}>Area</Text>
          <Text style={[styles.tableCell, styles.tableHeadText]}>Condition</Text>
        </View>
        {crops.map((crop, i) => {
          const varietyDisplay = (crop.varieties ?? [])
            .map((v) => v.variety === OTHERS_VALUE ? (v.custom_variety || 'Others') : v.variety)
            .filter(Boolean)
            .join(', ') || '—';
          return (
            <View key={crop.localKey} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                {i + 1}. {resolveOthersValue(crop.crop_name, crop.custom_crop_name ?? '')}
              </Text>
              <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={2}>
                {varietyDisplay}
              </Text>
              <Text style={styles.tableCell} numberOfLines={1}>
                {crop.current_area_acre} ac
              </Text>
              <View style={styles.tableCell}>
                <View
                  style={[
                    styles.condBadge,
                    { backgroundColor: conditionBg(crop.crop_condition) },
                  ]}
                >
                  <Text
                    style={[
                      styles.condBadgeText,
                      { color: conditionColor(crop.crop_condition) },
                    ]}
                  >
                    {crop.crop_condition || '—'}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      {/* ── Photos / Location / Remark ── */}
      <Card>
        <SectionHeader title="Photos, Location & Remark" onEdit={onEditPhotos} />

        {/* Photo thumbnails strip */}
        <View style={styles.photoStrip}>
          {photos.slice(0, 4).map((p) => (
            <Image key={p.uri} source={{ uri: p.uri }} style={styles.photoThumb} />
          ))}
          {photos.length > 4 && (
            <View style={styles.photoMore}>
              <Text style={styles.photoMoreText}>+{photos.length - 4}</Text>
            </View>
          )}
          {photos.length === 0 && (
            <Text style={styles.noneText}>No photos added</Text>
          )}
        </View>

        <Row
          label="Photos"
          value={`${photos.length} photo${photos.length !== 1 ? 's' : ''}`}
        />
        <Row
          label="Location"
          value={
            location.captured && location.latitude !== null
              ? `${Math.abs(location.latitude).toFixed(4)}° N, ${Math.abs(location.longitude!).toFixed(4)}° E`
              : 'Not captured'
          }
        />
        <Row label="Remark" value={remark || 'None'} />
      </Card>

      {/* ── Nav buttons ── */}
      <View style={styles.navRow}>
        <Button
          title="BACK"
          onPress={onBack}
          variant="secondary"
          style={styles.navBtn}
        />
        <Button
          title={submitting ? 'Submitting...' : 'SUBMIT ENTRY'}
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
  headingRow:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 0 },
  shareBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  offscreen:      { position: 'absolute', left: -9999, top: 0 },

  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  editLink:       { fontSize: 12, fontWeight: '700', color: colors.primary },

  row:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  rowLabel:       { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue:       { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 2, textAlign: 'right' },

  tableRow:       { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  tableHeader:    { backgroundColor: colors.background, borderRadius: 6, marginBottom: 2 },
  tableHeadText:  { fontWeight: '700', color: colors.textMuted, fontSize: 11 },
  tableCell:      { flex: 1, fontSize: 12, color: colors.textPrimary },

  condBadge:      { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  condBadgeText:  { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  photoStrip:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  photoThumb:     { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.borderLight },
  photoMore:      { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  photoMoreText:  { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  noneText:       { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },

  navRow:         { flexDirection: 'row', gap: 10, marginTop: 8 },
  navBtn:         { flex: 1 },
});

export default ReviewScreen;
