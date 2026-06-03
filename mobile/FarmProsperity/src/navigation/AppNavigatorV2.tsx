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
import { Home, Leaf, Store, BarChart2, IconSize, IconStroke } from '../utils/icons';

import { useAuth } from '../store/authStore';
import { colors } from '../utils/colors';

// ── v2 Auth Screens ───────────────────────────────────────────────────────────
import SplashScreen from '../screens-v2/SplashScreen';
import WelcomeScreen from '../screens-v2/WelcomeScreen';
import SignupScreen from '../screens-v2/SignupScreen';
import LoginScreen from '../screens-v2/LoginScreen';

// ── v2 App Screens ────────────────────────────────────────────────────────────
import HomeScreen from '../screens-v2/HomeScreen';
import SidebarContent from '../screens-v2/SidebarContent';

// ── Existing screens (unchanged — still used for all other tabs/routes) ───────
import CropListScreen from '../screens/CropListScreen';
import CropEntryFormScreen from '../screens/CropEntryFormScreen';
import CropDetailScreen from '../screens/CropDetailScreen';
import MandiListScreen from '../screens/MandiListScreen';
import MandiEntryFormScreen from '../screens/MandiEntryFormScreen';
import MandiDetailScreen from '../screens/MandiDetailScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CropMonitoringFormScreen from '../screens/cropMonitoring/CropMonitoringFormScreen';
import CropMonitoringDetailScreen from '../screens/cropMonitoring/CropMonitoringDetailScreen';

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


// ── Bottom Tabs ───────────────────────────────────────────────────────────────
const MainTabs = () => (
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
        const iconMap: Record<string, React.ComponentType<any>> = {
          Home: Home,
          Crops: Leaf,
          Mandi: Store,
          Reports: BarChart2,
        };
        const Icon = iconMap[route.name];
        return Icon ? (
          <Icon size={IconSize.tab} color={color} strokeWidth={IconStroke} />
        ) : null;
      },
    })}
  >
    {/* Home tab now uses the v2 HomeScreen */}
    <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
    <Tab.Screen name="Crops" component={CropListScreen} options={{ tabBarLabel: 'Crops' }} />
    <Tab.Screen name="Mandi" component={MandiListScreen} options={{ tabBarLabel: 'Mandi' }} />
    <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarLabel: 'Reports' }} />
  </Tab.Navigator>
);

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

            {/* ── Legacy Crop Entry screens ── */}
            <RootStack.Screen name="CropEntryForm" component={CropEntryFormScreen} options={{ ...headerOptions, title: 'Add Crop Entry' }} />
            <RootStack.Screen name="CropDetail" component={CropDetailScreen} options={{ ...headerOptions, title: 'Crop Detail' }} />

            {/* ── Mandi screens ── */}
            <RootStack.Screen name="MandiEntryForm" component={MandiEntryFormScreen} options={{ ...headerOptions, title: 'Add Mandi Entry' }} />
            <RootStack.Screen name="MandiDetail" component={MandiDetailScreen} options={{ ...headerOptions, title: 'Mandi Detail' }} />

            {/* ── Crop Monitoring Module ── */}
            <RootStack.Screen name="CropMonitoringForm" component={CropMonitoringFormScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="CropMonitoringDetail" component={CropMonitoringDetailScreen} options={{ ...headerOptions, title: 'Visit Details' }} />

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
