/**
 * App.tsx — Root entry point for Farm Prosperity Solution mobile app.
 *
 * Phase 3 addition:
 *  - useAutoSync() is called at the root level so the connectivity listener
 *    runs for the entire authenticated session lifetime.
 *
 * Wraps the entire app in AuthProvider, which:
 *  - Manages the user session state
 *  - Shows a splash spinner while restoring session on cold start
 *
 * AppNavigator reads authStore and shows Login or Main stack accordingly.
 */

import React from 'react';
import { StatusBar } from 'react-native';

import { AuthProvider } from './src/store/authStore';
import AppNavigator    from './src/navigation/AppNavigator';
import { colors }      from './src/utils/colors';
import { useAutoSync } from './src/sync/useAutoSync';

// Inner component so useAutoSync() can run inside the AuthProvider context
// (which is where the Axios token interceptor lives).
const AppInner = () => {
  useAutoSync(); // background sync listener — throttled to 60 s
  return (
    <>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <AppNavigator />
    </>
  );
};

const App = () => (
  <AuthProvider>
    <AppInner />
  </AuthProvider>
);

export default App;
