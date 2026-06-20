// src/screens/mandiArrival/ReviewScreen.tsx
// Read-only summary screen. Shows all entered data before final submission.
// Mirrors cropMonitoring/ReviewScreen.tsx structure exactly.

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../../utils/colors';
import Button from '../../components/Button';
import Card from '../../components/Card';
import AppIcon from '../../components/AppIcon';
import { Share2, IconStroke } from '../../utils/icons';
import { shareReviewDetails } from '../../utils/shareReviewDetails';
import type { MandiArrivalFormState } from '../../types/mandiArrival';
import { resolveOthersValue } from '../../utils/othersValidation';

interface ReviewScreenProps {
  state: MandiArrivalFormState;
  onEditMandi: () => void;
  onEditVarieties: () => void;
  onEditSource: () => void;
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

// ── Main component ────────────────────────────────────────────────────────────
const ReviewScreen = ({
  state,
  onEditMandi,
  onEditVarieties,
  onEditSource,
  onSubmit,
  onBack,
  submitting,
}: ReviewScreenProps) => {
  const { mandiDetails, varieties, source, custom_source, remark, photos, location } = state;

  const locationStr =
    location.captured && location.latitude !== null
      ? `${Math.abs(location.latitude).toFixed(4)}° N, ${Math.abs(location.longitude!).toFixed(4)}° E`
      : 'Not captured';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Review Details</Text>
          <Text style={styles.subtext}>
            Please verify all details before submitting.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => shareReviewDetails({
            module: 'Market Intelligence',
            mandiName: mandiDetails.mandi_name || mandiDetails.custom_mandi_name || '',
            date: mandiDetails.date,
            location: mandiDetails.mandi_name || 'N/A',
            cropDetails: varieties.map(v => resolveOthersValue(v.crop_variety_name, v.custom_crop_variety_name ?? '')).join(', '),
            observations: remark || undefined,
            summary: `Total Arrival: ${mandiDetails.total_arrival_qt || 'N/A'} Qt \u00b7 ${varieties.length} varieties`,
          })}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon icon={Share2} size={20} color={colors.primary} strokeWidth={IconStroke} />
        </TouchableOpacity>
      </View>

      {/* ── Mandi Details ── */}
      <Card>
        <SectionHeader title="Mandi Details" onEdit={onEditMandi} />
        <Row label="Mandi Name" value={mandiDetails.mandi_name || `Mandi #${mandiDetails.mandi_id}`} />
        <Row label="Date" value={mandiDetails.date} />
        <Row label="Total Arrival (All Crops)" value={mandiDetails.total_arrival_qt ? `${mandiDetails.total_arrival_qt} Quintal` : '—'} />
      </Card>

      {/* ── Crop Variety Details ── */}
      <Card>
        <SectionHeader
          title={`Crop Variety Details (${varieties.length})`}
          onEdit={onEditVarieties}
        />
        {/* Table header */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, styles.tableHeadText, { flex: 2 }]}>Variety Name</Text>
          <Text style={[styles.tableCell, styles.tableHeadText]}>Qty (Qt)</Text>
          <Text style={[styles.tableCell, styles.tableHeadText]}>Top Rate</Text>
          <Text style={[styles.tableCell, styles.tableHeadText]}>Mostly Sales</Text>
          <Text style={[styles.tableCell, styles.tableHeadText]}>Bottom Rate</Text>
        </View>
        {varieties.map((v, i) => (
          <View key={v.localKey} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={2}>
              {i + 1}. {resolveOthersValue(v.crop_variety_name, v.custom_crop_variety_name ?? '')}
            </Text>
            <Text style={styles.tableCell} numberOfLines={1}>{v.quantity_qt || '—'}</Text>
            <Text style={styles.tableCell} numberOfLines={1}>{v.top_rate || '—'}</Text>
            <Text style={styles.tableCell} numberOfLines={1}>{v.mostly_sales_rate || '—'}</Text>
            <Text style={styles.tableCell} numberOfLines={1}>{v.bottom_rate || '—'}</Text>
          </View>
        ))}
      </Card>

      {/* ── Source, Remark, Photos, Location ── */}
      <Card>
        <SectionHeader title="Source, Photos & Location" onEdit={onEditSource} />
        <Row label="Source" value={resolveOthersValue(source, custom_source ?? '') || '—'} />
        <Row label="Remark" value={remark || 'None'} />
        <Row
          label="Photos"
          value={`${photos.length} photo${photos.length !== 1 ? 's' : ''}`}
        />
        <Row label="Location" value={locationStr} />
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
          title={submitting ? 'Submitting…' : 'SUBMIT ENTRY'}
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

  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  editLink:       { fontSize: 12, fontWeight: '700', color: colors.primary },

  row:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  rowLabel:       { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue:       { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 2, textAlign: 'right' },

  tableRow:       { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  tableHeader:    { backgroundColor: colors.background, borderRadius: 6, marginBottom: 2 },
  tableHeadText:  { fontWeight: '700', color: colors.textMuted, fontSize: 10 },
  tableCell:      { flex: 1, fontSize: 11, color: colors.textPrimary },

  navRow:         { flexDirection: 'row', gap: 10, marginTop: 8 },
  navBtn:         { flex: 1 },
});

export default ReviewScreen;
