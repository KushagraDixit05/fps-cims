/**
 * SignupScreen (v2)
 *
 * - Calls POST /api/auth/register/
 * - On success: stores tokens → auto-login (AppNavigator detects user state)
 * - Sections: Personal Info | Account | Details
 * - Error handling mirrors LoginScreen pattern
 */

import React, { useState, useRef } from 'react';
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
  type TextInput as TextInputType,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../store/authStore';

const BASE_URL = 'http://10.0.2.2:8000'; // Android emulator → localhost

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Signup'>;
};

const SignupScreen = ({ navigation }: Props) => {
  const { loginWithTokens } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field refs for keyboard navigation
  const phoneRef = useRef<TextInputType>(null);
  const usernameRef = useRef<TextInputType>(null);
  const passwordRef = useRef<TextInputType>(null);
  const confirmRef = useRef<TextInputType>(null);
  const regionRef = useRef<TextInputType>(null);

  const handleSignup = async () => {
    setError(null);

    // Client-side validation
    if (!username.trim() || !password || !confirmPassword) {
      setError('Username and password are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone_number: phone.trim() || undefined,
          username: username.trim().toLowerCase(),
          password,
          password2: confirmPassword,
          region: region.trim(),
          role: 'field_executive',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Flatten DRF validation errors
        const messages = Object.values(data)
          .flat()
          .join(' ');
        setError(messages || 'Registration failed. Please try again.');
        return;
      }

      // Auto-login: store tokens and user
      await loginWithTokens(data.access, data.refresh, data.user);
      // AppNavigator detects user → navigates to Main automatically

    } catch {
      setError('Network error. Please check your connection and try again.');
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
        {/* ── Brand Header ── */}
        <View style={styles.header}>
          <Image
            source={require('../assets/fps_logo.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the field intelligence platform</Text>
        </View>

        {/* ── Error Banner ── */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Form Card ── */}
        <View style={styles.formCard}>

          {/* PERSONAL INFO */}
          <Text style={styles.sectionLabel}>PERSONAL INFO</Text>

          <FormField label="Full Name">
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ravi Kumar"
              placeholderTextColor="#8A8A7A"
              autoComplete="name"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              editable={!loading}
            />
          </FormField>

          <FormField label="Phone Number">
            <TextInput
              ref={phoneRef}
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor="#8A8A7A"
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => usernameRef.current?.focus()}
              editable={!loading}
            />
          </FormField>

          <View style={styles.divider} />

          {/* ACCOUNT */}
          <Text style={styles.sectionLabel}>ACCOUNT</Text>

          <FormField label="Username">
            <TextInput
              ref={usernameRef}
              style={styles.input}
              value={username}
              onChangeText={(v) => setUsername(v.toLowerCase())}
              placeholder="e.g. rajesh_nanded"
              placeholderTextColor="#8A8A7A"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!loading}
            />
          </FormField>

          <FormField label="Password">
            <View style={styles.passwordRow}>
              <TextInput
                ref={passwordRef}
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor="#8A8A7A"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(p => !p)}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </FormField>

          <FormField label="Confirm Password">
            <View style={styles.passwordRow}>
              <TextInput
                ref={confirmRef}
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                placeholder="Re-enter password"
                placeholderTextColor="#8A8A7A"
                returnKeyType="next"
                onSubmitEditing={() => regionRef.current?.focus()}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm(p => !p)}
              >
                <Text style={styles.eyeText}>{showConfirm ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </FormField>

          <View style={styles.divider} />

          {/* DETAILS */}
          <Text style={styles.sectionLabel}>DETAILS</Text>

          <FormField label="Region">
            <TextInput
              ref={regionRef}
              style={styles.input}
              value={region}
              onChangeText={setRegion}
              placeholder="e.g. Nanded, Guntur"
              placeholderTextColor="#8A8A7A"
              returnKeyType="done"
              onSubmitEditing={handleSignup}
              editable={!loading}
            />
          </FormField>
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitDisabled]}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* ── Sign In link ── */}
        <TouchableOpacity
          style={styles.signInLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.signInText}>
            Already have an account?{' '}
            <Text style={styles.signInHighlight}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ── Helper component ──────────────────────────────────────────────────────────

const FormField = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F6F1' },
  container: { paddingHorizontal: 16, paddingVertical: 24 },

  // Header
  header: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 56, height: 56, borderRadius: 28, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#1A3A25', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6A7A6A', marginTop: 4 },

  // Error
  errorBanner: {
    backgroundColor: '#FCEBEB',
    borderWidth: 1,
    borderColor: '#D63333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, color: '#D63333' },

  // Form card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#E0DDD5',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6A7A6A',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EDE6',
    marginVertical: 16,
  },

  // Fields
  fieldWrapper: { marginBottom: 14 },
  fieldLabel: {
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
    color: '#1A3A25',
    backgroundColor: '#FFFFFF',
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
  eyeBtn: { paddingHorizontal: 13, paddingVertical: 13, justifyContent: 'center' },
  eyeText: { fontSize: 12, color: '#6A7A6A', fontWeight: '600' },

  // Submit
  submitBtn: {
    backgroundColor: '#1A4A2E',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // Sign in link
  signInLink: { alignItems: 'center', paddingVertical: 8 },
  signInText: { fontSize: 14, color: '#6A7A6A' },
  signInHighlight: { color: '#1A4A2E', fontWeight: '700' },
});

export default SignupScreen;
