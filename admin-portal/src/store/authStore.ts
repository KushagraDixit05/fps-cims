"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name?: string;
}

interface JWTPayload {
  user_id: string | number;
  username: string;
  email: string;
  role: string;
  full_name?: string;
}

function decodeJWT(token: string): JWTPayload | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      login: async (username, password) => {
        const { data } = await api.post("/api/auth/login/", { username, password });
        const payload = decodeJWT(data.access);
        const user: AuthUser = {
          id: Number(payload?.user_id ?? 0),
          username: payload?.username ?? username,
          email: payload?.email ?? "",
          role: payload?.role ?? "admin",
          full_name: payload?.full_name ?? payload?.username ?? username,
        };
        set({
          accessToken: data.access,
          refreshToken: data.refresh,
          user,
          isAuthenticated: true,
        });
      },

      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: "fps-auth",
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
);
