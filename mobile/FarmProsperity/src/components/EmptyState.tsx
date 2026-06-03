import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
import AppIcon from './AppIcon';
import { Inbox } from '../utils/icons';

interface EmptyStateProps {
  icon?: React.ComponentType<any>;
  title: string;
  subtitle?: string;
}

const EmptyState = ({ icon = Inbox, title, subtitle }: EmptyStateProps) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <AppIcon icon={icon} size={44} color={colors.textMuted} strokeWidth={1.5} />
    </View>
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
  iconWrap: { marginBottom: 8, opacity: 0.55 },
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
