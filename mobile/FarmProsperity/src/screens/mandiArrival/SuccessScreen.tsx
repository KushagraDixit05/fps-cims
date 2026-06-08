// src/screens/mandiArrival/SuccessScreen.tsx
// Animated success screen — shown after a successful mandi arrival submission.
// Identical animation pattern to cropMonitoring/SuccessScreen.tsx.

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';
import { colors } from '../../utils/colors';
import Button from '../../components/Button';
import AppIcon from '../../components/AppIcon';
import { Check } from '../../utils/icons';

interface SuccessScreenProps {
  mandiName?: string;
  varietyCount?: number;
  onAddNew: () => void;
  onDashboard: () => void;
}

const SuccessScreen = ({
  mandiName,
  varietyCount,
  onAddNew,
  onDashboard,
}: SuccessScreenProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pop-in animation on mount — identical to CMM SuccessScreen
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <View style={styles.container}>
      {/* Animated checkmark circle */}
      <Animated.View
        style={[
          styles.iconCircle,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <AppIcon icon={Check} size={52} color={colors.success} strokeWidth={2.5} />
      </Animated.View>

      <Animated.View style={{ opacity: opacityAnim, alignItems: 'center', width: '100%' }}>
        <Text style={styles.title}>Mandi Arrival Entry{'\n'}Submitted Successfully!</Text>
        <Text style={styles.subtitle}>
          {mandiName
            ? `Data for ${mandiName} has been saved.`
            : 'Your mandi arrival data has been saved.'}
          {varietyCount !== undefined && varietyCount > 0
            ? `\n${varietyCount} crop ${varietyCount === 1 ? 'variety' : 'varieties'} recorded.`
            : ''}
        </Text>

        <View style={styles.divider} />

        <Button
          title="+ ADD NEW ENTRY"
          onPress={onAddNew}
          variant="primary"
          style={styles.btn}
        />
        <Button
          title="GO TO DASHBOARD"
          onPress={onDashboard}
          variant="secondary"
          style={styles.btn}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.successBg,
    borderWidth: 2,
    borderColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 12,
  },
  divider: { height: 1, backgroundColor: colors.border, width: '100%', marginVertical: 28 },
  btn:     { width: '100%', marginBottom: 12 },
});

export default SuccessScreen;
