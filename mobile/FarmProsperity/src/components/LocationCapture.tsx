// src/components/LocationCapture.tsx
// Auto-captures GPS on mount. Uses react-native-geolocation-service for
// reliable GPS on Android 12+ and New Architecture.
// Shows spinner while fetching, formatted coords on success, error + retry on failure.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  StyleSheet,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { colors } from '../utils/colors';
import type { LocationDraft } from '../types/cropMonitoring';

interface LocationCaptureProps {
  location: LocationDraft;
  onCapture: (loc: LocationDraft) => void;
  error?: string;
}

type CaptureState = 'idle' | 'requesting' | 'success' | 'denied' | 'error';

// ── Permission helper ─────────────────────────────────────────────────────────

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  try {
    // Request both FINE + COARSE together — required for Android 12+ (API 31+)
    // to avoid the dialog being silently suppressed.
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    return (
      results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED ||
      results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
};

// ── Component ─────────────────────────────────────────────────────────────────

const LocationCapture = ({ location, onCapture, error }: LocationCaptureProps) => {
  const [captureState, setCaptureState] = useState<CaptureState>(
    location.captured ? 'success' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string>('');

  const capture = useCallback(async () => {
    setCaptureState('requesting');
    setErrorMessage('');

    const permitted = await requestLocationPermission();
    if (!permitted) {
      setCaptureState('denied');
      setErrorMessage(
        'Location permission denied. Please enable it in device Settings.',
      );
      onCapture({ latitude: null, longitude: null, captured: false });
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCaptureState('success');
        onCapture({ latitude, longitude, captured: true });
      },
      (geoError) => {
        setCaptureState('error');
        const msg =
          geoError.code === 1
            ? 'Location access denied. Enable in Settings.'
            : geoError.code === 2
            ? 'GPS signal not found. Step outside and retry.'
            : 'Could not get location (timeout). Please retry.';
        setErrorMessage(msg);
        onCapture({ latitude: null, longitude: null, captured: false });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }, [onCapture]);

  // Auto-capture on first mount
  useEffect(() => {
    if (!location.captured) {
      capture();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCoords = (lat: number, lng: number): string =>
    `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'},  ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        Location (Auto Captured) <Text style={styles.required}>*</Text>
      </Text>

      <View
        style={[
          styles.box,
          captureState === 'success' && styles.boxSuccess,
          (captureState === 'denied' || captureState === 'error') && styles.boxError,
        ]}
      >
        {/* Left: status icon + text */}
        <View style={styles.boxLeft}>
          {captureState === 'requesting' ? (
            <>
              <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
              <Text style={styles.statusText}>Capturing GPS…</Text>
            </>
          ) : captureState === 'success' &&
            location.latitude !== null &&
            location.longitude !== null ? (
            <>
              <Text style={styles.coordIcon}>📍</Text>
              <View>
                <Text style={styles.coordText}>
                  {formatCoords(location.latitude, location.longitude)}
                </Text>
                <Text style={styles.capturedLabel}>Captured</Text>
              </View>
            </>
          ) : captureState === 'denied' || captureState === 'error' ? (
            <>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorInlineText} numberOfLines={2}>
                {errorMessage}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.coordIcon}>📍</Text>
              <Text style={styles.statusText}>Waiting for GPS…</Text>
            </>
          )}
        </View>

        {/* Right: refresh / retry button */}
        {captureState !== 'requesting' && (
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={capture}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* External validation error from parent */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.surface,
    minHeight: 58,
  },
  boxSuccess: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  boxError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  boxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  spinner: {
    marginRight: 2,
  },
  coordIcon: {
    fontSize: 20,
  },
  coordText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  capturedLabel: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
    marginTop: 2,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorIcon: {
    fontSize: 18,
  },
  errorInlineText: {
    fontSize: 13,
    color: colors.error,
    flex: 1,
  },
  refreshBtn: {
    padding: 4,
    marginLeft: 8,
  },
  refreshIcon: {
    fontSize: 18,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.error,
  },
});

export default LocationCapture;
