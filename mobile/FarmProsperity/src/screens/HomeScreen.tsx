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

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { getVisitSummary, getFarmerVisits } from '../api/cropMonitoring';
import { useAuth } from '../store/authStore';
import { colors } from '../utils/colors';
import type { FarmerVisitSummary, RecentVisit } from '../types/cropMonitoring';
import type { RootStackParamList } from '../navigation/types';

type Nav = StackNavigationProp<RootStackParamList>;

// ─── Component ────────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [summary, setSummary] = useState<FarmerVisitSummary | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sum, paginated] = await Promise.all([
        getVisitSummary(),
        getFarmerVisits(1),
      ]);
      setSummary(sum);
      setRecentVisits(paginated.results ?? []);
    } catch {
      // Silently fail — show stale / '—' values
    } finally {
      setLoadingVisits(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

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
          <Text style={styles.greeting}>Hello, {displayName} 👋</Text>
          <Text style={styles.role}>
            {user?.role === 'field_executive' ? 'Field Executive' : user?.role ?? ''}
          </Text>
          {user?.region ? (
            <Text style={styles.region}>📍 {user.region}</Text>
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
          <Text style={styles.menuEmoji}>🌾</Text>
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
          <Text style={styles.menuEmoji}>📦</Text>
          <Text style={styles.menuTitle}>Mandi</Text>
          <Text style={styles.menuSub}>Prices · Trends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuCard, { backgroundColor: colors.infoBg }]}
          onPress={() => navigation.navigate('Main')}
          activeOpacity={0.85}
        >
          <Text style={styles.menuEmoji}>🗺️</Text>
          <Text style={styles.menuTitle}>My Visits</Text>
          <Text style={styles.menuSub}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuCard, { backgroundColor: '#F3E8FF' }]}
          onPress={() => navigation.navigate('Main')}
          activeOpacity={0.85}
        >
          <Text style={styles.menuEmoji}>📊</Text>
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
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={styles.emptyText}>No visits recorded yet.</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CropMonitoringForm')}
          >
            <Text style={styles.emptyAction}>Log your first visit →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentVisits.map((visit) => (
          <TouchableOpacity
            key={visit.id}
            style={styles.visitCard}
            onPress={() =>
              navigation.navigate('CropMonitoringDetail', { visitId: visit.id })
            }
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
            <View style={styles.cropBadge}>
              <Text style={styles.cropBadgeText}>
                {visit.crop_count} crop{visit.crop_count !== 1 ? 's' : ''}
              </Text>
            </View>
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
  region:      { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
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
  menuEmoji:    { fontSize: 28, marginBottom: 8 },
  menuTitle:    { fontSize: 14, fontWeight: '600', color: colors.textPrimary, lineHeight: 18 },
  menuSub:      { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  // Visit loader
  visitLoader:  { paddingVertical: 24, alignItems: 'center' },

  // Empty state
  emptyState:   { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyIcon:    { fontSize: 36 },
  emptyText:    { fontSize: 14, color: colors.textSecondary },
  emptyAction:  { fontSize: 14, color: colors.primary, fontWeight: '600' },

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
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  visitCardLeft:  { flex: 1, marginRight: 10 },
  visitFarmer:    { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  visitLocation:  { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  visitDate:      { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  cropBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cropBadgeText:  { fontSize: 12, fontWeight: '700', color: colors.primary },
});

export default HomeScreen;
