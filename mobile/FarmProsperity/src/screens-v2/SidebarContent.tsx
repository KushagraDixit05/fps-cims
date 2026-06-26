/**
 * SidebarContent (v2)
 * Drawer nav with lucide icons throughout.
 * Phase 6: NAV_ITEMS filtered by permission codenames from the JWT.
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
import { usePermissions } from '../hooks/usePermissions';
import AppIcon from '../components/AppIcon';
import {
  Home, Leaf, Store, BarChart2, ClipboardList,
  User, LogOut, RefreshCw, MapPin,
  IconStroke,
} from '../utils/icons';

type NavItem = {
  icon: React.ComponentType<any>;
  label: string;
  screen: string;
  /** Permission codenames required (OR logic). Absent = always show. */
  requiredPerms?: string[];
};

const ALL_NAV_ITEMS: NavItem[] = [
  { icon: Home,          label: 'Home',                            screen: 'Home' },
  { icon: Leaf,          label: 'Crop Intelligence Module',        screen: 'Crops',         requiredPerms: ['can_access_crop_module'] },
  { icon: Store,         label: 'Market Intelligence Module',      screen: 'Mandi',         requiredPerms: ['can_access_mandi_module'] },
  { icon: ClipboardList, label: 'Approval Queue',                  screen: 'ApprovalQueue', requiredPerms: ['can_approve_crop_visit', 'can_approve_mandi_arrival', 'can_approve_product_demo'] },
  { icon: BarChart2,     label: 'Reports',                         screen: 'Reports',       requiredPerms: ['can_view_own_analytics', 'can_view_team_analytics', 'can_view_all_analytics'] },
];

const SidebarContent = (props: DrawerContentComponentProps) => {
  const { navigation, state } = props;
  const { user, logout } = useAuth();
  const { can, perms } = usePermissions();

  const activeRouteName = state.routes[state.index]?.name ?? 'Home';
  const displayName = user ? user.first_name || user.username : 'User';

  const TAB_SCREENS = new Set(['Home', 'Crops', 'Mandi', 'Reports', 'ApprovalQueue']);

  // Fail-open when perms not yet loaded — show all items.
  const visibleItems = perms.length === 0
    ? ALL_NAV_ITEMS
    : ALL_NAV_ITEMS.filter(item =>
        !item.requiredPerms || item.requiredPerms.some(p => can(p)),
      );

  const navigateTo = (screen: string) => {
    navigation.closeDrawer();
    setTimeout(() => {
      if (TAB_SCREENS.has(screen)) {
        navigation.navigate('DrawerHome' as any, { screen } as any);
      } else {
        navigation.getParent()?.navigate(screen as any);
      }
    }, 150);
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
          <View style={styles.regionRow}>
            <AppIcon icon={MapPin} size={11} color="rgba(255,255,255,0.65)" strokeWidth={2} />
            <Text style={styles.userRegion}> {user.region}</Text>
          </View>
        ) : null}
        <View style={styles.syncPill}>
          <Text style={styles.syncText}>Synced</Text>
        </View>
      </View>

      {/* ── Nav Items (permission-filtered) ── */}
      <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
        {visibleItems.map(({ icon, label, screen }) => {
          const isActive = activeRouteName === screen;
          return (
            <TouchableOpacity
              key={label}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => navigateTo(screen)}
              activeOpacity={0.75}
            >
              <AppIcon
                icon={icon}
                size={20}
                color={isActive ? '#1A4A2E' : '#6A7A6A'}
                strokeWidth={isActive ? 2 : IconStroke}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.divider} />

        {/* Profile */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => { navigation.closeDrawer(); setTimeout(() => navigation.getParent()?.navigate('Profile' as any), 150); }}
          activeOpacity={0.75}
        >
          <AppIcon icon={User} size={20} color="#6A7A6A" strokeWidth={IconStroke} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>

        {/* Sync Status */}
        <View style={[styles.navItem, { justifyContent: 'space-between' }]}>
          <View style={styles.navItemInner}>
            <AppIcon icon={RefreshCw} size={20} color="#6A7A6A" strokeWidth={IconStroke} />
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
          onPress={() => { navigation.closeDrawer(); setTimeout(() => logout(), 200); }}
          activeOpacity={0.75}
        >
          <AppIcon icon={LogOut} size={20} color="#D63333" strokeWidth={IconStroke} />
          <Text style={[styles.navLabel, styles.dangerLabel]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  drawerHeader: {
    backgroundColor: '#1A4A2E',
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  logo: { width: 44, height: 44, borderRadius: 22, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  userName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  userRole: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  regionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  userRegion: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  syncPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E1F2E8',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 8,
  },
  syncText: { color: '#1A8A3A', fontSize: 11, fontWeight: '600' },

  navSection: { flex: 1, paddingTop: 8 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  navItemInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navItemActive: { backgroundColor: '#E1F2E8' },
  navLabel: { fontSize: 15, color: '#1A3A25', fontWeight: '500' },
  navLabelActive: { color: '#1A4A2E', fontWeight: '700' },
  syncedLabel: { fontSize: 12, color: '#1A8A3A', fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#F0EDE6', marginVertical: 8, marginHorizontal: 8 },

  logoutSection: { paddingBottom: 8 },
  dangerLabel: { color: '#D63333', fontWeight: '600' },
});

export default SidebarContent;
