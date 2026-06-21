/**
 * MarketIntelligenceHubScreen (v2)
 * Landing page for the Market Intelligence Module — the single entry point reached
 * from the Home card, the Sidebar, and the "Market" bottom tab.
 *
 * Offers two options:
 *   - New Entries   → MandiListScreen (list + "+" FAB → 4-step wizard)
 *   - Market Trends → ReportsScreen (existing YoY analytics, sibling tab)
 *
 * No backend, data-model, or wizard changes — pure navigation hub.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../utils/colors';
import ScreenHeader from '../components/ScreenHeader';
import AppIcon from '../components/AppIcon';
import { Store, BarChart2, ChevronRight, IconStroke } from '../utils/icons';

type HubOption = {
  bg: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  title: string;
  sub: string;
  /** Navigation target — RootStack route or sibling tab name. */
  screen: string;
};

const OPTIONS: HubOption[] = [
  {
    bg: '#FEF3DA',
    icon: Store,
    iconColor: '#C8900A',
    title: 'New Entries',
    sub: 'View & add entries',
    screen: 'MandiArrivalList',
  },
  {
    bg: '#F3E8FF',
    icon: BarChart2,
    iconColor: '#7C3AED',
    title: 'Market Trends',
    sub: 'Mandi rates · YoY trends',
    screen: 'MandiList',
  },
];

const MarketIntelligenceHubScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Market Intelligence Module"
        subtitle="Arrivals · Trends"
        onBack={() => navigation.navigate('Home')}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {OPTIONS.map(({ bg, icon, iconColor, title, sub, screen }) => (
          <TouchableOpacity
            key={title}
            style={[styles.card, { backgroundColor: bg }]}
            onPress={() => navigation.navigate(screen)}
            activeOpacity={0.85}
          >
            <View style={styles.cardIconWrap}>
              <AppIcon icon={icon} size={26} color={iconColor} strokeWidth={IconStroke} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSub}>{sub}</Text>
            </View>
            <AppIcon icon={ChevronRight} size={20} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  content: { padding: 14, gap: 12 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 18,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A3A25' },
  cardSub: { fontSize: 12, color: '#6A7A6A', marginTop: 2 },
});

export default MarketIntelligenceHubScreen;
