/**
 * Card — Elevated surface container used throughout list screens and detail views.
 */

import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors } from '../utils/colors';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Remove default padding for custom-padded content */
  noPadding?: boolean;
}

const Card = ({ children, style, noPadding = false }: CardProps) => (
  <View style={[styles.card, noPadding && styles.noPadding, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    // Android shadow
    elevation: 2,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    marginBottom: 10,
  },
  noPadding: {
    padding: 0,
  },
});

export default Card;
