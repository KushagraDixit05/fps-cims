/**
 * Auth Store — global authentication state via React Context + useReducer.
 *
 * Responsibilities:
 *  - Hold the current User (null = logged out).
 *  - Hold the `perms` array decoded from the JWT access token (Phase 6).
 *  - On app start, restore session by calling GET /auth/me/ with stored token.
 *  - Expose `login()`, `loginWithTokens()`, and `logout()` actions.
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
import { decodeJWTPayload } from '../utils/jwt';

// ─── State Shape ─────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  /** Permission codenames decoded from the JWT `perms` claim. Empty until login. */
  perms: string[];
  isLoading: boolean;  // true during initial session restore
}

const initialState: AuthState = {
  user: null,
  perms: [],
  isLoading: true,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'RESTORE_SESSION'; user: User; perms: string[] }
  | { type: 'SESSION_NONE' }
  | { type: 'LOGIN'; user: User; perms: string[] }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'RESTORE_SESSION':
      return { user: action.user, perms: action.perms, isLoading: false };
    case 'SESSION_NONE':
      return { user: null, perms: [], isLoading: false };
    case 'LOGIN':
      return { user: action.user, perms: action.perms, isLoading: false };
    case 'LOGOUT':
      return { user: null, perms: [], isLoading: false };
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
   *     Perms are decoded from the stored JWT without a network call.
   *  3. Refresh /auth/me/ in the background. On success, update the cache.
   *     Re-decode perms from the (possibly refreshed) JWT.
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

      // Decode perms from the stored JWT (no network required).
      const storedPerms = await authApi.getStoredPerms();
      const cachedUser = await authApi.getCachedUser();

      if (cachedUser) {
        // Optimistic restore — usable offline straight away.
        dispatch({ type: 'RESTORE_SESSION', user: cachedUser, perms: storedPerms });

        // Background refresh; do not block or downgrade the session on failure.
        try {
          const fresh = await authApi.getMe();
          // Re-decode perms after the background fetch (interceptor may have
          // silently refreshed the access token, giving updated perms).
          const freshPerms = await authApi.getStoredPerms();
          dispatch({ type: 'RESTORE_SESSION', user: fresh, perms: freshPerms });
        } catch {
          const stillAuthed = await authApi.hasAccessToken();
          if (!stillAuthed) {
            // Tokens cleared by the interceptor → refresh exhausted → real logout.
            dispatch({ type: 'LOGOUT' });
          }
          // else: transient/network error → keep the cached session + perms.
        }
        return;
      }

      // Token but no cached user — must hit the network to know who we are.
      try {
        const user = await authApi.getMe();
        const perms = await authApi.getStoredPerms();
        dispatch({ type: 'RESTORE_SESSION', user, perms });
      } catch {
        dispatch({ type: 'SESSION_NONE' });
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    // authApi.login() POST /auth/login/ and stores the JWT in AsyncStorage.
    await authApi.login(username, password);
    // Fetch user profile and decode perms from the freshly stored JWT in parallel.
    const [user, perms] = await Promise.all([
      authApi.getMe(),
      authApi.getStoredPerms(),
    ]);
    dispatch({ type: 'LOGIN', user, perms });
  }, []);

  const loginWithTokens = useCallback(async (access: string, refresh: string, user: User) => {
    // Persist tokens so future API calls work.
    await authApi.storeTokens(access, refresh);
    // Cache the profile so the next launch can restore the session offline.
    await authApi.cacheUser(user);
    // Decode perms directly from the provided access token — no extra storage read.
    const perms = decodeJWTPayload(access)?.perms ?? [];
    dispatch({ type: 'LOGIN', user, perms });
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
