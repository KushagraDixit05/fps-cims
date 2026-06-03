/**
 * App.tsx — Root entry point for Farm Prosperity Solutions mobile app.
 *
 * v2 Redesign:
 *  - Uses AppNavigatorV2 which adds Splash → Welcome → Signup | Login flow
 *  - Drawer Navigator wraps the tab navigator (Sidebar ☰)
 *  - GestureHandlerRootView required by @react-navigation/drawer
 *
 * ROLLBACK: change AppNavigatorV2 back to AppNavigator (one line)
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from './src/store/authStore';
import AppNavigator    from './src/navigation/AppNavigatorV2'; // ← v2
import { colors }      from './src/utils/colors';
import { useAutoSync } from './src/sync/useAutoSync';

const AppInner = () => {
  useAutoSync();
  return (
    <>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <AppNavigator />
    </>
  );
};

const App = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  </GestureHandlerRootView>
);

export default App;

