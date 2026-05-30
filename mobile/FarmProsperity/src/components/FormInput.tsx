/**
 * FormInput — Labelled text input wrapper for forms.
 * Wraps TextInput with consistent styling, label, and error display.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
} from 'react-native';
import { colors } from '../utils/colors';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

const FormInput = ({ label, error, required, style, ...inputProps }: FormInputProps) => (
  <View style={styles.wrapper}>
    <Text style={styles.label}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
    <TextInput
      style={[
        styles.input,
        error ? styles.inputError : null,
        style,
      ]}
      placeholderTextColor={colors.textMuted}
      {...inputProps}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.error,
  },
});

export default FormInput;
