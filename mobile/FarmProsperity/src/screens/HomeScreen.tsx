/**
 * HomeScreen — Dashboard
 *
 * Updated for Phase F (Crop Monitoring):
 *  - Top stats row now shows visit summary: Today / This Week / This Month / Team
 *  - "Crop Monitoring" quick-action card navigates to CropMonitoringForm
 *  - Recent Entries list shows FarmerVisits (not legacy CropEntries)
 *  - Tapping a visit entry → CropMonitoringDetail screen
 *  - Pull-to-refresh reloads both summary and recent entries
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Q } from '@nozbe/watermelondb';

import { getVisitSummary, getFarmerVisits } from '../api/cropMonitoring';
import { useAuth } from '../store/authStore';
import { colors } from '../utils/colors';
import database from '../database';
import { FarmerVisitModel } from '../database/models/FarmerVisitModel';
import type { FarmerVisitSummary, RecentVisit } from '../types/cropMonitoring';
import type { RootStackParamList } from '../navigation/types';
import AppIcon from '../components/AppIcon';
import {
  Leaf, Store, Map, BarChart2, MapPin,
  Sprout, ArrowRight, ChevronRight, IconStroke,
} from '../utils/icons';

type Nav = StackNavigationProp<RootStackParamList>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const localToRecentVisit = (v: FarmerVisitModel): RecentVisit => ({
  id: v.serverId ?? v.id,
  farmer_name: v.farmerName,
  village_name: v.villageName,
  block_name: v.blockName,
  district_name: v.districtName,
  crop_count: (() => {
    try { return JSON.parse(v.cropsJson || '[]').length; } catch { return 0; }
  })(),
  submitted_at: new Date(v.createdAtLocal).toISOString(),
  _pending: !v.isSynced,
});

const buildLocalSummary = (records: FarmerVisitModel[]): FarmerVisitSummary => {
  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const weekStart  = now - 7 * 24 * 60 * 60 * 1000;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  return {
    today:        records.filter(v => v.createdAtLocal >= todayStart).length,
    this_week:    records.filter(v => v.createdAtLocal >= weekStart).length,
    this_month:   records.filter(v => v.createdAtLocal >= monthStart).length,
    team_members: 1,
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [summary, setSummary] = useState<FarmerVisitSummary | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoadingVisits(true);

    // Phase 1 — instant local read (WatermelonDB)
    let localRecords: FarmerVisitModel[] = [];
    try {
      localRecords = await database.collections
        .get<FarmerVisitModel>('farmer_visits')
        .query()
        .fetch();

      if (localRecords.length > 0) {
        const sorted = [...localRecords].sort((a, b) => b.createdAtLocal - a.createdAtLocal);
        setRecentVisits(sorted.slice(0, 10).map(localToRecentVisit));
        setSummary(buildLocalSummary(sorted));
      }
    } catch { /* DB unavailable */ }

    // Phase 2 — authoritative API read
    try {
      const [sum, paginated] = await Promise.all([
        getVisitSummary(),
        getFarmerVisits(1),
      ]);

      const pendingLocal = localRecords
        .filter(v => !v.isSynced)
        .sort((a, b) => b.createdAtLocal - a.createdAtLocal)
        .map(localToRecentVisit);

      const serverIds = new Set((paginated.results ?? []).map(r => r.id));
      const trulyPending = pendingLocal.filter(p => !serverIds.has(p.id));

      const todayStart = new Date().setHours(0, 0, 0, 0);
      const weekStart  = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

      setSummary({
        ...sum,
        today:      sum.today      + trulyPending.filter(p => new Date(p.submitted_at).getTime() >= todayStart).length,
        this_week:  sum.this_week  + trulyPending.filter(p => new Date(p.submitted_at).getTime() >= weekStart).length,
        this_month: sum.this_month + trulyPending.filter(p => new Date(p.submitted_at).getTime() >= monthStart).length,
      });
      setRecentVisits([...trulyPending, ...(paginated.results ?? [])]);
    } catch {
      // API unavailable — local data from Phase 1 remains displayed
    } finally {
      setLoadingVisits(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { loadData(); }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleVisitPress = useCallback((visit: RecentVisit) => {
    if (visit._pending) {
      Alert.alert('Pending Sync', 'This visit is saved locally and will sync when you go online.');
      return;
    }
    navigation.navigate('CropMonitoringDetail', { visitId: visit.id });
  }, [navigation]);

  const displayName = user ? user.first_name || user.username : 'User';

  return (
    <ScrollView
      style={styles.root}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {displayName}</Text>
          <Text style={styles.role}>
            {user?.role === 'field_executive' ? 'Field Executive' : user?.role ?? ''}
          </Text>
          {user?.region ? (
            <View style={styles.regionRow}>
              <AppIcon icon={MapPin} size={11} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              <Text style={styles.region}> {user.region}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.75}
        >
          <Text style={styles.profileInitial}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Visit Summary Strip (Today / Week / Month / Team) ── */}
      <View style={styles.summaryStrip}>
        <SummaryTile label="Today" value={summary?.today} />
        <SummaryTile label="This Week" value={summary?.this_week} />
        <SummaryTile label="This Month" value={summary?.this_month} />
        <SummaryTile label="Team" value={summary?.team_members} />
      </View>

      {/* ── Quick Actions ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
      </View>
      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.menuCard, { backgroundColor: colors.primaryLight }]}
          onPress={() => navigation.navigate('CropMonitoringForm')}
          activeOpacity={0.85}
        >
          <View style={styles.menuIconWrap}>
            <AppIcon icon={Leaf} size={24} color="#1A4A2E" strokeWidth={IconStroke} />
          </View>
          <Text style={styles.menuTitle}>New Visit</Text>
          <Text style={styles.menuSub}>Log a field visit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuCard, { backgroundColor: '#FEF3DA' }]}
          onPress={() => navigation.navigate('Main')}
          activeOpacity={0.85}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Live</Text>
          </View>
          <View style={styles.menuIconWrap}>
            <AppIcon icon={Store} size={24} color="#C8900A" strokeWidth={IconStroke} />
          </View>
          <Text style={styles.menuTitle}>Mandi</Text>
          <Text style={styles.menuSub}>Prices · Trends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuCard, { backgroundColor: colors.infoBg }]}
          onPress={() => navigation.navigate('Main')}
          activeOpacity={0.85}
        >
          <View style={styles.menuIconWrap}>
            <AppIcon icon={Map} size={24} color="#185FA5" strokeWidth={IconStroke} />
          </View>
          <Text style={styles.menuTitle}>My Visits</Text>
          <Text style={styles.menuSub}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuCard, { backgroundColor: '#F3E8FF' }]}
          onPress={() => navigation.navigate('Main')}
          activeOpacity={0.85}
        >
          <View style={styles.menuIconWrap}>
            <AppIcon icon={BarChart2} size={24} color="#7C3AED" strokeWidth={IconStroke} />
          </View>
          <Text style={styles.menuTitle}>Reports</Text>
          <Text style={styles.menuSub}>Analytics · YoY</Text>
        </TouchableOpacity>
      </View>

      {/* ── Recent Entries ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>RECENT VISITS</Text>
      </View>

      {loadingVisits ? (
        <View style={styles.visitLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : recentVisits.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <AppIcon icon={Sprout} size={40} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyText}>No visits recorded yet.</Text>
          <TouchableOpacity
            style={styles.emptyActionRow}
            onPress={() => navigation.navigate('CropMonitoringForm')}
          >
            <Text style={styles.emptyAction}>Log your first visit</Text>
            <AppIcon icon={ArrowRight} size={14} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ) : (
        recentVisits.map((visit) => (
          <TouchableOpacity
            key={visit.id}
            style={styles.visitCard}
            onPress={() => handleVisitPress(visit)}
            activeOpacity={0.85}
          >
            <View style={styles.visitCardLeft}>
              <Text style={styles.visitFarmer}>{visit.farmer_name}</Text>
              <Text style={styles.visitLocation}>
                {visit.village_name} · {visit.block_name}
              </Text>
              <Text style={styles.visitDate}>
                {new Date(visit.submitted_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.visitRight}>
              <View style={styles.cropBadge}>
                <Text style={styles.cropBadgeText}>
                  {visit.crop_count} crop{visit.crop_count !== 1 ? 's' : ''}
                </Text>
              </View>
              {visit._pending ? (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              ) : null}
            </View>
            <AppIcon icon={ChevronRight} size={16} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SummaryTile = ({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) => (
  <View style={styles.summaryTile}>
    <Text style={styles.summaryValue}>{value ?? '—'}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting:    { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  role:        { color: 'white', fontSize: 18, fontWeight: '700', marginTop: 2 },
  regionRow:   { flexDirection: 'row' as const, alignItems: 'center' as const, marginTop: 3 },
  region:      { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: { color: 'white', fontSize: 18, fontWeight: '700' },

  // Summary strip
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  summaryTile: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: colors.border,
  },
  summaryValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
  summaryLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: '600' },

  // Section header
  sectionHeader: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textSecondary,
    letterSpacing: 0.8,
  },

  // Quick action grid
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 14, gap: 10,
  },
  menuCard: {
    width: '47%', borderRadius: 16, padding: 16,
    borderWidth: 0.5, borderColor: colors.border,
    minHeight: 110, position: 'relative',
  },
  badge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: colors.primary, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText:    { color: 'white', fontSize: 9, fontWeight: '700' },
  menuIconWrap: { marginBottom: 10 },
  menuTitle:    { fontSize: 14, fontWeight: '600', color: colors.textPrimary, lineHeight: 18 },
  menuSub:      { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  // Visit loader
  visitLoader:  { paddingVertical: 24, alignItems: 'center' },

  // Empty state
  emptyState:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyIconWrap:  { opacity: 0.5, marginBottom: 4 },
  emptyText:      { fontSize: 14, color: colors.textSecondary },
  emptyActionRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  emptyAction:    { fontSize: 14, color: colors.primary, fontWeight: '600' },

  // Visit cards
  visitCard: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  visitCardLeft:  { flex: 1, marginRight: 10 },
  visitRight:     { alignItems: 'flex-end', gap: 4, marginRight: 8 },
  visitFarmer:    { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  visitLocation:  { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  visitDate:      { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  cropBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cropBadgeText:  { fontSize: 12, fontWeight: '700', color: colors.primary },
  pendingBadge: {
    backgroundColor: '#FEF3DA',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pendingText: { fontSize: 10, fontWeight: '700', color: '#C8900A' },
});

export default HomeScreen;
