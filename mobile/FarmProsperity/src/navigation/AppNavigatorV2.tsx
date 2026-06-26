/**
 * AppNavigatorV2 — Redesigned navigation flow.
 *
 * Auth flow (no user session):
 *   Splash → Welcome → Signup | Login → Home
 *
 * App flow (authenticated):
 *   DrawerNavigator wrapping the Main Tab navigator
 *   Hamburger ☰ opens SidebarContent drawer
 *
 * Phase 6 — RBAC tab gating:
 *   Bottom tabs are shown/hidden based on the user's permission codenames
 *   decoded from the JWT access token.  When perms are empty (token not yet
 *   decoded or field exec still on a legacy token), all tabs are shown as a
 *   safe fallback so nobody gets locked out unintentionally.
 *
 * HOW TO ACTIVATE:
 *   In App.tsx (or index.js) replace:
 *     import AppNavigator from './src/navigation/AppNavigator';
 *   with:
 *     import AppNavigator from './src/navigation/AppNavigatorV2';
 *
 * ROLLBACK:
 *   Revert the above import — zero other changes needed.
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import {
  Home, Leaf, Store, BarChart2, ClipboardList,
  IconSize, IconStroke,
} from '../utils/icons';

import { useAuth } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import { colors } from '../utils/colors';

// ── v2 Auth Screens ───────────────────────────────────────────────────────────
import SplashScreen from '../screens-v2/SplashScreen';
import WelcomeScreen from '../screens-v2/WelcomeScreen';
import SignupScreen from '../screens-v2/SignupScreen';
import LoginScreen from '../screens-v2/LoginScreen';

// ── v2 App Screens ────────────────────────────────────────────────────────────
import HomeScreen from '../screens-v2/HomeScreen';
import SidebarContent from '../screens-v2/SidebarContent';
import MarketIntelligenceHubScreen from '../screens-v2/MarketIntelligenceHubScreen';

// ── Existing screens (unchanged — still used for all other tabs/routes) ───────
import MandiListScreen from '../screens/MandiListScreen';
import MandiEntryFormScreen from '../screens/MandiEntryFormScreen';
import MandiDetailScreen from '../screens/MandiDetailScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CropMonitoringFormScreen from '../screens/cropMonitoring/CropMonitoringFormScreen';
import CropMonitoringDetailScreen from '../screens/cropMonitoring/CropMonitoringDetailScreen';
import CropMonitoringListScreen from '../screens/cropMonitoring/CropMonitoringListScreen';
import MandiArrivalFormScreen from '../screens/mandiArrival/MandiArrivalFormScreen';
import MandiArrivalListScreen from '../screens/mandiArrival/MandiArrivalListScreen';
import ProductDemoListScreen from '../screens/productDemo/ProductDemoListScreen';
import ProductDemoFormScreen from '../screens/productDemo/ProductDemoFormScreen';
import ProductDemoDetailScreen from '../screens/productDemo/ProductDemoDetailScreen';

// ── Phase 6 — Approval Queue screen ──────────────────────────────────────────
import ApprovalQueueScreen from '../screens/approvals/ApprovalQueueScreen';

// Type imports
import type { RootStackParamList, MainTabParamList, AuthStackParamList } from './types';

// ── Navigators ────────────────────────────────────────────────────────────────
const AuthStack = createStackNavigator<AuthStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator();

// ── Shared header style ───────────────────────────────────────────────────────
const headerOptions = {
  headerShown: true,
  headerTintColor: 'white',
  headerStyle: { backgroundColor: colors.primary },
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 16 },
};

// ── Tab icon map ──────────────────────────────────────────────────────────────
const TAB_ICON_MAP: Record<string, React.ComponentType<any>> = {
  Home:          Home,
  Crops:         Leaf,
  Mandi:         Store,
  Reports:       BarChart2,
  ApprovalQueue: ClipboardList,
};

// ── Bottom Tabs — permission-gated (Phase 6) ──────────────────────────────────
/**
 * Defined as a named function (not an arrow-const) so it can call React hooks.
 *
 * Tabs are rendered conditionally:
 *  - Home   : always visible (every authenticated user starts here)
 *  - Crops  : requires can_access_crop_module
 *  - Mandi  : requires can_access_mandi_module
 *  - Reports: requires can_view_own_analytics (all roles have this)
 *  - Approvals: shown when user has any module-level approve permission
 *
 * When perms is empty (new session, token not yet decoded), all tabs are
 * shown as a fail-open fallback — nobody gets locked out mid-session.
 */
function MainTabs() {
  const { canAccessModule, can, perms } = usePermissions();
  const noPerms = perms.length === 0;  // fail-open when not yet decoded

  const showCrops    = noPerms || canAccessModule('crop');
  const showMandi    = noPerms || canAccessModule('mandi');
  const showReports  = noPerms || can('can_view_own_analytics');
  const showApprovals =
    can('can_approve_crop_visit') ||
    can('can_approve_mandi_arrival') ||
    can('can_approve_product_demo');

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerShown: false,
        tabBarIcon: ({ color }) => {
          const Icon = TAB_ICON_MAP[route.name];
          return Icon ? (
            <Icon size={IconSize.tab} color={color} strokeWidth={IconStroke} />
          ) : null;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />

      {showCrops && (
        <Tab.Screen name="Crops" component={CropMonitoringListScreen} options={{ tabBarLabel: 'Crops' }} />
      )}

      {showMandi && (
        <Tab.Screen name="Mandi" component={MarketIntelligenceHubScreen} options={{ tabBarLabel: 'Market' }} />
      )}

      {showReports && (
        <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarLabel: 'Reports' }} />
      )}

      {showApprovals && (
        <Tab.Screen
          name="ApprovalQueue"
          component={ApprovalQueueScreen}
          options={{ tabBarLabel: 'Approvals' }}
        />
      )}
    </Tab.Navigator>
  );
}

// ── Drawer (wraps tabs + gives access to sidebar) ─────────────────────────────
const DrawerNavigator = () => (
  <Drawer.Navigator
    drawerContent={(props) => <SidebarContent {...props} />}
    screenOptions={{
      headerShown: false,
      drawerStyle: { width: '80%' },
      drawerType: 'front',
      overlayColor: 'rgba(0,0,0,0.4)',
    }}
  >
    <Drawer.Screen name="DrawerHome" component={MainTabs} />
  </Drawer.Navigator>
);

// ── Auth Stack ────────────────────────────────────────────────────────────────
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Splash" component={SplashScreen} />
    <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
);

// ── Root Navigator ────────────────────────────────────────────────────────────
const AppNavigatorV2 = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user == null ? (
          // ── Unauthenticated: show Auth flow ──────────────────────────────────
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          // ── Authenticated: Drawer wrapping tabs + all detail screens ─────────
          <>
            <RootStack.Screen name="Main" component={DrawerNavigator} />

            {/* ── Mandi screens ── */}
            <RootStack.Screen name="MandiList" component={MandiListScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="MandiEntryForm" component={MandiEntryFormScreen} options={{ ...headerOptions, title: 'Add Mandi Entry' }} />
            <RootStack.Screen name="MandiDetail" component={MandiDetailScreen} options={{ ...headerOptions, title: 'Mandi Detail' }} />

            {/* ── Crop Monitoring Module ── */}
            <RootStack.Screen name="CropMonitoringForm" component={CropMonitoringFormScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="CropMonitoringDetail" component={CropMonitoringDetailScreen} options={{ ...headerOptions, title: 'Visit Details' }} />

            {/* ── Mandi Arrival Module ── */}
            <RootStack.Screen name="MandiArrivalList" component={MandiArrivalListScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="MandiArrivalForm" component={MandiArrivalFormScreen} options={{ headerShown: false }} />

            {/* ── Product Demo Module ── */}
            <RootStack.Screen name="ProductDemoList" component={ProductDemoListScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="ProductDemoForm" component={ProductDemoFormScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="ProductDemoDetail" component={ProductDemoDetailScreen} options={{ headerShown: false }} />

            {/* ── Approval Queue (Phase 6) ── */}
            <RootStack.Screen name="ApprovalQueue" component={ApprovalQueueScreen} options={{ headerShown: false }} />

            {/* ── Misc ── */}
            <RootStack.Screen name="Profile" component={ProfileScreen} options={{ ...headerOptions, title: 'My Profile' }} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F6F1',
  },
});

export default AppNavigatorV2;
