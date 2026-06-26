/**
 * Axios API client for Farm Prosperity Solutions.
 *
 * Features:
 *  - Automatically attaches Bearer token from AsyncStorage to every request.
 *  - Attaches a stable X-Device-ID header so the backend can correlate audit
 *    logs and sync events to a specific device (Phase 6).
 *  - Handles 401 responses by refreshing the access token and retrying.
 *  - Clears tokens and forces re-login if refresh also fails.
 */

import axios, { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Base URL ────────────────────────────────────────────────────────────────
// Production builds (__DEV__ === false) always hit the deployed backend.
// Development builds use local detection so `adb reverse` / emulator alias works.
const PRODUCTION_API_URL = 'https://fps-cims-backend.onrender.com/api';

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
  // Cached profile of the logged-in user. Lets the app restore a session
  // offline (no /auth/me/ round-trip) so field execs are never kicked to the
  // Login screen just because the device has no signal at startup.
  CACHED_USER: 'cached_user',
  // Stable device identifier generated on first launch (Phase 6).
  // Sent as X-Device-ID on every request so the backend can record which
  // device made each API call in the audit log and DeviceSyncLog.
  DEVICE_ID: 'fps_device_id',
} as const;

// ─── Device ID ───────────────────────────────────────────────────────────────

/**
 * Return the persisted device ID, generating a new UUID v4-like string on
 * first launch.  The value never changes for the lifetime of the app install,
 * which matches what the backend's DeviceRegistration / AuditLog expect.
 */
async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!id) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
  }
  return id;
}

// ─── Axios Instance ───────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Attach token + device ID ───────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    const [token, deviceId] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
      getOrCreateDeviceId(),
    ]);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.headers) {
      config.headers['X-Device-ID'] = deviceId;
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
