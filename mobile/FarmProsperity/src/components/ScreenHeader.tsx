// src/components/ScreenHeader.tsx
// FPS Enterprise Compact Module Header — Archetype B
// ─────────────────────────────────────────────────────────────────────────────
// Reusable compact header for all module and wizard screens.
// Replaces the duplicated inline green header blocks that existed in every
// list and form screen.
//
// Features:
//   - Safe-area padding using HEADER tokens (no external dependency)
//   - Optional back button with ≥44dp touch target
//   - Title + optional subtitle
//   - Optional right-side element (icon, badge, etc.)
//   - FPS primary green palette
//
// COMPACT_HEADER_REQUIRED — search for this tag to audit compliance.

import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../utils/colors';
import { HEADER } from '../utils/headerTokens';
import AppIcon from './AppIcon';
import { ChevronLeft } from '../utils/icons';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** If provided, a back arrow is rendered on the left. */
  onBack?: () => void;
  /** Optional element rendered on the right side (icon, sync badge, etc.). */
  rightElement?: ReactNode;
}

const ScreenHeader = ({
  title,
  subtitle,
  onBack,
  rightElement,
}: ScreenHeaderProps) => (
  <View style={styles.header}>
    {/* Left — back button or spacer */}
    <View style={styles.side}>
      {onBack ? (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon icon={ChevronLeft} size={20} color="white" strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>

    {/* Centre — title + subtitle */}
    <View style={styles.centre}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>

    {/* Right — custom element or spacer */}
    <View style={styles.side}>
      {rightElement ?? null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingTop:       HEADER.MODULE_PADDING_TOP,
    paddingBottom:    HEADER.MODULE_PADDING_BOTTOM,
    paddingHorizontal: 14,
    flexDirection:    'row',
    alignItems:       'center',
  },

  // Fixed-width side columns keep the title perfectly centred
  side: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backBtn: {
    width:           HEADER.BACK_BTN_SIZE,
    height:          HEADER.BACK_BTN_SIZE,
    borderRadius:    HEADER.BACK_BTN_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems:      'center',
    justifyContent:  'center',
  },

  centre: {
    flex: 1,
    alignItems: 'center',
  },

  title: {
    color:      'white',
    fontSize:   HEADER.TITLE_FONT,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  subtitle: {
    color:     'rgba(255,255,255,0.72)',
    fontSize:   HEADER.SUBTITLE_FONT,
    marginTop:  2,
  },
});

export default ScreenHeader;
