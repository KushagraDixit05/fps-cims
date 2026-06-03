/**
 * LoginScreen (v2)
 *
 * Refinements over v1:
 * - Title changed to "Welcome back"
 * - Error banner uses full border (not left-stripe)
 * - "Don't have an account? Create one" link → Signup
 * - Password show/hide uses text toggle (no emoji)
 * - All auth logic identical to original LoginScreen
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
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../store/authStore';
import { seedReferenceData } from '../sync/seedReferenceData';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>;
};

const LoginScreen = ({ navigation }: Props) => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      seedReferenceData().catch(() => {});
      // Navigation handled by AppNavigator (user state change)
    } catch (err: any) {
      const isNetworkError = !err?.response;
      const msg = isNetworkError
        ? 'Cannot reach server. Make sure the backend is running and you are connected.'
        : (err?.response?.data?.detail ?? 'Invalid username or password.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand ── */}
          <View style={styles.brandSection}>
            <View style={styles.logoCard}>
              <Image
                source={require('../assets/fps_logo.jpeg')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* ── Form Card ── */}
          <View style={styles.formCard}>
            {/* Error */}
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
              placeholderTextColor="#8A8A7A"
              returnKeyType="next"
              editable={!loading}
            />

            {/* Password */}
            <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
                placeholderTextColor="#8A8A7A"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(p => !p)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Sign Up Link ── */}
          <TouchableOpacity
            style={styles.signUpLink}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.signUpText}>
              Don't have an account?{' '}
              <Text style={styles.signUpHighlight}>Create one</Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.footer}>Farm Prosperity Solutions · v2.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F6F1' },
  root: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 32,
    justifyContent: 'center',
  },

  // Brand
  brandSection: { alignItems: 'center', marginBottom: 28 },
  logoCard: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E0DDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  logo: { width: 92, height: 92, borderRadius: 46 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A3A25',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#6A7A6A',
    marginTop: 4,
  },

  // Form card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#E0DDD5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },

  // Error
  errorBanner: {
    backgroundColor: '#FCEBEB',
    borderWidth: 1,
    borderColor: '#D63333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: '#D63333', lineHeight: 18 },

  // Labels & inputs
  label: {
    fontSize: 13,
    color: '#6A7A6A',
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0DDD5',
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: '#1A3A25',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0DDD5',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 52,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 14,
    color: '#1A3A25',
  },
  eyeBtn: { paddingHorizontal: 13, justifyContent: 'center' },
  eyeText: { fontSize: 12, color: '#6A7A6A', fontWeight: '600' },

  // Submit
  submitBtn: {
    backgroundColor: '#1A4A2E',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // Links
  signUpLink: { alignItems: 'center', paddingVertical: 10 },
  signUpText: { fontSize: 14, color: '#6A7A6A' },
  signUpHighlight: { color: '#1A4A2E', fontWeight: '700' },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#8A8A7A',
    marginTop: 16,
  },
});

export default LoginScreen;
