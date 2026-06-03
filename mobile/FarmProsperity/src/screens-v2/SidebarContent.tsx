/**
 * SidebarContent (v2)
 *
 * Used as the drawer content component inside the Drawer Navigator.
 * Contains:
 *  - Header: FPS logo + user info + sync status
 *  - Nav items: Home, New Visit, Mandi, My Visits, Reports
 *  - Bottom: Profile, Sync Status, Logout
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAuth } from '../store/authStore';

type NavItem = {
  icon: string;
  label: string;
  screen: string;
  danger?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { icon: '🏠', label: 'Home', screen: 'Home' },
  { icon: '🌾', label: 'New Visit', screen: 'CropMonitoringForm' },
  { icon: '📦', label: 'Mandi', screen: 'Mandi' },
  { icon: '🗺️', label: 'My Visits', screen: 'Crops' },
  { icon: '📊', label: 'Reports', screen: 'Reports' },
];

const SidebarContent = (props: DrawerContentComponentProps) => {
  const { navigation, state } = props;
  const { user, logout } = useAuth();

  const activeRouteName = state.routes[state.index]?.name ?? 'Home';
  const displayName = user ? user.first_name || user.username : 'User';

  const navigateTo = (screen: string) => {
    navigation.closeDrawer();
    // Short delay so drawer close animation completes first
    setTimeout(() => navigation.navigate(screen as any), 150);
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Drawer Header ── */}
      <View style={styles.drawerHeader}>
        <Image
          source={require('../assets/fps_logo.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userRole}>
          {user?.role === 'field_executive' ? 'Field Executive' : user?.role ?? ''}
        </Text>
        {user?.region ? (
          <Text style={styles.userRegion}>📍 {user.region}</Text>
        ) : null}
        <View style={styles.syncPill}>
          <Text style={styles.syncText}>● Synced</Text>
        </View>
      </View>

      {/* ── Nav Items ── */}
      <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map(({ icon, label, screen }) => {
          const isActive = activeRouteName === screen;
          return (
            <TouchableOpacity
              key={label}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => navigateTo(screen)}
              activeOpacity={0.75}
            >
              <Text style={[styles.navIcon, isActive && styles.navIconActive]}>{icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.divider} />

        {/* Profile */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => { navigation.closeDrawer(); setTimeout(() => navigation.navigate('Profile' as any), 150); }}
          activeOpacity={0.75}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>

        {/* Sync Status */}
        <View style={[styles.navItem, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={styles.navIcon}>⟳</Text>
            <Text style={styles.navLabel}>Sync Status</Text>
          </View>
          <Text style={styles.syncedLabel}>Synced</Text>
        </View>
      </ScrollView>

      {/* ── Logout ── */}
      <View style={styles.logoutSection}>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            navigation.closeDrawer();
            setTimeout(() => logout(), 200);
          }}
          activeOpacity={0.75}
        >
          <Text style={[styles.navIcon, styles.dangerIcon]}>🚪</Text>
          <Text style={[styles.navLabel, styles.dangerLabel]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header
  drawerHeader: {
    backgroundColor: '#1A4A2E',
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  logo: { width: 44, height: 44, borderRadius: 22, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  userName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  userRole: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  userRegion: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  syncPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E1F2E8',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 8,
  },
  syncText: { color: '#1A8A3A', fontSize: 11, fontWeight: '600' },

  // Nav
  navSection: { flex: 1, paddingTop: 8 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  navItemActive: { backgroundColor: '#E1F2E8' },
  navIcon: { fontSize: 20, color: '#6A7A6A', width: 28, textAlign: 'center' },
  navIconActive: { color: '#1A4A2E' },
  navLabel: { fontSize: 15, color: '#1A3A25', fontWeight: '500' },
  navLabelActive: { color: '#1A4A2E', fontWeight: '700' },
  syncedLabel: { fontSize: 12, color: '#1A8A3A', fontWeight: '600' },

  // Divider
  divider: { height: 1, backgroundColor: '#F0EDE6', marginVertical: 8, marginHorizontal: 8 },

  // Logout
  logoutSection: { paddingBottom: 8 },
  dangerIcon: { color: '#D63333' },
  dangerLabel: { color: '#D63333', fontWeight: '600' },
});

export default SidebarContent;
