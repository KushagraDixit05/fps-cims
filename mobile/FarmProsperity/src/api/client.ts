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
// Strategy:
//   • Android Emulator  → 10.0.2.2  (emulator's alias for the host machine)
//   • Physical Device   → localhost  (works because we run `adb reverse tcp:8000 tcp:8000`
//                                     which tunnels the phone's localhost:8000 → host:8000)
//   • iOS Simulator     → localhost
//
// To target a physical device WITHOUT adb reverse (e.g. on Wi-Fi only), set
// MANUAL_IP to your machine's LAN IP, e.g. '192.168.1.42'
const MANUAL_IP = ''; // ← leave empty to use auto-detection

const getBaseUrl = (): string => {
  if (MANUAL_IP) {
    return `http://${MANUAL_IP}:8000/api`;
  }
  if (Platform.OS === 'android') {
    // Platform.constants.Model is 'google_sdk' / 'sdk_gphone*' on emulators.
    // On real devices it's the actual model name (e.g. 'CPH2487' for OnePlus 11R).
    const model: string =
      (Platform.constants as Record<string, unknown>).Model as string ?? '';
    const isEmulator =
      model.toLowerCase().includes('sdk') ||
      model.toLowerCase().includes('emulator') ||
      model.toLowerCase().includes('google_sdk') ||
      model === '';

    if (isEmulator) {
      // 10.0.2.2 is the emulator's built-in alias for the host machine's localhost
      return 'http://10.0.2.2:8000/api';
    }
    // Physical device: `adb reverse tcp:8000 tcp:8000` tunnels
    // the device's localhost:8000 → host machine's :8000
    return 'http://localhost:8000/api';
  }
  // iOS simulator
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
