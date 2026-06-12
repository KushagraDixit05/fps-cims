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
import type { User } from '../types';
import * as authApi from '../api/auth';
import { logout as apiLogout } from '../api/auth';

// ─── State Shape ─────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;  // true during initial session restore
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'RESTORE_SESSION'; user: User }
  | { type: 'SESSION_NONE' }
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'RESTORE_SESSION':
      return { user: action.user, isLoading: false };
    case 'SESSION_NONE':
      return { user: null, isLoading: false };
    case 'LOGIN':
      return { user: action.user, isLoading: false };
    case 'LOGOUT':
      return { user: null, isLoading: false };
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
   * On mount: restore the session in an offline-first way.
   *
   *  1. No tokens at all → genuinely logged out → Login screen.
   *  2. A token exists + a cached user → restore immediately (works fully
   *     offline; never blocks the field exec on a network round-trip).
   *  3. Refresh /auth/me/ in the background. On success, update the cache.
   *     On failure, re-check the access token:
   *       - still present  → transient/network error → STAY logged in.
   *       - gone           → the API interceptor cleared it after refresh
   *                          truly failed → real auth failure → LOGOUT.
   *
   * A token with no cached user (e.g. first launch after upgrade) falls back to
   * a blocking /auth/me/: success restores, network failure stays offline-blank
   * (SESSION_NONE) since we have nothing to show.
   */
  useEffect(() => {
    const restoreSession = async () => {
      const hasToken = await authApi.hasAccessToken();
      if (!hasToken) {
        dispatch({ type: 'SESSION_NONE' });
        return;
      }

      const cachedUser = await authApi.getCachedUser();

      if (cachedUser) {
        // Optimistic restore — usable offline straight away.
        dispatch({ type: 'RESTORE_SESSION', user: cachedUser });
        // Background refresh; do not block or downgrade the session on failure.
        try {
          const fresh = await authApi.getMe();
          dispatch({ type: 'RESTORE_SESSION', user: fresh });
        } catch {
          const stillAuthed = await authApi.hasAccessToken();
          if (!stillAuthed) {
            // Tokens cleared by the interceptor → refresh exhausted → real logout.
            dispatch({ type: 'LOGOUT' });
          }
          // else: transient/network error → keep the cached session.
        }
        return;
      }

      // Token but no cached user — must hit the network to know who we are.
      try {
        const user = await authApi.getMe();
        dispatch({ type: 'RESTORE_SESSION', user });
      } catch {
        dispatch({ type: 'SESSION_NONE' });
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const tokenData = await authApi.login(username, password);
    // After storing tokens, fetch the full user profile
    const user = await authApi.getMe();
    dispatch({ type: 'LOGIN', user });
    // Suppress unused tokenData warning — tokens are stored inside authApi.login()
    void tokenData;
  }, []);

  const loginWithTokens = useCallback(async (access: string, refresh: string, user: User) => {
    // Persist tokens so future API calls work
    await authApi.storeTokens(access, refresh);
    // Cache the profile so the next launch can restore the session offline.
    await authApi.cacheUser(user);
    dispatch({ type: 'LOGIN', user });
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
