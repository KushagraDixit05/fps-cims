/**
 * ReportsScreen — Analytics summary with condition breakdown and YoY data.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { getDashboardSummary } from '../api/crops';
import { getMandis, getYoYComparison } from '../api/mandi';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../utils/colors';
import Card from '../components/Card';
import LoadingScreen from '../components/LoadingScreen';
import ScreenHeader from '../components/ScreenHeader';
import type { DashboardSummary, Mandi, YoYComparison } from '../types';

const ReportsScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [yoy, setYoY] = useState<YoYComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [summaryData, mandiData] = await Promise.all([
        getDashboardSummary(),
        getMandis(),
      ]);
      setSummary(summaryData);
      setMandis(mandiData);
      if (mandiData.length > 0) {
        const yoyData = await getYoYComparison(mandiData[0].id);
        setYoY(yoyData);
      }
    } catch {
      // ignore — show what we have
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  if (loading) return <LoadingScreen message="Loading reports…" />;

  const total = summary?.total_entries ?? 0;
  const good = summary?.by_condition.good ?? 0;
  const avg = summary?.by_condition.average ?? 0;
  const poor = summary?.by_condition.poor ?? 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <ScreenHeader title="Reports" subtitle="Analytics & Insights" onBack={() => navigation.navigate('Home' as any)} />

      {/* ── Crop Summary ── */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Crop Intelligence Module Summary</Text>
        <View style={styles.statsRow}>
          <StatBox label="Total Entries" value={String(total)} />
          <StatBox
            label="Total Acreage"
            value={summary?.total_acreage != null ? `${Number(summary.total_acreage).toFixed(0)} Ac` : '—'}
          />
        </View>

        {/* Condition breakdown */}
        <Text style={styles.subTitle}>Condition Breakdown</Text>
        {[
          { label: 'Good', count: good, color: colors.good, bg: colors.goodBg },
          { label: 'Average', count: avg, color: colors.average, bg: colors.averageBg },
          { label: 'Poor', count: poor, color: colors.poor, bg: colors.poorBg },
        ].map(({ label, count, color, bg }) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <View key={label} style={styles.barRow}>
              <Text style={[styles.barLabel, { color }]}>{label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
              <Text style={[styles.barCount, { color }]}>{count}</Text>
              <Text style={styles.barPct}>({pct.toFixed(0)}%)</Text>
            </View>
          );
        })}
      </Card>

      {/* ── Mandi YoY ── */}
      {yoy && mandis.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            Mandi YoY — {mandis[0].name}
          </Text>
          <Text style={styles.yoyCommodity}>{yoy.commodity}</Text>
          <View style={styles.yoyGrid}>
            <View style={styles.yoyBlock}>
              <Text style={[styles.yoyYear, { color: colors.primary }]}>{yoy.this_year.year}</Text>
              <Text style={styles.yoyQty}>
                {yoy.this_year.total_quantity != null
                  ? `${Number(yoy.this_year.total_quantity).toLocaleString('en-IN')} Qt`
                  : '—'}
              </Text>
              <Text style={styles.yoyEntries}>{yoy.this_year.entries} entries</Text>
            </View>
            <View style={styles.yoySep} />
            <View style={styles.yoyBlock}>
              <Text style={styles.yoyYear}>{yoy.last_year.year}</Text>
              <Text style={[styles.yoyQty, { color: colors.textMuted }]}>
                {yoy.last_year.total_quantity != null
                  ? `${Number(yoy.last_year.total_quantity).toLocaleString('en-IN')} Qt`
                  : '—'}
              </Text>
              <Text style={styles.yoyEntries}>{yoy.last_year.entries} entries</Text>
            </View>
          </View>
          {yoy.this_year.total_quantity != null && yoy.last_year.total_quantity != null && (
            <Text style={
              yoy.this_year.total_quantity >= yoy.last_year.total_quantity
                ? styles.yoyUp : styles.yoyDown
            }>
              {yoy.this_year.total_quantity >= yoy.last_year.total_quantity
                ? '▲ Arrivals up from last year'
                : '▼ Arrivals down from last year'}
            </Text>
          )}
        </Card>
      )}

      {/* ── Mandi list ── */}
      {mandis.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Active Mandis ({mandis.length})</Text>
          {mandis.map((m) => (
            <View key={m.id} style={styles.mandiRow}>
              <Text style={styles.mandiName}>{m.name}</Text>
              <Text style={styles.mandiDistrict}>{m.district}, {m.state}</Text>
            </View>
          ))}
        </Card>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const StatBox = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 10,
  },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 2 },
  card: { margin: 12, marginBottom: 0 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  subTitle: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statBox: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: '#C8E4D4' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 11, color: '#4A7A5A', marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  barLabel: { fontSize: 12, fontWeight: '600', width: 52 },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.borderLight, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barCount: { fontSize: 12, fontWeight: '600', width: 24, textAlign: 'right' },
  barPct: { fontSize: 11, color: colors.textMuted, width: 36 },
  yoyCommodity: { fontSize: 12, color: colors.textSecondary, marginBottom: 10, fontStyle: 'italic' },
  yoyGrid: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  yoySep: { width: 0.5, backgroundColor: colors.border },
  yoyBlock: { flex: 1 },
  yoyYear: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  yoyQty: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  yoyEntries: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  yoyUp: { fontSize: 12, color: colors.good, fontWeight: '600' },
  yoyDown: { fontSize: 12, color: colors.poor, fontWeight: '600' },
  mandiRow: { paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  mandiName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  mandiDistrict: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});

export default ReportsScreen;
