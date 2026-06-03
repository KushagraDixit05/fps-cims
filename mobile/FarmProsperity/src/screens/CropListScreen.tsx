/**
 * CropListScreen — List of crop entries.
 *
 * - FlatList with farmer name, village, stage badge, condition badge, date
 * - Pull-to-refresh
 * - FAB (+) → CropEntryForm
 * - Tap → CropDetail
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { getCropEntries } from '../api/crops';
import { colors } from '../utils/colors';
import { formatDate, cropStageLabel } from '../utils/helpers';
import ConditionBadge from '../components/ConditionBadge';
import EmptyState from '../components/EmptyState';
import AppIcon from '../components/AppIcon';
import { Plus, ChevronRight, Leaf, IconStroke } from '../utils/icons';
import LoadingScreen from '../components/LoadingScreen';
import type { CropEntry } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Nav = StackNavigationProp<RootStackParamList>;

const CropListScreen = () => {
  const navigation = useNavigation<Nav>();

  const [entries, setEntries] = useState<CropEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const data = await getCropEntries();
      setEntries(data);
    } catch {
      Alert.alert('Error', 'Could not load crop entries. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }, [loadEntries]);

  if (loading) {
    return <LoadingScreen message="Loading crop entries…" />;
  }

  return (
    <View style={styles.root}>
      {/* ── Screen Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crop Entries</Text>
        <Text style={styles.headerCount}>{entries.length} records</Text>
      </View>

      {/* ── List ── */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          entries.length === 0 ? styles.emptyList : styles.list
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
            icon={Leaf}
            title="No crop entries yet"
            subtitle="Tap the + button to add your first field visit."
          />
        }
        renderItem={({ item }) => (
          <CropEntryRow
            entry={item}
            onPress={() => navigation.navigate('CropDetail', { entry: item })}
          />
        )}
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CropEntryForm')}
        activeOpacity={0.85}
      >
        <AppIcon icon={Plus} size={24} color="white" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
};

// ─── Row component ────────────────────────────────────────────────────────────

const CropEntryRow = ({
  entry,
  onPress,
}: {
  entry: CropEntry;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
    {/* Left accent */}
    <View
      style={[
        styles.rowAccent,
        {
          backgroundColor:
            entry.crop_condition === 'good'
              ? colors.good
              : entry.crop_condition === 'average'
              ? colors.average
              : colors.poor,
        },
      ]}
    />

    <View style={styles.rowBody}>
      {/* Top row */}
      <View style={styles.rowTop}>
        <Text style={styles.farmerName} numberOfLines={1}>
          {entry.farmer_name ?? `Farmer #${entry.farmer}`}
        </Text>
        <Text style={styles.dateText}>{formatDate(entry.visit_date)}</Text>
      </View>

      {/* Metadata */}
      <Text style={styles.meta}>
        {entry.village_name ?? ''}
        {entry.district ? ` · ${entry.district}` : ''}
      </Text>
      <Text style={styles.meta}>
        {entry.crop_name} · {entry.area_this_year} Ac
      </Text>

      {/* Badges */}
      <View style={styles.badgeRow}>
        <ConditionBadge condition={entry.crop_condition} compact />
        <View style={styles.stageBadge}>
          <Text style={styles.stageText}>
            {cropStageLabel(entry.crop_stage)}
          </Text>
        </View>
      </View>
    </View>

    <AppIcon icon={ChevronRight} size={18} color={colors.textMuted} strokeWidth={2} />
  </TouchableOpacity>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  headerCount: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },

  list: { padding: 12, paddingBottom: 80 },
  emptyList: { flex: 1 },

  row: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  rowAccent: { width: 4 },
  rowBody: { flex: 1, padding: 12 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  farmerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  dateText: { fontSize: 12, color: colors.textMuted },
  meta: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  stageBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: colors.background,
  },
  stageText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
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

export default CropListScreen;
