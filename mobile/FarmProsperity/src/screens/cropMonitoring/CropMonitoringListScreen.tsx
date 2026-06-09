/**
 * CropMonitoringListScreen — Browse past field visits.
 *
 * - Lists all farmer visits stored in local WatermelonDB
 * - Pull-to-refresh reloads from local DB
 * - Tapping a synced record opens CropMonitoringDetail
 * - FAB (+) → CropMonitoringForm
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
import { FarmerVisitModel } from '../../database/models/FarmerVisitModel';
import { colors } from '../../utils/colors';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import ScreenHeader from '../../components/ScreenHeader';
import AppIcon from '../../components/AppIcon';
import { Leaf, Plus, ChevronRight } from '../../utils/icons';
import type { RootStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<RootStackParamList>;

const CropMonitoringListScreen = () => {
  const navigation = useNavigation<Nav>();
  const [visits, setVisits] = useState<FarmerVisitModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVisits = useCallback(async () => {
    try {
      const records = await database.collections
        .get<FarmerVisitModel>('farmer_visits')
        .query(Q.sortBy('created_at_local', Q.desc))
        .fetch();
      setVisits(records);
    } catch (err) {
      console.warn('Failed to load farmer visits', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVisits();
    }, [loadVisits]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVisits();
    setRefreshing(false);
  }, [loadVisits]);

  const getCropCount = (cropsJson: string): number => {
    try { return JSON.parse(cropsJson || '[]').length; } catch { return 0; }
  };

  if (loading) {
    return <LoadingScreen message="Loading visits…" />;
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Field Visits"
        subtitle={`${visits.length} record${visits.length !== 1 ? 's' : ''}`}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={visits.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={Leaf}
            title="No visits recorded"
            subtitle="Tap + to log a new field visit."
          />
        }
        renderItem={({ item }) => {
          const cropCount = getCropCount(item.cropsJson);
          const date = new Date(item.createdAtLocal).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          });
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.8}
              onPress={() => {
                if (!item.isSynced) return;
                navigation.navigate('CropMonitoringDetail', { visitId: item.serverId ?? item.id });
              }}
            >
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.title}>{item.farmerName}</Text>
                  <Text style={styles.date}>{date}</Text>
                </View>
                <Text style={styles.subtitle}>{item.villageName} • {item.blockName}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.cropBadge}>
                    <Text style={styles.cropBadgeText}>{cropCount} crop{cropCount !== 1 ? 's' : ''}</Text>
                  </View>
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
              {item.isSynced && (
                <AppIcon icon={ChevronRight} size={18} color={colors.textMuted} strokeWidth={2} />
              )}
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CropMonitoringForm')}
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
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  date: { fontSize: 11, color: colors.textMuted },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  cropBadge: {
    backgroundColor: '#E1F2E8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cropBadgeText: { fontSize: 12, fontWeight: '700', color: '#1A4A2E' },
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

export default CropMonitoringListScreen;
