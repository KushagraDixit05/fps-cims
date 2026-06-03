/**
 * WelcomeScreen (v2)
 *
 * - Warm sand background canvas
 * - FPS logo + brand headline in top section
 * - "Create Account" → Signup   |   "I already have an account" → Login
 * - Tagline: "Efficient. Confident. Grounded."
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../navigation/types';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Welcome'>;
};

const WelcomeScreen = ({ navigation }: Props) => {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F6F1" />

      {/* ── Brand Section ── */}
      <View style={styles.brandSection}>
        <View style={styles.logoCard}>
          <Image
            source={require('../assets/fps_logo.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.headline}>Farm Prosperity Solutions</Text>
        <Text style={styles.subtitle}>Your field intelligence platform</Text>

        <View style={styles.separator} />

        <Text style={styles.tagline}>Efficient. Confident. Grounded.</Text>
      </View>

      {/* ── CTAs ── */}
      <View style={styles.ctaSection}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.outlineBtnText}>I already have an account</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Farm Prosperity Solutions · v2.0</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F6F1',
  },

  // ── Brand ─────────────────────────────────────────────
  brandSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  logoCard: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E0DDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    // Card ambient shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  logo: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A3A25',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6A7A6A',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },
  separator: {
    width: 60,
    height: 1,
    backgroundColor: '#E0DDD5',
    marginTop: 20,
    marginBottom: 14,
  },
  tagline: {
    fontSize: 13,
    color: '#8A8A7A',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ── CTAs ──────────────────────────────────────────────
  ctaSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#1A4A2E',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1A4A2E',
  },
  outlineBtnText: {
    color: '#1A4A2E',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#8A8A7A',
    marginTop: 4,
  },
});

export default WelcomeScreen;
