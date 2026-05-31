// src/screens/cropMonitoring/SuccessScreen.tsx
// Animated success screen shown after a successful visit submission.

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../utils/colors';
import Button from '../../components/Button';

interface SuccessScreenProps {
  onAddNew: () => void;
  onDashboard: () => void;
  farmerName?: string;
  cropCount?: number;
}

const SuccessScreen = ({
  onAddNew,
  onDashboard,
  farmerName,
  cropCount,
}: SuccessScreenProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pop-in animation on mount
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
      {/* Animated checkmark */}
      <Animated.View
        style={[
          styles.iconCircle,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={styles.checkmark}>✓</Text>
      </Animated.View>

      <Animated.View style={{ opacity: opacityAnim, alignItems: 'center' }}>
        <Text style={styles.title}>Entry Submitted!</Text>
        <Text style={styles.subtitle}>
          {farmerName
            ? `Visit for ${farmerName} with ${cropCount ?? 0} crop${(cropCount ?? 0) !== 1 ? 's' : ''} has been saved.`
            : 'Your crop monitoring data has been saved.'}
        </Text>

        <View style={styles.divider} />

        <Button
          title="+ ADD NEW ENTRY"
          onPress={onAddNew}
          variant="primary"
          style={styles.btn}
        />
        <TouchableOpacity style={styles.dashboardBtn} onPress={onDashboard}>
          <Text style={styles.dashboardBtnText}>GO TO DASHBOARD</Text>
        </TouchableOpacity>
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
    marginBottom: 28,
  },
  checkmark:  { fontSize: 48, color: colors.success, lineHeight: 56 },
  title:      { fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 10 },
  subtitle:   { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: 12 },
  divider:    { height: 1, backgroundColor: colors.border, width: '100%', marginVertical: 28 },
  btn:        { width: '100%', marginBottom: 12 },
  dashboardBtn: { paddingVertical: 12, alignItems: 'center' },
  dashboardBtnText: { fontSize: 14, color: colors.primary, fontWeight: '700' },
});

export default SuccessScreen;
