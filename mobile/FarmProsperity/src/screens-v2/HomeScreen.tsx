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
import { MandiArrivalModel } from '../database/models/MandiArrivalModel';
import { ProductDemoModel } from '../database/models/ProductDemoModel';
import type { FarmerVisitSummary } from '../types/cropMonitoring';
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
  { bg: '#E1F2E8', icon: Leaf,      iconColor: '#1A4A2E', title: 'Crop Intelligence Module',      sub: 'Visits · New entry',   screen: 'Crops' },
  { bg: '#FEF3DA', icon: Store,     iconColor: '#C8900A', title: 'Market Intelligence Module',    sub: 'Arrivals · Trends',    screen: 'Mandi', badge: 'Live' },
  { bg: '#E8F4FD', icon: Package,   iconColor: '#0277BD', title: 'Product Performance Module',    sub: 'Demo · Results',       screen: 'ProductDemoList' },
  { bg: '#F3E8FF', icon: BarChart2, iconColor: '#7C3AED', title: 'Reports',                sub: 'Analytics · YoY',      screen: 'Reports' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Unified Activity Item ─────────────────────────────────────────────────────

type ActivityModule = 'crop_intelligence' | 'market_intelligence' | 'product_performance';

interface ActivityItem {
  id: string;
  module: ActivityModule;
  title: string;          // farmer_name or mandi_name
  subtitle: string;       // village · block or commodity
  detail: string;         // crop count, variety count, product name
  date: string;           // ISO string
  timestamp: number;      // ms — for sorting
  pending: boolean;
  /** Server ID for navigation (null if not yet synced) */
  serverId: string | null;
}

const MODULE_META: Record<ActivityModule, { icon: React.ComponentType<any>; color: string; bg: string; label: string }> = {
  crop_intelligence:    { icon: Leaf,    color: '#1A4A2E', bg: '#E1F2E8', label: 'Crop Intelligence Module' },
  market_intelligence:  { icon: Store,   color: '#C8900A', bg: '#FEF3DA', label: 'Market Intelligence Module' },
  product_performance:  { icon: Package, color: '#0277BD', bg: '#E8F4FD', label: 'Product Performance Module' },
};

/** Convert a WatermelonDB FarmerVisitModel row to an ActivityItem. */
const visitToActivity = (v: FarmerVisitModel): ActivityItem => {
  let cropCount = 0;
  try { cropCount = JSON.parse(v.cropsJson || '[]').length; } catch {}
  return {
    id: v.id,
    module: 'crop_intelligence',
    title: v.farmerName,
    subtitle: `${v.villageName} · ${v.blockName}`,
    detail: `${cropCount} crop${cropCount !== 1 ? 's' : ''}`,
    date: new Date(v.createdAtLocal).toISOString(),
    timestamp: v.createdAtLocal,
    pending: !v.isSynced,
    serverId: v.serverId ?? null,
  };
};

/** Convert a WatermelonDB MandiArrivalModel row to an ActivityItem. */
const mandiToActivity = (m: MandiArrivalModel): ActivityItem => {
  let varietyCount = 0;
  try { varietyCount = JSON.parse(m.varietiesJson || '[]').length; } catch {}
  return {
    id: m.id,
    module: 'market_intelligence',
    title: m.mandiName || m.mandiCustomName || 'Mandi',
    subtitle: m.commodity || 'Multiple crops',
    detail: `${varietyCount} variet${varietyCount !== 1 ? 'ies' : 'y'}`,
    date: m.date || new Date(m.createdAtLocal).toISOString(),
    timestamp: m.createdAtLocal,
    pending: !m.isSynced,
    serverId: m.serverId ?? null,
  };
};

/** Convert a WatermelonDB ProductDemoModel row to an ActivityItem. */
const demoToActivity = (d: ProductDemoModel): ActivityItem => ({
  id: d.id,
  module: 'product_performance',
  title: d.farmerName,
  subtitle: `${d.villageName} · ${d.blockName}`,
  detail: d.productName || 'Demo',
  date: d.demoDate || new Date(d.createdAtLocal).toISOString(),
  timestamp: d.createdAtLocal,
  pending: !d.isSynced,
  serverId: d.serverId ?? null,
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

  const [summary, setSummary]               = useState<FarmerVisitSummary | null>(null);
  const [activities, setActivities]         = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [refreshing, setRefreshing]         = useState(false);

  const loadData = useCallback(async () => {
    setLoadingActivities(true);

    // ── Phase 1: instant local read from WatermelonDB ─────────────────────────
    let localVisits: FarmerVisitModel[] = [];
    let localMandis: MandiArrivalModel[] = [];
    let localDemos: ProductDemoModel[] = [];
    try {
      [localVisits, localMandis, localDemos] = await Promise.all([
        database.collections.get<FarmerVisitModel>('farmer_visits').query().fetch(),
        database.collections.get<MandiArrivalModel>('mandi_arrivals').query().fetch(),
        database.collections.get<ProductDemoModel>('product_demos').query().fetch(),
      ]);

      // Merge all activities into a unified sorted list
      const allActivities: ActivityItem[] = [
        ...localVisits.map(visitToActivity),
        ...localMandis.map(mandiToActivity),
        ...localDemos.map(demoToActivity),
      ].sort((a, b) => b.timestamp - a.timestamp);

      setActivities(allActivities.slice(0, 10));

      if (localVisits.length > 0) {
        const sorted = [...localVisits].sort((a, b) => b.createdAtLocal - a.createdAtLocal);
        setSummary(localSummary(sorted));
      }
    } catch {
      // WatermelonDB unavailable — proceed to API phase
    }

    // ── Phase 2: authoritative read from Django API ───────────────────────────
    try {
      const [sum, paginated] = await Promise.all([
        getVisitSummary(),
        getFarmerVisits(1),
      ]);

      const pendingLocal = localVisits
        .filter(v => !v.isSynced)
        .sort((a, b) => b.createdAtLocal - a.createdAtLocal);

      const serverIds = new Set((paginated.results ?? []).map(r => r.id));
      const trulyPending = pendingLocal.filter(p => !serverIds.has(p.serverId ?? p.id));

      setSummary({
        ...sum,
        today:     sum.today     + trulyPending.filter(p => p.createdAtLocal >= new Date().setHours(0, 0, 0, 0)).length,
        this_week:  sum.this_week  + trulyPending.filter(p => p.createdAtLocal >= Date.now() - 7 * 24 * 60 * 60 * 1000).length,
        this_month: sum.this_month + trulyPending.filter(p => p.createdAtLocal >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()).length,
      });

      // Re-merge all activities (some visits may now have server data)
      const allActivities: ActivityItem[] = [
        ...localVisits.map(visitToActivity),
        ...localMandis.map(mandiToActivity),
        ...localDemos.map(demoToActivity),
      ].sort((a, b) => b.timestamp - a.timestamp);

      setActivities(allActivities.slice(0, 10));
    } catch {
      // API unavailable — Phase 1 data is already displayed
    } finally {
      setLoadingActivities(false);
    }
  }, []);

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

  const handleActivityPress = useCallback((item: ActivityItem) => {
    if (item.pending) {
      Alert.alert(
        'Pending Sync',
        'This entry is saved locally and will sync to the server when you are online.',
        [{ text: 'OK' }],
      );
      return;
    }
    switch (item.module) {
      case 'crop_intelligence':
        if (item.serverId) navigation.navigate('CropMonitoringDetail', { visitId: item.serverId });
        break;
      case 'market_intelligence':
        // Mandi arrivals don't have a detail screen in current nav — no-op
        break;
      case 'product_performance':
        if (item.serverId) navigation.navigate('ProductDemoDetail', { demoId: item.serverId });
        break;
    }
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
            <Text style={styles.cardTitle} adjustsFontSizeToFit numberOfLines={2} minimumFontScale={0.75}>{title}</Text>
            <Text style={styles.cardSub}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Recent Activities ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>RECENT ACTIVITIES</Text>
      </View>
      {loadingActivities ? (
        <View style={styles.loader}><ActivityIndicator size="small" color="#1A4A2E" /></View>
      ) : activities.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <AppIcon icon={Sprout} size={40} color="#8A8A7A" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyText}>No activities recorded yet.</Text>
          <TouchableOpacity
            style={styles.emptyAction}
            onPress={() => navigation.navigate('CropMonitoringForm')}
          >
            <Text style={styles.emptyActionText}>Log your first entry</Text>
            <AppIcon icon={ArrowRight} size={14} color="#1A4A2E" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ) : activities.map((item) => {
        const meta = MODULE_META[item.module];
        return (
          <TouchableOpacity
            key={`${item.module}-${item.id}`}
            style={styles.visitCard}
            onPress={() => handleActivityPress(item)}
            activeOpacity={0.85}
          >
            {/* Module icon badge */}
            <View style={[styles.moduleBadge, { backgroundColor: meta.bg }]}>
              <AppIcon icon={meta.icon} size={18} color={meta.color} strokeWidth={IconStroke} />
            </View>
            <View style={styles.visitLeft}>
              <Text style={styles.visitName}>{item.title}</Text>
              <Text style={styles.visitLoc}>{item.subtitle}</Text>
              <Text style={styles.visitDate}>
                {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.visitRight}>
              <View style={[styles.cropBadge, { backgroundColor: meta.bg }]}>
                <Text style={[styles.cropBadgeText, { color: meta.color }]}>{item.detail}</Text>
              </View>
              {item.pending ? (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              ) : null}
            </View>
            <AppIcon icon={ChevronRight} size={16} color="#8A8A7A" strokeWidth={2} />
          </TouchableOpacity>
        );
      })}

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
    paddingTop: 36,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  greeting: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  role: { color: 'white', fontSize: 15, fontWeight: '700', marginTop: 1 },
  regionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  region: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  syncPill: {
    alignSelf: 'flex-start', backgroundColor: '#E1F2E8',
    borderRadius: 99, paddingHorizontal: 7, paddingVertical: 1, marginTop: 3,
  },
  syncText: { color: '#1A8A3A', fontSize: 10, fontWeight: '600' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: 'white', fontSize: 15, fontWeight: '700' },

  strip: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 0.5, borderBottomColor: '#E0DDD5' },
  tile: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRightWidth: 0.5, borderRightColor: '#E0DDD5' },
  tileVal: { fontSize: 18, fontWeight: '800', color: '#1A4A2E' },
  tileLabel: { fontSize: 10, color: '#8A8A7A', marginTop: 1, fontWeight: '600' },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#6A7A6A',
    letterSpacing: 0.8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
  },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 14,
  },
  seeAll: {
    fontSize: 12, fontWeight: '700', color: '#1A4A2E', paddingTop: 12, paddingBottom: 6,
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
  moduleBadge: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
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
