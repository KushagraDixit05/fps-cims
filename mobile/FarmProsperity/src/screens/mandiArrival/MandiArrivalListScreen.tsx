/**
 * MandiArrivalListScreen — Browse past Market Intelligence entries.
 *
 * Mirrors CropMonitoringListScreen (the "Visits" list) exactly:
 * - Lists all mandi arrival entries stored in local WatermelonDB
 * - Pull-to-refresh + reload on focus
 * - Tapping a synced record opens MandiDetail
 * - FAB (+) → MandiArrivalForm (existing 4-step wizard)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Q } from '@nozbe/watermelondb';
import database from '../../database';
import { MandiArrivalModel } from '../../database/models/MandiArrivalModel';
import { colors } from '../../utils/colors';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import ScreenHeader from '../../components/ScreenHeader';
import AppIcon from '../../components/AppIcon';
import ShareIconButton from '../../components/share/ShareIconButton';
import { useReceiptShare } from '../../components/share/useReceiptShare';
import { buildMandiSharePayload } from '../../utils/shareEntry';
import { formatDate } from '../../utils/helpers';
import { Store, Plus, ChevronRight } from '../../utils/icons';
import type { MandiArrival } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<RootStackParamList>;

const varietyCount = (varietiesJson: string | null): number => {
  try { return JSON.parse(varietiesJson || '[]').length; } catch { return 0; }
};

/** Map a persisted local record to the API MandiArrival shape MandiDetail expects. */
const arrivalFromModel = (m: MandiArrivalModel): MandiArrival => ({
  id: m.serverId ?? m.id,
  mandi: m.mandiId,
  mandi_name: m.mandiName ?? m.mandiCustomName ?? undefined,
  commodity: m.commodity,
  date: m.date,
  arrival_quantity: m.arrivalQuantity,
  avg_rate: m.avgRate ?? undefined,
  min_rate: m.minRate ?? undefined,
  max_rate: m.maxRate ?? undefined,
  source: m.source as MandiArrival['source'],
  custom_source: m.customSource ?? undefined,
  remark: m.remark ?? '',
});

/** Build a share summary from a persisted record (no network needed). */
const mandiPayloadFromModel = (m: MandiArrivalModel) =>
  buildMandiSharePayload({
    mandiName: m.mandiName ?? m.mandiCustomName ?? 'Mandi',
    date: m.date,
    totalArrivalQt: m.totalArrivalQt ?? m.arrivalQuantity,
    source: m.customSource || m.source,
    avgRate: m.avgRate,
    minRate: m.minRate,
    maxRate: m.maxRate,
    remark: m.remark,
  });

const MandiArrivalListScreen = () => {
  const navigation = useNavigation<Nav>();
  const { shareEntry, receiptHost } = useReceiptShare();
  const [entries, setEntries] = useState<MandiArrivalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const records = await database.collections
        .get<MandiArrivalModel>('mandi_arrivals')
        .query(Q.sortBy('created_at_local', Q.desc))
        .fetch();
      setEntries(records);
    } catch (err) {
      console.warn('Failed to load mandi arrivals', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }, [loadEntries]);

  if (loading) {
    return <LoadingScreen message="Loading entries…" />;
  }

  return (
    <View style={styles.root}>
      {receiptHost}
      <ScreenHeader
        title="Market Intelligence Module — Entries"
        subtitle={`${entries.length} record${entries.length !== 1 ? 's' : ''}`}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={entries.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={Store}
            title="No entries recorded"
            subtitle="Tap + to add a market entry."
          />
        }
        renderItem={({ item }) => {
          const count = varietyCount(item.varietiesJson);
          const mandiName = item.mandiName || item.mandiCustomName || 'Mandi';
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.8}
              onPress={() => {
                if (!item.isSynced) return;
                navigation.navigate('MandiDetail', { arrival: arrivalFromModel(item) });
              }}
            >
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.title}>{mandiName}</Text>
                  <Text style={styles.date}>{formatDate(item.date)}</Text>
                </View>
                <Text style={styles.subtitle}>
                  {count > 0 ? `${count} variet${count !== 1 ? 'ies' : 'y'}` : item.commodity || 'Mandi arrival'}
                </Text>
                <View style={styles.badgeRow}>
                  {!item.isSynced ? (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>Pending Sync</Text>
                    </View>
                  ) : (
                    <View style={styles.syncedBadge}>
                      <Text style={styles.syncedText}>Synced</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.rowActions}>
                <ShareIconButton onPress={() => shareEntry(mandiPayloadFromModel(item))} />
                {item.isSynced && (
                  <AppIcon icon={ChevronRight} size={18} color={colors.textMuted} strokeWidth={2} />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: 12, paddingBottom: 80 },
  emptyList: { flex: 1 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  rowBody: { flex: 1, paddingRight: 8 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  date: { fontSize: 11, color: colors.textMuted },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  pendingBadge: { backgroundColor: '#FEF3DA', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  pendingText: { fontSize: 10, fontWeight: '700', color: '#C8900A' },
  syncedBadge: { backgroundColor: '#E1F2E8', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  syncedText: { fontSize: 10, fontWeight: '700', color: '#1A8A3A' },
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

export default MandiArrivalListScreen;
