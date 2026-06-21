// src/components/share/ShareIconButton.tsx
// Compact, reusable Share affordance used on list rows and detail headers.
// Purely presentational — the screen wires onPress to its useReceiptShare()
// shareEntry(payload), so every entry point shares image + text identically.

import React from 'react';
import { TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import AppIcon from '../AppIcon';
import { colors } from '../../utils/colors';
import { Share2, IconStroke } from '../../utils/icons';

interface ShareIconButtonProps {
  onPress: () => void;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const ShareIconButton = ({
  onPress,
  size = 20,
  color = colors.primary,
  style,
}: ShareIconButtonProps) => (
  <TouchableOpacity
    style={[styles.btn, style]}
    onPress={onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    accessibilityRole="button"
    accessibilityLabel="Share entry"
  >
    <AppIcon icon={Share2} size={size} color={color} strokeWidth={IconStroke} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ShareIconButton;
