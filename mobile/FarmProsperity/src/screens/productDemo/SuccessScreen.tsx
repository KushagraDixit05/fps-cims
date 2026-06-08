// src/screens/productDemo/SuccessScreen.tsx
// Animated success screen shown after a product demo entry is submitted.

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
  farmerName?: string;
  productName?: string;
  onAddNew:    () => void;
  onDashboard: () => void;
}

const SuccessScreen = ({
  farmerName,
  productName,
  onAddNew,
  onDashboard,
}: SuccessScreenProps) => {
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
      <Animated.View
        style={[styles.iconCircle, { transform: [{ scale: scaleAnim }] }]}
      >
        <AppIcon icon={Check} size={52} color={colors.success} strokeWidth={2.5} />
      </Animated.View>

      <Animated.View style={{ opacity: opacityAnim, alignItems: 'center', width: '100%' }}>
        <Text style={styles.title}>Demo Entry Submitted{'\n'}Successfully!</Text>
        <Text style={styles.subtitle}>
          {farmerName && productName
            ? `Demo of ${productName} for ${farmerName} has been saved.`
            : 'Your product demo data has been saved.'}
        </Text>

        <View style={styles.divider} />

        <Button
          title="+ ADD NEW DEMO"
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
