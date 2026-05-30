/**
 * ConditionBadge — Good / Average / Poor colored pill label.
 * Used in crop list rows and detail screens.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
import { conditionColor, conditionBgColor, conditionLabel } from '../utils/helpers';
import type { CropCondition } from '../types';

interface ConditionBadgeProps {
  condition: CropCondition;
  /** Show a smaller, compact version */
  compact?: boolean;
}

const ConditionBadge = ({ condition, compact = false }: ConditionBadgeProps) => {
  const fg = conditionColor(condition);
  const bg = conditionBgColor(condition);
  const label = conditionLabel(condition);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: fg },
        compact && styles.compact,
      ]}
    >
      <Text style={[styles.text, { color: fg }, compact && styles.textCompact]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  compact: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 11,
  },
});

export default ConditionBadge;
