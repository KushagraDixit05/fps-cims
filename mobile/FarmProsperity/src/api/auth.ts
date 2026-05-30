/**
 * Auth API — login, logout, and current user profile.
 */

import apiClient, { STORAGE_KEYS } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';

export interface LoginResponse {
  access: string;
  refresh: string;
  user?: User;  // Some JWTs embed user info — optional
}

/**
 * POST /api/auth/login/
 * Stores tokens in AsyncStorage on success.
 */
export const login = async (
  username: string,
  password: string,
): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>('/auth/login/', {
    username,
    password,
  });
  await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
  await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
  return data;
};

/**
 * Clears both tokens from local storage.
 * Call this on logout or when refresh fails.
 */
export const logout = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
};

/**
 * GET /api/auth/me/
 * Fetches the currently authenticated user's profile.
 * Used on app startup to restore session.
 */
export const getMe = async (): Promise<User> => {
  const { data } = await apiClient.get<User>('/auth/me/');
  return data;
};
