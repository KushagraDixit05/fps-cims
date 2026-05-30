/**
 * Button — Reusable primary and secondary button component.
 *
 * Variants:
 *  - 'primary'   → filled green background
 *  - 'secondary' → outlined green border
 *  - 'danger'    → filled red background
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors } from '../utils/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Full width — defaults to true */
  fullWidth?: boolean;
}

const Button = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  fullWidth = true,
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? colors.primary : 'white'}
          size="small"
        />
      ) : (
        <Text style={[styles.label, variant === 'secondary' && styles.labelSecondary]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: {
    flex: 1,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.error,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  labelSecondary: {
    color: colors.primary,
  },
});

export default Button;
