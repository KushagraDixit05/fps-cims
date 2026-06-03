/**
 * AppIcon — thin wrapper around lucide-react-native icons.
 * Applies FPS default size and stroke width so every icon is consistent.
 *
 * Usage:
 *   import { AppIcon } from './AppIcon';
 *   import { Leaf } from '../utils/icons';
 *
 *   <AppIcon icon={Leaf} color={colors.primary} size="md" />
 */

import React from 'react';
import { IconSize, IconStroke } from '../utils/icons';

interface AppIconProps {
  icon: React.ComponentType<any>;
  color?: string;
  size?: keyof typeof IconSize | number;
  strokeWidth?: number;
}

const AppIcon = ({
  icon: Icon,
  color = '#6A7A6A',
  size = 'md',
  strokeWidth = IconStroke,
}: AppIconProps) => {
  const px = typeof size === 'number' ? size : IconSize[size];
  return <Icon size={px} color={color} strokeWidth={strokeWidth} />;
};

export default AppIcon;
