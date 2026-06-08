/**
 * HomeScreen (v2)
 * - Hamburger opens Drawer
 * - useFocusEffect reloads data every time screen is focused (fixes stale dashboard
 *   after returning from CropMonitoringFormScreen)
 * - Two-phase load: WatermelonDB first (instant, offline-safe), then API (authoritative)
 * - Pending visits (unsynced) show an amber "Pending" badge
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Q } from '@nozbe/watermelondb';

import { getVisitSummary, getFarmerVisits } from '../api/cropMonitoring';
import { useAuth } from '../store/authStore';
import database from '../database';
import { FarmerVisitModel } from '../database/models/FarmerVisitModel';
import type { FarmerVisitSummary, RecentVisit } from '../types/cropMonitoring';
import type { RootStackParamList } from '../navigation/types';
import AppIcon from '../components/AppIcon';
import {
  Menu, MapPin, Leaf, Store, Map, BarChart2,
  Sprout, ArrowRight, ChevronRight, Package, IconStroke,
} from '../utils/icons';

type Nav = StackNavigationProp<RootStackParamList>;

// ── Action tile config ────────────────────────────────────────────────────────

type ActionTile = {
  bg: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  title: string;
  sub: string;
  screen: string;
  badge?: string;
};

const ACTION_TILES: ActionTile[] = [
  { bg: '#E1F2E8', icon: Leaf,      iconColor: '#1A4A2E', title: 'New Visit',     sub: 'Log a field visit',  screen: 'CropMonitoringForm' },
  { bg: '#FEF3DA', icon: Store,     iconColor: '#C8900A', title: 'Mandi',         sub: 'Prices · Trends',    screen: 'MandiArrivalForm', badge: 'Live' },
  { bg: '#E8F4FD', icon: Package,   iconColor: '#0277BD', title: 'Product Demo',  sub: 'Demo · Result',      screen: 'ProductDemoList' },
  { bg: '#F3E8FF', icon: BarChart2, iconColor: '#7C3AED', title: 'Reports',       sub: 'Analytics · YoY',    screen: 'Main' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a WatermelonDB FarmerVisitModel row to the RecentVisit display shape. */
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

/** Derive summary counts from local WatermelonDB records (offline fallback). */
const localSummary = (records: FarmerVisitModel[]): FarmerVisitSummary => {
  const now = Date.now();
  const todayStart  = new Date().setHours(0, 0, 0, 0);
  const weekStart   = now - 7 * 24 * 60 * 60 * 1000;
  const monthStart  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  return {
    today:        records.filter(v => v.createdAtLocal >= todayStart).length,
    this_week:    records.filter(v => v.createdAtLocal >= weekStart).length,
    this_month:   records.filter(v => v.createdAtLocal >= monthStart).length,
    team_members: 1,
  };
};

// ── Component ─────────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [summary, setSummary]           = useState<FarmerVisitSummary | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const loadData = useCallback(async () => {
    setLoadingVisits(true);

    // ── Phase 1: instant local read from WatermelonDB ─────────────────────────
    // Shows data immediately, even before API responds or if offline.
    let localRecords: FarmerVisitModel[] = [];
    try {
      localRecords = await database.collections
        .get<FarmerVisitModel>('farmer_visits')
        .query()
        .fetch();

      if (localRecords.length > 0) {
        const sorted = [...localRecords].sort((a, b) => b.createdAtLocal - a.createdAtLocal);
        setRecentVisits(sorted.slice(0, 10).map(localToRecentVisit));
        setSummary(localSummary(sorted));
      }
    } catch {
      // WatermelonDB unavailable — proceed to API phase
    }

    // ── Phase 2: authoritative read from Django API ───────────────────────────
    // Replaces local data with server-confirmed data when online.
    try {
      const [sum, paginated] = await Promise.all([
        getVisitSummary(),
        getFarmerVisits(1),
      ]);

      // Merge: server records + any locally-pending records not on server yet
      const pendingLocal = localRecords
        .filter(v => !v.isSynced)
        .sort((a, b) => b.createdAtLocal - a.createdAtLocal)
        .map(localToRecentVisit);

      // Deduplicate: pending records that were just synced now appear in API results
      const serverIds = new Set((paginated.results ?? []).map(r => r.id));
      const trulyPending = pendingLocal.filter(p => !serverIds.has(p.id));

      setSummary({
        ...sum,
        // Add pending count on top of server count for accurate totals
        today:     sum.today     + trulyPending.filter(p => {
          const ts = new Date(p.submitted_at).getTime();
          return ts >= new Date().setHours(0, 0, 0, 0);
        }).length,
        this_week:  sum.this_week  + trulyPending.filter(p => {
          const ts = new Date(p.submitted_at).getTime();
          return ts >= Date.now() - 7 * 24 * 60 * 60 * 1000;
        }).length,
        this_month: sum.this_month + trulyPending.filter(p => {
          const ts = new Date(p.submitted_at).getTime();
          return ts >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        }).length,
      });

      setRecentVisits([...trulyPending, ...(paginated.results ?? [])]);
    } catch {
      // API unavailable — Phase 1 data (local) is already displayed; nothing else to do
    } finally {
      setLoadingVisits(false);
    }
  }, []);

  // Re-run loadData every time the screen gains focus (e.g., returning from form)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleVisitPress = useCallback((visit: RecentVisit) => {
    if (visit._pending) {
      Alert.alert(
        'Pending Sync',
        'This visit is saved locally and will sync to the server when you are online. Full details will be available after syncing.',
        [{ text: 'OK' }],
      );
      return;
    }
    navigation.navigate('CropMonitoringDetail', { visitId: visit.id });
  }, [navigation]);

  const displayName = user ? user.first_name || user.username : 'User';

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A4A2E" />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          activeOpacity={0.7}
        >
          <AppIcon icon={Menu} size={20} color="white" strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.greeting}>Hello, {displayName}</Text>
          <Text style={styles.role}>{user?.role === 'field_executive' ? 'Field Executive' : user?.role ?? ''}</Text>
          {user?.region ? (
            <View style={styles.regionRow}>
              <AppIcon icon={MapPin} size={11} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              <Text style={styles.region}> {user.region}</Text>
            </View>
          ) : null}
          <View style={styles.syncPill}>
            <Text style={styles.syncText}>Synced</Text>
          </View>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
      </View>

      {/* ── Summary Strip ── */}
      <View style={styles.strip}>
        {([
          ['Today',      summary?.today],
          ['This Week',  summary?.this_week],
          ['This Month', summary?.this_month],
          ['Team',       summary?.team_members],
        ] as [string, number | undefined][]).map(([label, val]) => (
          <View key={label} style={styles.tile}>
            <Text style={styles.tileVal}>{val ?? '—'}</Text>
            <Text style={styles.tileLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Quick Actions ── */}
      <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
      <View style={styles.grid}>
        {ACTION_TILES.map(({ bg, icon, iconColor, title, sub, screen, badge }) => (
          <TouchableOpacity
            key={title}
            style={[styles.card, { backgroundColor: bg }]}
            onPress={() => navigation.navigate(screen as any)}
            activeOpacity={0.85}
          >
            {badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
            <View style={styles.cardIconWrap}>
              <AppIcon icon={icon} size={24} color={iconColor} strokeWidth={IconStroke} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSub}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Recent Visits ── */}
      <Text style={styles.sectionTitle}>RECENT VISITS</Text>
      {loadingVisits ? (
        <View style={styles.loader}><ActivityIndicator size="small" color="#1A4A2E" /></View>
      ) : recentVisits.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <AppIcon icon={Sprout} size={40} color="#8A8A7A" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyText}>No visits recorded yet.</Text>
          <TouchableOpacity
            style={styles.emptyAction}
            onPress={() => navigation.navigate('CropMonitoringForm')}
          >
            <Text style={styles.emptyActionText}>Log your first visit</Text>
            <AppIcon icon={ArrowRight} size={14} color="#1A4A2E" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ) : recentVisits.map((v) => (
        <TouchableOpacity
          key={v.id}
          style={styles.visitCard}
          onPress={() => handleVisitPress(v)}
          activeOpacity={0.85}
        >
          <View style={styles.visitLeft}>
            <Text style={styles.visitName}>{v.farmer_name}</Text>
            <Text style={styles.visitLoc}>{v.village_name} · {v.block_name}</Text>
            <Text style={styles.visitDate}>
              {new Date(v.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.visitRight}>
            <View style={styles.cropBadge}>
              <Text style={styles.cropBadgeText}>{v.crop_count} crop{v.crop_count !== 1 ? 's' : ''}</Text>
            </View>
            {v._pending ? (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            ) : null}
          </View>
          <AppIcon icon={ChevronRight} size={16} color="#8A8A7A" strokeWidth={2} />
        </TouchableOpacity>
      ))}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F6F1' },

  header: {
    backgroundColor: '#1A4A2E',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  greeting: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  role: { color: 'white', fontSize: 17, fontWeight: '700', marginTop: 2 },
  regionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  region: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  syncPill: {
    alignSelf: 'flex-start', backgroundColor: '#E1F2E8',
    borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6,
  },
  syncText: { color: '#1A8A3A', fontSize: 11, fontWeight: '600' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: 'white', fontSize: 17, fontWeight: '700' },

  strip: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 0.5, borderBottomColor: '#E0DDD5' },
  tile: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRightWidth: 0.5, borderRightColor: '#E0DDD5' },
  tileVal: { fontSize: 22, fontWeight: '800', color: '#1A4A2E' },
  tileLabel: { fontSize: 10, color: '#8A8A7A', marginTop: 2, fontWeight: '600' },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#6A7A6A',
    letterSpacing: 0.8, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 8,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10 },
  card: {
    width: '47%', borderRadius: 16, padding: 16,
    borderWidth: 0.5, borderColor: '#E0DDD5', minHeight: 110, position: 'relative',
  },
  badge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#1A4A2E', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
  cardIconWrap: { marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1A3A25', lineHeight: 18 },
  cardSub: { fontSize: 11, color: '#6A7A6A', marginTop: 2 },

  loader: { paddingVertical: 24, alignItems: 'center' },

  empty: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyIconWrap: { opacity: 0.5, marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#6A7A6A' },
  emptyAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyActionText: { fontSize: 14, color: '#1A4A2E', fontWeight: '600' },

  visitCard: {
    marginHorizontal: 14, marginBottom: 8, backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: '#E0DDD5',
    flexDirection: 'row', alignItems: 'center',
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  visitLeft: { flex: 1, marginRight: 10 },
  visitRight: { alignItems: 'flex-end', gap: 4, marginRight: 8 },
  visitName: { fontSize: 15, fontWeight: '700', color: '#1A3A25' },
  visitLoc: { fontSize: 12, color: '#6A7A6A', marginTop: 2 },
  visitDate: { fontSize: 11, color: '#8A8A7A', marginTop: 3 },
  cropBadge: { backgroundColor: '#E1F2E8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  cropBadgeText: { fontSize: 12, fontWeight: '700', color: '#1A4A2E' },
  pendingBadge: { backgroundColor: '#FEF3DA', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  pendingText: { fontSize: 10, fontWeight: '700', color: '#C8900A' },
});

export default HomeScreen;
