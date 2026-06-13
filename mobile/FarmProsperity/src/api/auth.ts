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
 * Clears both tokens and the cached user from local storage.
 * Call this on logout or when refresh fails.
 */
export const logout = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_USER);
};

/**
 * GET /api/auth/me/
 * Fetches the currently authenticated user's profile and caches it locally so
 * the session can be restored offline on the next launch.
 * Used on app startup to refresh the session.
 */
export const getMe = async (): Promise<User> => {
  const { data } = await apiClient.get<User>('/auth/me/');
  await cacheUser(data);
  return data;
};

/**
 * Persists the user profile for offline session restore.
 */
export const cacheUser = async (user: User): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(user));
};

/**
 * Reads the locally cached user profile, or null if none / corrupt.
 */
export const getCachedUser = async (): Promise<User | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

/**
 * True if an access token is currently stored. The response interceptor clears
 * tokens only on a genuine auth failure (refresh exhausted), so a present token
 * after a failed request means the error was transient/network — not auth.
 */
export const hasAccessToken = async (): Promise<boolean> => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  return !!token;
};

/**
 * Stores JWT tokens received from an external source (e.g. register endpoint).
 * Used by SignupScreen to persist tokens after auto-login without a second API call.
 */
export const storeTokens = async (access: string, refresh: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
  await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
};

