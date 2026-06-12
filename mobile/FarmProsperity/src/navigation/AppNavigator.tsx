/**
 * App Navigator — combines Auth and Main stacks.
 *
 * Logic:
 *  - While isLoading → show a loading spinner (session restore in progress).
 *  - user == null → show Auth stack (Login only).
 *  - user != null → show Main stack (tabs + detail screens).
 *
 * This means navigation to/from Login is handled entirely by authStore state,
 * not by calling navigation.navigate() from screens.
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Leaf, Store, BarChart2 } from '../utils/icons';
import { IconSize, IconStroke } from '../utils/icons';

import { useAuth } from '../store/authStore';
import { colors } from '../utils/colors';

// ── Existing screens ──────────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CropListScreen from '../screens/CropListScreen';
import CropEntryFormScreen from '../screens/CropEntryFormScreen';
import CropDetailScreen from '../screens/CropDetailScreen';
import MandiListScreen from '../screens/MandiListScreen';
import MandiEntryFormScreen from '../screens/MandiEntryFormScreen';
import MandiDetailScreen from '../screens/MandiDetailScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// ── New: Crop Monitoring Module screens ───────────────────────────────────────
import CropMonitoringFormScreen from '../screens/cropMonitoring/CropMonitoringFormScreen';
import CropMonitoringDetailScreen from '../screens/cropMonitoring/CropMonitoringDetailScreen';
import ProductDemoDetailScreen from '../screens/productDemo/ProductDemoDetailScreen';

// Type imports
import type { RootStackParamList, MainTabParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Shared header style ──────────────────────────────────────────────────────
const headerOptions = {
  headerShown: true,
  headerTintColor: 'white',
  headerStyle: { backgroundColor: colors.primary },
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 16 },
};

// ─── Bottom Tabs ──────────────────────────────────────────────────────────────
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
    <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
    <Tab.Screen name="Crops" component={CropListScreen} options={{ tabBarLabel: 'Crops' }} />
    <Tab.Screen name="Mandi" component={MandiListScreen} options={{ tabBarLabel: 'Market' }} />
    <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarLabel: 'Reports' }} />
  </Tab.Navigator>
);


// ─── Root Stack ───────────────────────────────────────────────────────────────
const AppNavigator = () => {
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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user == null ? (
          // ── Auth ────────────────────────────────────────────────────────────
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // ── App ─────────────────────────────────────────────────────────────
          <>
            <Stack.Screen name="Main" component={MainTabs} />

            {/* ── Legacy Crop Entry screens (preserved) ── */}
            <Stack.Screen
              name="CropEntryForm"
              component={CropEntryFormScreen}
              options={{ ...headerOptions, title: 'Add Crop Entry' }}
            />
            <Stack.Screen
              name="CropDetail"
              component={CropDetailScreen}
              options={{ ...headerOptions, title: 'Crop Detail' }}
            />

            {/* ── Mandi screens ── */}
            <Stack.Screen
              name="MandiEntryForm"
              component={MandiEntryFormScreen}
              options={{ ...headerOptions, title: 'Add Mandi Entry' }}
            />
            <Stack.Screen
              name="MandiDetail"
              component={MandiDetailScreen}
              options={{ ...headerOptions, title: 'Mandi Detail' }}
            />

            {/* ── Crop Monitoring Module (new) ── */}
            <Stack.Screen
              name="CropMonitoringForm"
              component={CropMonitoringFormScreen}
              options={{ headerShown: false }} // custom topbar inside the screen
            />
            <Stack.Screen
              name="CropMonitoringDetail"
              component={CropMonitoringDetailScreen}
              options={{ ...headerOptions, title: 'Visit Details' }}
            />
            {/* CropMonitoringReview + CropMonitoringSuccess are rendered as
                in-tree components inside CropMonitoringFormScreen (not separate routes)
                to prevent the user from navigating to them directly via back-stack. */}

            {/* ── Product Demo Module ── */}
            <Stack.Screen name="ProductDemoDetail" component={ProductDemoDetailScreen} options={{ headerShown: false }} />

            {/* ── Misc ── */}
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ ...headerOptions, title: 'My Profile' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppNavigator;
