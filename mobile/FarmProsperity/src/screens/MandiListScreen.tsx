/**
 * MandiListScreen — Browse mandi arrivals.
 *
 * - Mandi picker at top (fetched from /api/mandis/)
 * - FlatList of arrivals for selected mandi
 * - YoY indicator per row (this year vs last year comparison badge)
 * - FAB (+) → MandiEntryForm
 * - Tap → MandiDetail
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { getMandis, getMandiArrivals, getYoYComparison } from '../api/mandi';
import { colors } from '../utils/colors';
import ScreenHeader from '../components/ScreenHeader';
import { formatDate, formatQuantity, formatCurrency } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import AppIcon from '../components/AppIcon';
import ShareIconButton from '../components/share/ShareIconButton';
import { useReceiptShare } from '../components/share/useReceiptShare';
import { buildMandiSharePayload } from '../utils/shareEntry';
import { Store, Plus, ChevronRight, IconStroke } from '../utils/icons';
import type { Mandi, MandiArrival, YoYComparison } from '../types';
import type { RootStackParamList } from '../navigation/types';

/** Build a share summary from an API arrival (summary fields only — no varieties). */
const mandiPayloadFromArrival = (arrival: MandiArrival) =>
  buildMandiSharePayload({
    mandiName: arrival.mandi_name ?? `Mandi #${arrival.mandi}`,
    date: arrival.date,
    totalArrivalQt: arrival.arrival_quantity,
    source: arrival.custom_source || arrival.source,
    avgRate: arrival.avg_rate ?? null,
    minRate: arrival.min_rate ?? null,
    maxRate: arrival.max_rate ?? null,
    remark: arrival.remark,
  });

type Nav = StackNavigationProp<RootStackParamList>;

const MandiListScreen = () => {
  const navigation = useNavigation<Nav>();
  const { shareEntry, receiptHost } = useReceiptShare();

  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [selectedMandi, setSelectedMandi] = useState<Mandi | null>(null);
  const [arrivals, setArrivals] = useState<MandiArrival[]>([]);
  const [yoy, setYoY] = useState<YoYComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load mandis once on mount
  useEffect(() => {
    const loadMandis = async () => {
      try {
        const data = await getMandis();
        setMandis(data);
        if (data.length > 0) {
          setSelectedMandi(data[0]);
        } else {
          setLoading(false);
        }
      } catch {
        Alert.alert('Error', 'Could not load mandi list.');
        setLoading(false);
      }
    };
    loadMandis();
  }, []);

  // Load arrivals whenever selected mandi changes
  const loadArrivals = useCallback(async () => {
    if (!selectedMandi) return;
    try {
      const [arrData, yoyData] = await Promise.all([
        getMandiArrivals({ mandiId: selectedMandi.id }),
        getYoYComparison(selectedMandi.id),
      ]);
      setArrivals(arrData);
      setYoY(yoyData);
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }, [selectedMandi]);

  useEffect(() => {
    setLoading(true);
    loadArrivals();
  }, [loadArrivals]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadArrivals();
    setRefreshing(false);
  }, [loadArrivals]);

  if (loading && mandis.length === 0) {
    return <LoadingScreen message="Loading mandis…" />;
  }

  return (
    <View style={styles.root}>
      {receiptHost}
      {/* ── Header ── */}
      <ScreenHeader title="Market Intelligence Module" subtitle={`${arrivals.length} records`} onBack={() => navigation.navigate('Home' as any)} />

      {/* ── Mandi Picker ── */}
      <View style={styles.pickerSection}>
        <Text style={styles.pickerLabel}>Select Mandi:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mandiScroll}
        >
          {mandis.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.mandiChip,
                selectedMandi?.id === m.id && styles.mandiChipActive,
              ]}
              onPress={() => setSelectedMandi(m)}
            >
              <Text
                style={[
                  styles.mandiChipText,
                  selectedMandi?.id === m.id && styles.mandiChipTextActive,
                ]}
              >
                {m.name}
              </Text>
              <Text
                style={[
                  styles.mandiChipSub,
                  selectedMandi?.id === m.id && styles.mandiChipSubActive,
                ]}
              >
                {m.district}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── YoY Summary Strip ── */}
      {yoy && (
        <View style={styles.yoyStrip}>
          <Text style={styles.yoyTitle}>Year-on-Year · {yoy.commodity}</Text>
          <View style={styles.yoyRow}>
            <YoYCell
              label={`${yoy.this_year.year}`}
              qty={yoy.this_year.total_quantity}
              isHigher={
                (yoy.this_year.total_quantity ?? 0) >=
                (yoy.last_year.total_quantity ?? 0)
              }
            />
            <Text style={styles.yoyVs}>vs</Text>
            <YoYCell
              label={`${yoy.last_year.year}`}
              qty={yoy.last_year.total_quantity}
              isHigher={false}
              muted
            />
          </View>
        </View>
      )}

      {/* ── List ── */}
      {loading ? (
        <LoadingScreen message="Loading arrivals…" />
      ) : (
        <FlatList
          data={arrivals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            arrivals.length === 0 ? styles.emptyList : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Store}
              title="No arrivals recorded"
              subtitle="Tap + to add a mandi arrival entry."
            />
          }
          renderItem={({ item }) => (
            <ArrivalRow
              arrival={item}
              yoy={yoy}
              onPress={() => navigation.navigate('MandiDetail', { arrival: item })}
              onShare={() => shareEntry(mandiPayloadFromArrival(item))}
            />
          )}
        />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('MandiArrivalForm')}
        activeOpacity={0.85}
      >
        <AppIcon icon={Plus} size={24} color="white" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const YoYCell = ({
  label,
  qty,
  isHigher,
  muted = false,
}: {
  label: string;
  qty: number | null;
  isHigher: boolean;
  muted?: boolean;
}) => (
  <View style={styles.yoyCell}>
    <Text style={[styles.yoyCellQty, muted && styles.yoyMuted]}>
      {qty != null ? `${Number(qty).toLocaleString('en-IN')} Qt` : '—'}
    </Text>
    <View style={styles.yoyCellBottom}>
      {!muted && (
        <Text style={isHigher ? styles.yoyUp : styles.yoyDown}>
          {isHigher ? '▲' : '▼'}
        </Text>
      )}
      <Text style={[styles.yoyCellLabel, muted && styles.yoyMuted]}>{label}</Text>
    </View>
  </View>
);

const ArrivalRow = ({
  arrival,
  yoy,
  onPress,
  onShare,
}: {
  arrival: MandiArrival;
  yoy: YoYComparison | null;
  onPress: () => void;
  onShare: () => void;
}) => {
  // Determine if this entry's quantity is above the YoY avg
  const isAbove =
    yoy?.last_year.total_quantity != null &&
    yoy.last_year.entries > 0 &&
    arrival.arrival_quantity >
      yoy.last_year.total_quantity / yoy.last_year.entries;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.commodity}>{arrival.commodity}</Text>
          <Text style={styles.dateText}>{formatDate(arrival.date)}</Text>
        </View>
        <View style={styles.rowMid}>
          <View>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <Text style={styles.quantity}>
              {formatQuantity(arrival.arrival_quantity)}
            </Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Avg Rate</Text>
            <Text style={styles.price}>{formatCurrency(arrival.avg_rate)}</Text>
          </View>
          <View>
            {isAbove !== undefined && (
              <View
                style={[
                  styles.yoyBadge,
                  { backgroundColor: isAbove ? colors.goodBg : colors.poorBg },
                ]}
              >
                <Text
                  style={[
                    styles.yoyBadgeText,
                    { color: isAbove ? colors.good : colors.poor },
                  ]}
                >
                  {isAbove ? '▲ Above' : '▼ Below'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.sourceBadge}>{arrival.source}</Text>
      </View>
      <View style={styles.rowActions}>
        <ShareIconButton onPress={onShare} />
        <AppIcon icon={ChevronRight} size={18} color={colors.textMuted} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  // Mandi picker
  pickerSection: {
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingLeft: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  mandiScroll: { gap: 8, paddingRight: 14 },
  mandiChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.background,
    minWidth: 90,
  },
  mandiChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  mandiChipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  mandiChipTextActive: { color: colors.primary },
  mandiChipSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  mandiChipSubActive: { color: colors.primaryMid },

  // YoY strip
  yoyStrip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  yoyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  yoyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yoyCell: { alignItems: 'flex-start' },
  yoyCellQty: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  yoyCellBottom: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  yoyCellLabel: { fontSize: 11, color: colors.textSecondary },
  yoyVs: { fontSize: 12, color: colors.textMuted, marginHorizontal: 4 },
  yoyUp: { color: colors.good, fontWeight: '700', fontSize: 12 },
  yoyDown: { color: colors.poor, fontWeight: '700', fontSize: 12 },
  yoyMuted: { color: colors.textMuted },

  // List
  list: { padding: 12, paddingBottom: 80 },
  emptyList: { flex: 1 },

  row: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  rowBody: { flex: 1, padding: 12 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commodity: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  dateText: { fontSize: 12, color: colors.textMuted },
  rowMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quantityLabel: { fontSize: 11, color: colors.textSecondary },
  quantity: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  priceCol: {},
  priceLabel: { fontSize: 11, color: colors.textSecondary },
  price: { fontSize: 15, fontWeight: '600', color: colors.primary },
  yoyBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  yoyBadgeText: { fontSize: 11, fontWeight: '600' },
  sourceBadge: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  _removed_chevron: {
    alignSelf: 'center',
    fontSize: 22,
    color: colors.textMuted,
    paddingRight: 12,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});

export default MandiListScreen;
