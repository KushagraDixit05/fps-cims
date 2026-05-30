/**
 * LoadingScreen — Full-screen centered spinner.
 * Shown during API calls that block the whole screen.
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen = ({ message }: LoadingScreenProps) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={colors.primary} />
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 16,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default LoadingScreen;
