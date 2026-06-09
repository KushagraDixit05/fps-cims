/**
 * ProfileScreen — User info, sync status dashboard, and logout.
 *
 * Phase 3 additions:
 *  - Sync Status card: pending count (visits / crop entries / mandi arrivals)
 *  - Last sync time
 *  - Live connectivity indicator
 *  - Manual Sync button with progress state
 *  - Error display for records that failed to sync
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';

import { useAuth }                       from '../store/authStore';
import { colors }                        from '../utils/colors';
import Card                              from '../components/Card';
import ScreenHeader                      from '../components/ScreenHeader';
import { syncPendingRecords, getPendingCount, getLastSyncTime } from '../sync/syncService';
import type { SyncStats }                from '../sync/syncTypes';
import AppIcon                           from '../components/AppIcon';
import { LogOut, IconStroke }            from '../utils/icons';

const ROLE_LABELS: Record<string, string> = {
  field_executive: 'Field Executive',
  admin:           'Administrator',
  viewer:          'Viewer',
};

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  // ── Sync state ──
  const [pendingStats, setPendingStats]   = useState<SyncStats>({ pendingVisits: 0, pendingCropEntries: 0, pendingMandiArrivals: 0, pendingProductDemos: 0, total: 0 });
  const [lastSyncTs, setLastSyncTs]       = useState<number | null>(null);
  const [isSyncing, setIsSyncing]         = useState(false);
  const [isOnline, setIsOnline]           = useState<boolean | null>(null);
  const [syncErrors, setSyncErrors]       = useState<string[]>([]);
  const [showErrors, setShowErrors]       = useState(false);

  // ── Load pending counts + last sync time ──
  const refreshStats = useCallback(async () => {
    const [stats, ts] = await Promise.all([
      getPendingCount(),
      getLastSyncTime(),
    ]);
    setPendingStats(stats);
    setLastSyncTs(ts);
  }, []);

  useEffect(() => {
    refreshStats();

    // Subscribe to connectivity changes for live indicator
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? null);
    });
    return () => unsub();
  }, [refreshStats]);

  // ── Manual sync ──
  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncErrors([]);
    try {
      const result = await syncPendingRecords();

      // Refresh the pending badge regardless of outcome
      await refreshStats();
      setSyncErrors(result.errors);

      if (result.offline) {
        // Device was offline — sync didn't run at all.
        // Re-read the latest pending count so the message is accurate.
        const stats = await getPendingCount();
        const pending = stats.total;
        Alert.alert(
          'No Internet Connection',
          pending > 0
            ? `${pending} record${pending !== 1 ? 's' : ''} pending. They will sync automatically when you go online.`
            : 'No pending records. You are up to date.',
        );
      } else if (result.synced === 0 && result.failed === 0) {
        Alert.alert('Up to date', 'No pending records to sync.');
      } else if (result.failed === 0) {
        Alert.alert('Sync Complete', `${result.synced} record(s) synced successfully.`);
      } else {
        Alert.alert(
          'Partial Sync',
          `${result.synced} record(s) synced. ${result.failed} failed — they will retry on next sync.`,
        );
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err?.message ?? 'An unexpected error occurred.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Helpers ──
  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
    : '—';

  const formatSyncTime = (ts: number | null): string => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => { await logout(); },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      {/* ── Compact header (sticky) ── */}
      <ScreenHeader
        title="Profile"
        subtitle={user?.username ? `@${user.username}` : undefined}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
      {/* ── Avatar section ── */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role ? ROLE_LABELS[user.role] ?? user.role : '—'}
          </Text>
        </View>
      </View>

      {/* ── Sync Status Card ── */}
      <Card style={styles.card}>
        <View style={styles.syncCardHeader}>
          <Text style={styles.cardTitle}>Sync Status</Text>
          {/* Live connectivity dot */}
          <View style={styles.connectRow}>
            <View style={[
              styles.connectDot,
              isOnline === true  && styles.connectDotOnline,
              isOnline === false && styles.connectDotOffline,
              isOnline === null  && styles.connectDotUnknown,
            ]} />
            <Text style={styles.connectText}>
              {isOnline === true ? 'Online' : isOnline === false ? 'Offline' : '…'}
            </Text>
          </View>
        </View>

        {/* Pending counts */}
        <View style={styles.statsGrid}>
          <StatCell label="Visits" count={pendingStats.pendingVisits} />
          <StatCell label="Crop Entries" count={pendingStats.pendingCropEntries} />
          <StatCell label="Mandi" count={pendingStats.pendingMandiArrivals} />
        </View>

        {pendingStats.total > 0 && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerText}>
              {pendingStats.total} record{pendingStats.total !== 1 ? 's' : ''} pending sync
            </Text>
          </View>
        )}

        {/* Last sync time */}
        <InfoRow label="Last synced" value={formatSyncTime(lastSyncTs)} />

        {/* Manual sync button */}
        <TouchableOpacity
          style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
          onPress={handleManualSync}
          disabled={isSyncing}
          activeOpacity={0.8}
        >
          {isSyncing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.syncBtnText}>Sync Now</Text>
          )}
        </TouchableOpacity>

        {/* Sync errors (expandable) */}
        {syncErrors.length > 0 && (
          <View style={styles.errorSection}>
            <TouchableOpacity
              onPress={() => setShowErrors((v) => !v)}
              style={styles.errorToggle}
            >
              <Text style={styles.errorToggleText}>
                {showErrors ? '▲' : '▼'} {syncErrors.length} error{syncErrors.length !== 1 ? 's' : ''} — tap to {showErrors ? 'hide' : 'view'}
              </Text>
            </TouchableOpacity>
            {showErrors && syncErrors.map((e, i) => (
              <Text key={i} style={styles.errorItem}>{e}</Text>
            ))}
          </View>
        )}
      </Card>

      {/* ── Account Details ── */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Account Details</Text>
        <InfoRow label="Username"  value={user?.username ?? '—'} />
        <InfoRow label="Full Name" value={displayName} />
        <InfoRow label="Role"      value={user?.role ? ROLE_LABELS[user.role] ?? user.role : '—'} />
        {user?.region      ? <InfoRow label="Region" value={user.region} />           : null}
        {user?.phone_number ? <InfoRow label="Phone"  value={user.phone_number} />     : null}
      </Card>

      {/* ── App Info ── */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>App Info</Text>
        <InfoRow label="Version"  value="3.0.0 (Offline-First)" />
        <InfoRow label="Backend"  value="Django REST Framework" />
        <InfoRow label="Auth"     value="JWT (SimpleJWT)" />
        <InfoRow label="Storage"  value="WatermelonDB (SQLite)" />
      </Card>

      {/* ── Logout ── */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <AppIcon icon={LogOut} size={18} color={colors.error} strokeWidth={IconStroke} />
        <Text style={styles.logoutText}> Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const StatCell = ({ label, count }: { label: string; count: number }) => (
  <View style={styles.statCell}>
    <Text style={[styles.statCount, count > 0 && styles.statCountPending]}>
      {count}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: 14 },

  avatarSection: { alignItems: 'center', paddingVertical: 16 },
  avatar: {
    width:        80,
    height:       80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems:   'center',
    marginBottom: 12,
    elevation:    4,
    shadowColor:  colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarText: { color: 'white', fontSize: 32, fontWeight: '700' },
  name:       { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  username:   { fontSize: 14, color: colors.textSecondary, marginBottom: 10 },
  roleBadge: {
    backgroundColor:  colors.primaryLight,
    borderRadius:     20,
    paddingHorizontal: 14,
    paddingVertical:  5,
    borderWidth:      1,
    borderColor:      '#C8E4D4',
  },
  roleText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  card:      { marginBottom: 10 },
  cardTitle: {
    fontSize:      11,
    fontWeight:    '700',
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  10,
  },

  // Sync card
  syncCardHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   10,
  },
  connectRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connectDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  connectDotOnline:  { backgroundColor: colors.good  ?? '#2e7d32' },
  connectDotOffline: { backgroundColor: colors.error },
  connectDotUnknown: { backgroundColor: colors.textMuted },
  connectText:       { fontSize: 12, color: colors.textSecondary },

  statsGrid: {
    flexDirection:  'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    borderRadius:   10,
    padding:        12,
    marginBottom:   10,
  },
  statCell:  { alignItems: 'center', flex: 1 },
  statCount: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  statCountPending: { color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  pendingBanner: {
    backgroundColor: colors.primaryLight,
    borderRadius:    8,
    padding:         8,
    alignItems:      'center',
    marginBottom:    10,
  },
  pendingBannerText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  syncBtn: {
    backgroundColor: colors.primary,
    borderRadius:    10,
    padding:         12,
    alignItems:      'center',
    marginTop:       4,
  },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnText:     { color: 'white', fontSize: 14, fontWeight: '600' },

  errorSection: { marginTop: 10 },
  errorToggle:  { paddingVertical: 4 },
  errorToggleText: { fontSize: 12, color: colors.error, fontWeight: '600' },
  errorItem: { fontSize: 11, color: colors.error, paddingVertical: 3, paddingLeft: 8 },

  infoRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '500', color: colors.textPrimary, textAlign: 'right', flex: 1, marginLeft: 10 },

  logoutBtn: {
    marginTop:      10,
    backgroundColor: colors.errorBg,
    borderRadius:   12,
    padding:        15,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1,
    borderColor:    colors.error,
  },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: '600' },
});

export default ProfileScreen;
