/**
 * HomeScreen — Dashboard
 *
 * - Header with user's real name (from authStore)
 * - Stats row from GET /api/crops/summary/
 * - 4-card quick-action grid
 * - Pull-to-refresh
 * - Profile icon → Profile screen
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { getDashboardSummary } from '../api/crops';
import { useAuth } from '../store/authStore';
import { colors } from '../utils/colors';
import { formatArea } from '../utils/helpers';
import type { DashboardSummary } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Nav = StackNavigationProp<RootStackParamList>;

// ─── Quick-action cards ───────────────────────────────────────────────────────
interface MenuItem {
  title: string;
  subtitle: string;
  emoji: string;
  tab: string;
  color: string;
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Crop Monitoring',
    subtitle: 'Field data · Visits',
    emoji: '🌶️',
    tab: 'Crops',
    color: colors.primaryLight,
  },
  {
    title: 'Mandi Arrivals',
    subtitle: 'Prices · Trends',
    emoji: '📦',
    tab: 'Mandi',
    color: '#FEF3DA',
    badge: 'Live',
  },
  {
    title: 'My Visits',
    subtitle: 'History · Map',
    emoji: '🗺️',
    tab: 'Reports',
    color: colors.infoBg,
  },
  {
    title: 'Reports',
    subtitle: 'Analytics · YoY',
    emoji: '📊',
    tab: 'Reports',
    color: '#F3E8FF',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch {
      // Silently fail on home — show stale or '—' values
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  }, [loadSummary]);

  const displayName = user
    ? (user.first_name || user.username)
    : 'User';

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

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        <StatBox
          value={
            summary?.total_acreage != null
              ? `${Number(summary.total_acreage).toFixed(0)}`
              : '—'
          }
          label="Acres tracked"
        />
        <StatBox
          value={summary?.total_entries?.toString() ?? '—'}
          label="Entries"
        />
        <StatBox
          value={summary?.by_condition.good?.toString() ?? '—'}
          label="Good fields"
          valueColor={colors.good}
        />
      </View>

      {/* ── Condition breakdown ── */}
      {summary && (
        <View style={styles.conditionRow}>
          <ConditionBar
            label="Good"
            count={summary.by_condition.good}
            total={summary.total_entries}
            color={colors.good}
          />
          <ConditionBar
            label="Average"
            count={summary.by_condition.average}
            total={summary.total_entries}
            color={colors.average}
          />
          <ConditionBar
            label="Poor"
            count={summary.by_condition.poor}
            total={summary.total_entries}
            color={colors.poor}
          />
        </View>
      )}

      {/* ── Menu Grid ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>
      <View style={styles.grid}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={[styles.menuCard, { backgroundColor: item.color }]}
            onPress={() => navigation.navigate('Main' as any)}
            activeOpacity={0.85}
          >
            {item.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
            <Text style={styles.menuEmoji}>{item.emoji}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuSub}>{item.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom spacing */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatBox = ({
  value,
  label,
  valueColor,
}: {
  value: string;
  label: string;
  valueColor?: string;
}) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ConditionBar = ({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.condBar}>
      <Text style={[styles.condBarLabel, { color }]}>{label}</Text>
      <View style={styles.condBarTrack}>
        <View
          style={[
            styles.condBarFill,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.condBarCount, { color }]}>{count}</Text>
    </View>
  );
};

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
  greeting: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  role: { color: 'white', fontSize: 18, fontWeight: '700', marginTop: 2 },
  region: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: { color: 'white', fontSize: 18, fontWeight: '700' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#C8E4D4',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: { fontSize: 11, color: '#4A7A5A', marginTop: 2 },

  // Condition bars
  conditionRow: {
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    gap: 8,
  },
  condBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  condBarLabel: { fontSize: 12, fontWeight: '600', width: 52 },
  condBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  condBarFill: { height: 6, borderRadius: 3 },
  condBarCount: { fontSize: 12, fontWeight: '600', width: 24, textAlign: 'right' },

  // Section header
  sectionHeader: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Menu grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 10,
  },
  menuCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
    minHeight: 110,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
  menuEmoji: { fontSize: 28, marginBottom: 8 },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  menuSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});

export default HomeScreen;
