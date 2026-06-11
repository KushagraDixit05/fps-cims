/**
 * Auth Store — global authentication state via React Context + useReducer.
 *
 * Responsibilities:
 *  - Hold the current User (null = logged out).
 *  - On app start, restore session by calling GET /auth/me/ with stored token.
 *  - Expose `login()` and `logout()` actions.
 *  - `isLoading` is true only during the initial session restore (splash).
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';
import * as authApi from '../api/auth';
import { logout as apiLogout } from '../api/auth';
import { STORAGE_KEYS } from '../api/client';

// ─── State Shape ─────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;  // true during initial session restore
  accessToken: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  accessToken: null,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'RESTORE_SESSION'; user: User; accessToken: string | null }
  | { type: 'SESSION_NONE' }
  | { type: 'LOGIN'; user: User; accessToken: string | null }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'RESTORE_SESSION':
      return { user: action.user, isLoading: false, accessToken: action.accessToken };
    case 'SESSION_NONE':
      return { user: null, isLoading: false, accessToken: null };
    case 'LOGIN':
      return { user: action.user, isLoading: false, accessToken: action.accessToken };
    case 'LOGOUT':
      return { user: null, isLoading: false, accessToken: null };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  loginWithTokens: (access: string, refresh: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * On mount: try to fetch the current user using the stored access token.
   * If it fails, mark session as absent (triggers Login screen).
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [user, accessToken] = await Promise.all([
          authApi.getMe(),
          AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        ]);
        dispatch({ type: 'RESTORE_SESSION', user, accessToken });
      } catch {
        dispatch({ type: 'SESSION_NONE' });
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const tokenData = await authApi.login(username, password);
    const user = await authApi.getMe();
    dispatch({ type: 'LOGIN', user, accessToken: tokenData.access });
  }, []);

  const loginWithTokens = useCallback(async (access: string, refresh: string, user: User) => {
    await authApi.storeTokens(access, refresh);
    dispatch({ type: 'LOGIN', user, accessToken: access });
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access auth state and actions anywhere in the component tree.
 * @throws if used outside of <AuthProvider>
 */
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
};
