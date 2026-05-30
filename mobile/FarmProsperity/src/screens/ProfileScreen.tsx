/**
 * ProfileScreen — Shows current user info and logout button.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';

import { useAuth } from '../store/authStore';
import { colors } from '../utils/colors';
import Card from '../components/Card';

const ROLE_LABELS: Record<string, string> = {
  field_executive: 'Field Executive',
  admin: 'Administrator',
  viewer: 'Viewer',
};

const ProfileScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          // AppNavigator will automatically switch to Login screen
        },
      },
    ]);
  };

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
    : '—';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
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

      {/* ── Details ── */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Account Details</Text>
        <InfoRow label="Username" value={user?.username ?? '—'} />
        <InfoRow label="Full Name" value={displayName} />
        <InfoRow label="Role" value={user?.role ? ROLE_LABELS[user.role] ?? user.role : '—'} />
        {user?.region ? <InfoRow label="Region" value={user.region} /> : null}
        {user?.phone_number ? (
          <InfoRow label="Phone" value={user.phone_number} />
        ) : null}
      </Card>

      {/* ── App Info ── */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>App Info</Text>
        <InfoRow label="Version" value="2.0.0 (Phase 2)" />
        <InfoRow label="Backend" value="Django REST Framework" />
        <InfoRow label="Auth" value="JWT (SimpleJWT)" />
      </Card>

      {/* ── Logout ── */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 14 },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarText: { color: 'white', fontSize: 32, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  username: { fontSize: 14, color: colors.textSecondary, marginBottom: 10 },
  roleBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#C8E4D4',
  },
  roleText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  card: { marginBottom: 10 },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '500', color: colors.textPrimary, textAlign: 'right', flex: 1, marginLeft: 10 },

  logoutBtn: {
    marginTop: 10,
    backgroundColor: colors.errorBg,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: '600' },
});

export default ProfileScreen;
