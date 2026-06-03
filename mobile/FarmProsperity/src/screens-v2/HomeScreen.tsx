/**
 * HomeScreen (v2)
 * - Hamburger opens Drawer
 * - Sync pill in header
 * - All v1 data logic preserved
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { getVisitSummary, getFarmerVisits } from '../api/cropMonitoring';
import { useAuth } from '../store/authStore';
import type { FarmerVisitSummary, RecentVisit } from '../types/cropMonitoring';
import type { RootStackParamList } from '../navigation/types';

type Nav = StackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [summary, setSummary] = useState<FarmerVisitSummary | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sum, paginated] = await Promise.all([getVisitSummary(), getFarmerVisits(1)]);
      setSummary(sum);
      setRecentVisits(paginated.results ?? []);
    } catch { /* silently fail */ } finally { setLoadingVisits(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await loadData(); setRefreshing(false); }, [loadData]);

  const displayName = user ? user.first_name || user.username : 'User';

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A4A2E" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.dispatch(DrawerActions.openDrawer())} activeOpacity={0.7}>
          <Text style={styles.hamburger}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.greeting}>Hello, {displayName}</Text>
          <Text style={styles.role}>{user?.role === 'field_executive' ? 'Field Executive' : user?.role ?? ''}</Text>
          {user?.region ? <Text style={styles.region}>📍 {user.region}</Text> : null}
          <View style={styles.syncPill}><Text style={styles.syncText}>● Synced</Text></View>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text></View>
      </View>

      {/* Summary Strip */}
      <View style={styles.strip}>
        {[['Today', summary?.today], ['This Week', summary?.this_week], ['This Month', summary?.this_month], ['Team', summary?.team_members]].map(([label, val]) => (
          <View key={String(label)} style={styles.tile}>
            <Text style={styles.tileVal}>{val ?? '—'}</Text>
            <Text style={styles.tileLabel}>{String(label)}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
      <View style={styles.grid}>
        {[
          { bg: '#E1F2E8', icon: '🌾', title: 'New Visit', sub: 'Log a field visit', screen: 'CropMonitoringForm' },
          { bg: '#FEF3DA', icon: '📦', title: 'Mandi', sub: 'Prices · Trends', screen: 'Main', badge: 'Live' },
          { bg: '#E6F1FB', icon: '🗺️', title: 'My Visits', sub: 'History', screen: 'Main' },
          { bg: '#F3E8FF', icon: '📊', title: 'Reports', sub: 'Analytics · YoY', screen: 'Main' },
        ].map(({ bg, icon, title, sub, screen, badge }) => (
          <TouchableOpacity key={title} style={[styles.card, { backgroundColor: bg }]} onPress={() => navigation.navigate(screen as any)} activeOpacity={0.85}>
            {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
            <Text style={styles.cardIcon}>{icon}</Text>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSub}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Visits */}
      <Text style={styles.sectionTitle}>RECENT VISITS</Text>
      {loadingVisits ? (
        <View style={styles.loader}><ActivityIndicator size="small" color="#1A4A2E" /></View>
      ) : recentVisits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={styles.emptyText}>No visits recorded yet.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CropMonitoringForm')}><Text style={styles.emptyAction}>Log your first visit →</Text></TouchableOpacity>
        </View>
      ) : recentVisits.map((v) => (
        <TouchableOpacity key={v.id} style={styles.visitCard} onPress={() => navigation.navigate('CropMonitoringDetail', { visitId: v.id })} activeOpacity={0.85}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.visitName}>{v.farmer_name}</Text>
            <Text style={styles.visitLoc}>{v.village_name} · {v.block_name}</Text>
            <Text style={styles.visitDate}>{new Date(v.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
          </View>
          <View style={styles.cropBadge}><Text style={styles.cropBadgeText}>{v.crop_count} crop{v.crop_count !== 1 ? 's' : ''}</Text></View>
        </TouchableOpacity>
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F6F1' },
  header: { backgroundColor: '#1A4A2E', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  hamburger: { color: 'white', fontSize: 18 },
  headerCenter: { flex: 1 },
  greeting: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  role: { color: 'white', fontSize: 17, fontWeight: '700', marginTop: 2 },
  region: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  syncPill: { alignSelf: 'flex-start', backgroundColor: '#E1F2E8', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  syncText: { color: '#1A8A3A', fontSize: 11, fontWeight: '600' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: 'white', fontSize: 17, fontWeight: '700' },
  strip: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 0.5, borderBottomColor: '#E0DDD5' },
  tile: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRightWidth: 0.5, borderRightColor: '#E0DDD5' },
  tileVal: { fontSize: 22, fontWeight: '800', color: '#1A4A2E' },
  tileLabel: { fontSize: 10, color: '#8A8A7A', marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#6A7A6A', letterSpacing: 0.8, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10 },
  card: { width: '47%', borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#E0DDD5', minHeight: 110, position: 'relative' },
  badge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#1A4A2E', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1A3A25', lineHeight: 18 },
  cardSub: { fontSize: 11, color: '#6A7A6A', marginTop: 2 },
  loader: { paddingVertical: 24, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 14, color: '#6A7A6A' },
  emptyAction: { fontSize: 14, color: '#1A4A2E', fontWeight: '600' },
  visitCard: { marginHorizontal: 14, marginBottom: 8, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: '#E0DDD5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  visitName: { fontSize: 15, fontWeight: '700', color: '#1A3A25' },
  visitLoc: { fontSize: 12, color: '#6A7A6A', marginTop: 2 },
  visitDate: { fontSize: 11, color: '#8A8A7A', marginTop: 3 },
  cropBadge: { backgroundColor: '#E1F2E8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  cropBadgeText: { fontSize: 12, fontWeight: '700', color: '#1A4A2E' },
});

export default HomeScreen;
