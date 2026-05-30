/**
 * EmptyState — Shown when a list has no items or a fetch returned nothing.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
}

const EmptyState = ({ emoji = '📭', title, subtitle }: EmptyStateProps) => (
  <View style={styles.container}>
    <Text style={styles.emoji}>{emoji}</Text>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 10,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default EmptyState;
