/**
 * App.tsx — Root entry point for Farm Prosperity Solution mobile app.
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
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/utils/colors';

const App = () => (
  <AuthProvider>
    <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
    <AppNavigator />
  </AuthProvider>
);

export default App;
