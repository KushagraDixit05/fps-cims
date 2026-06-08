/**
 * Axios API client for Farm Prosperity Solutions.
 *
 * Features:
 *  - Automatically attaches Bearer token from AsyncStorage to every request.
 *  - Handles 401 responses by refreshing the access token and retrying.
 *  - Clears tokens and forces re-login if refresh also fails.
 */

import axios, { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Base URL ────────────────────────────────────────────────────────────────
// Production builds (__DEV__ === false) always hit the deployed backend.
// Development builds use local detection so `adb reverse` / emulator alias works.
const PRODUCTION_API_URL = 'https://YOUR-APP.onrender.com/api'; // ← replace before release build

const getBaseUrl = (): string => {
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }
  if (Platform.OS === 'android') {
    const model: string =
      (Platform.constants as Record<string, unknown>).Model as string ?? '';
    const isEmulator =
      model.toLowerCase().includes('sdk') ||
      model.toLowerCase().includes('emulator') ||
      model.toLowerCase().includes('google_sdk') ||
      model === '';

    return isEmulator ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api';
  }
  return 'http://localhost:8000/api';
};

export const BASE_URL = getBaseUrl();

// Storage key constants (shared with authStore)
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

// ─── Axios Instance ───────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Attach token ───────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor: Handle 401 / token refresh ────────────────────────
/**
 * Extend AxiosRequestConfig to track retry attempts and avoid infinite loops.
 */
interface RetryableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: RetryableConfig = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          // Persist new access token
          await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
          // Update default header and retry
          if (apiClient.defaults.headers.common) {
            apiClient.defaults.headers.common.Authorization = `Bearer ${data.access}`;
          }
          return apiClient(originalRequest);
        } catch {
          // Refresh token is also expired → force logout
          await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          // The authStore listens for this and redirects to Login
        }
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
