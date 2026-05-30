/**
 * LoginScreen
 *
 * - Username + password form
 * - Calls authStore.login() on submit
 * - Navigation is handled automatically by AppNavigator (user state change)
 * - Error messages surface as an in-form alert (not system Alert) for better UX
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../store/authStore';
import { colors } from '../utils/colors';

const LoginScreen = () => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      // Navigation is automatic — AppNavigator detects user state change
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        'Login failed. Please check your credentials and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand section ── */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🌱</Text>
          </View>
          <Text style={styles.brandName}>Farm Prosperity Solution</Text>
          <Text style={styles.brandSub}>Crop Intelligence Platform</Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign in</Text>

          {/* Error banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Username */}
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter your username"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            editable={!loading}
          />

          {/* Password */}
          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={!loading}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Login →</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Farm Prosperity Solution · v2.0
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    // Subtle shadow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoEmoji: { fontSize: 34 },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  brandSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 32,
  },
});

export default LoginScreen;
