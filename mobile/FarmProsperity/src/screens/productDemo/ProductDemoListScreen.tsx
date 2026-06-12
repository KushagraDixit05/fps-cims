/**
 * ProductDemoListScreen — Browse product demos.
 *
 * - Lists offline/local product demos stored in WatermelonDB
 * - FAB (+) → ProductDemoFormScreen
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import database from '../../database';
import { ProductDemoModel } from '../../database/models/ProductDemoModel';
import { colors } from '../../utils/colors';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import ScreenHeader from '../../components/ScreenHeader';
import AppIcon from '../../components/AppIcon';
import { Package, Plus, ChevronRight } from '../../utils/icons';
import type { RootStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<RootStackParamList>;

const ProductDemoListScreen = () => {
  const navigation = useNavigation<Nav>();
  const [demos, setDemos] = useState<ProductDemoModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDemos = useCallback(async () => {
    try {
      const records = await database.collections
        .get<ProductDemoModel>('product_demos')
        .query()
        .fetch();
      
      const sorted = [...records].sort((a, b) => b.createdAtLocal - a.createdAtLocal);
      setDemos(sorted);
    } catch (error) {
      console.warn('Failed to load product demos', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDemos();
    }, [loadDemos])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDemos();
    setRefreshing(false);
  }, [loadDemos]);

  if (loading) {
    return <LoadingScreen message="Loading demos…" />;
  }

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <ScreenHeader title="Product Performance Tracker" subtitle={`${demos.length} records`} onBack={() => navigation.goBack()} />

      {/* ── List ── */}
      <FlatList
        data={demos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={demos.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={Package}
            title="No product demos"
            subtitle="Tap + to add a product demo entry."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.8}
            onPress={() => {
              if (item.serverId) {
                navigation.navigate('ProductDemoDetail', { demoId: item.serverId });
              } else {
                Alert.alert(
                  'Pending Sync',
                  'This entry has not been synced yet. After-demo photo upload will be available after syncing.',
                );
              }
            }}
          >
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.title}>{item.farmerName}</Text>
                <Text style={styles.date}>
                  {new Date(item.createdAtLocal).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.subtitle}>{item.villageName} • {item.blockName}</Text>
              <View style={styles.productBadge}>
                <Text style={styles.productBadgeText}>
                  {item.productName} ({item.dose} {item.doseUnit})
                </Text>
              </View>
              <View style={styles.syncRow}>
                 {!item.isSynced ? (
                   <View style={styles.pendingBadge}>
                     <Text style={styles.pendingText}>Pending Sync</Text>
                   </View>
                 ) : item.afterPendingSync ? (
                   <View style={styles.pendingBadge}>
                     <Text style={styles.pendingText}>After Update Pending</Text>
                   </View>
                 ) : (item.demoPhase || (item.demoResult ? 'completed' : 'before')) === 'before' ? (
                   <View style={styles.awaitingBadge}>
                     <Text style={styles.awaitingText}>Awaiting Result</Text>
                   </View>
                 ) : (
                   <View style={styles.syncedBadge}>
                     <Text style={styles.syncedText}>Completed</Text>
                   </View>
                 )}
              </View>
            </View>
            <AppIcon icon={ChevronRight} size={18} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        )}
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ProductDemoForm')}
        activeOpacity={0.85}
      >
        <AppIcon icon={Plus} size={24} color="white" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 10,
  },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 2, paddingLeft: 0 },
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
  productBadge: { 
    alignSelf: 'flex-start',
    backgroundColor: '#E8F4FD', 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    paddingVertical: 4,
    marginBottom: 6
  },
  productBadgeText: { fontSize: 12, fontWeight: '600', color: '#0277BD' },
  syncRow: { flexDirection: 'row', marginTop: 2 },
  pendingBadge: { backgroundColor: '#FEF3DA', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  pendingText: { fontSize: 10, fontWeight: '700', color: '#C8900A' },
  syncedBadge: { backgroundColor: '#E1F2E8', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  syncedText: { fontSize: 10, fontWeight: '700', color: '#1A8A3A' },
  awaitingBadge: { backgroundColor: '#E8F0FE', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  awaitingText: { fontSize: 10, fontWeight: '700', color: '#1B5E9B' },
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

export default ProductDemoListScreen;
