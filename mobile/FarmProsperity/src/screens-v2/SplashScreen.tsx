/**
 * SplashScreen (v2)
 *
 * - Deep Forest Green canvas — the ONLY screen where #1A4A2E is the background
 * - FPS logo fade-in + animated progress bar
 * - Auto-navigates to Welcome after 2.5s
 * - No interaction — pure branded loading moment
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../navigation/types';

const { width: _width } = Dimensions.get('window');

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Splash'>;
};

const SplashScreen = ({ navigation }: Props) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade logo in over 600ms
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Progress bar fills over 2s
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Navigate to Welcome after 2.5s
    const timer = setTimeout(() => {
      navigation.replace('Welcome');
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, navigation, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A4A2E" />

      {/* ── Logo + Brand ── */}
      <Animated.View style={[styles.center, { opacity: fadeAnim }]}>
        <View style={styles.logoRing}>
          <Image
            source={require('../assets/fps_logo.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>Farm Prosperity Solutions</Text>
        <Text style={styles.appSub}>Crop Intelligence Platform</Text>
      </Animated.View>

      {/* ── Progress bar + version ── */}
      <View style={styles.bottom}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.version}>v2.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A4A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  logo: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  appSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  bottom: {
    width: '100%',
    paddingBottom: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 14,
  },
  progressTrack: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 1,
  },
  version: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
});

export default SplashScreen;
