/**
 * MandiDetailScreen — Full detail of one mandi arrival + YoY comparison.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { getYoYComparison } from '../api/mandi';
import { colors } from '../utils/colors';
import { formatDate, formatQuantity, formatCurrency } from '../utils/helpers';
import Card from '../components/Card';
import ShareIconButton from '../components/share/ShareIconButton';
import { useReceiptShare } from '../components/share/useReceiptShare';
import { buildMandiSharePayload } from '../utils/shareEntry';
import type { YoYComparison } from '../types';
import type { RootStackParamList } from '../navigation/types';

type MandiDetailRoute = RouteProp<RootStackParamList, 'MandiDetail'>;

const MandiDetailScreen = () => {
  const { params } = useRoute<MandiDetailRoute>();
  const { arrival } = params;
  const { shareEntry, receiptHost } = useReceiptShare();

  const [yoy, setYoY] = useState<YoYComparison | null>(null);
  const [yoyLoading, setYoyLoading] = useState(true);

  useEffect(() => {
    getYoYComparison(arrival.mandi, arrival.commodity)
      .then(setYoY)
      .catch(() => {})
      .finally(() => setYoyLoading(false));
  }, [arrival.mandi, arrival.commodity]);

  const sharePayload = buildMandiSharePayload({
    mandiName: arrival.mandi_name ?? `Mandi #${arrival.mandi}`,
    date: arrival.date,
    totalArrivalQt: arrival.arrival_quantity,
    source: arrival.custom_source || arrival.source,
    avgRate: arrival.avg_rate ?? null,
    minRate: arrival.min_rate ?? null,
    maxRate: arrival.max_rate ?? null,
    remark: arrival.remark,
  });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {receiptHost}
      <Card>
        <ShareIconButton onPress={() => shareEntry(sharePayload)} style={styles.shareBtn} />
        <Text style={styles.commodity}>{arrival.commodity}</Text>
        <Text style={styles.mandiName}>{arrival.mandi_name ?? `Mandi #${arrival.mandi}`}</Text>
        <Text style={styles.meta}>{arrival.mandi_state}</Text>
        <Text style={styles.meta}>Date: {formatDate(arrival.date)}</Text>
      </Card>

      <SectionCard title="Arrival Data">
        <DetailRow label="Quantity" value={formatQuantity(arrival.arrival_quantity)} />
        <DetailRow label="Source" value={arrival.source} />
        {arrival.remark ? <Text style={styles.remark}>{arrival.remark}</Text> : null}
      </SectionCard>

      {(arrival.avg_rate != null || arrival.min_rate != null || arrival.max_rate != null) && (
        <SectionCard title="Price Data">
          {arrival.avg_rate != null && <DetailRow label="Avg Rate" value={formatCurrency(arrival.avg_rate)} />}
          {arrival.min_rate != null && <DetailRow label="Min Rate" value={formatCurrency(arrival.min_rate)} />}
          {arrival.max_rate != null && <DetailRow label="Max Rate" value={formatCurrency(arrival.max_rate)} />}
        </SectionCard>
      )}

      <Card style={styles.yoyCard}>
        <Text style={styles.sectionTitle}>Year-on-Year · {arrival.commodity}</Text>
        {yoyLoading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : yoy ? (
          <View style={styles.yoyGrid}>
            <View style={styles.yoyBlock}>
              <Text style={[styles.yoyYear, { color: colors.primary }]}>{yoy.this_year.year}</Text>
              <Text style={styles.yoyQty}>
                {yoy.this_year.total_quantity != null
                  ? `${Number(yoy.this_year.total_quantity).toLocaleString('en-IN')} Qt`
                  : '—'}
              </Text>
              <Text style={styles.yoyEntries}>{yoy.this_year.entries} entries</Text>
              <Text style={
                (yoy.this_year.total_quantity ?? 0) >= (yoy.last_year.total_quantity ?? 0)
                  ? styles.yoyUp : styles.yoyDown
              }>
                {(yoy.this_year.total_quantity ?? 0) >= (yoy.last_year.total_quantity ?? 0)
                  ? '▲ Above last year' : '▼ Below last year'}
              </Text>
            </View>
            <View style={styles.yoySep} />
            <View style={styles.yoyBlock}>
              <Text style={styles.yoyYear}>{yoy.last_year.year}</Text>
              <Text style={[styles.yoyQty, { color: colors.textMuted }]}>
                {yoy.last_year.total_quantity != null
                  ? `${Number(yoy.last_year.total_quantity).toLocaleString('en-IN')} Qt`
                  : '—'}
              </Text>
              <Text style={styles.yoyEntries}>{yoy.last_year.entries} entries</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.yoyError}>YoY data unavailable</Text>
        )}
      </Card>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </Card>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 14 },
  shareBtn: { position: 'absolute', top: 8, right: 8, zIndex: 1 },
  commodity: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  mandiName: { fontSize: 15, fontWeight: '600', color: colors.primary, marginBottom: 2 },
  meta: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  sectionCard: { marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', textTransform: 'capitalize' },
  remark: { fontSize: 13, color: colors.textPrimary, marginTop: 8, fontStyle: 'italic' },
  yoyCard: { marginBottom: 10 },
  yoyGrid: { flexDirection: 'row', gap: 14 },
  yoySep: { width: 0.5, backgroundColor: colors.border },
  yoyBlock: { flex: 1 },
  yoyYear: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  yoyQty: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  yoyEntries: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  yoyUp: { fontSize: 12, color: colors.good, fontWeight: '600', marginTop: 4 },
  yoyDown: { fontSize: 12, color: colors.poor, fontWeight: '600', marginTop: 4 },
  yoyError: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
});

export default MandiDetailScreen;
