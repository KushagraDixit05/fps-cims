import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getTokens() {
  if (typeof window === "undefined") return { access: null, refresh: null };
  try {
    const raw = localStorage.getItem("fps-auth");
    if (!raw) return { access: null, refresh: null };
    const parsed = JSON.parse(raw);
    const state = parsed?.state ?? parsed;
    return {
      access: state?.accessToken ?? null,
      refresh: state?.refreshToken ?? null,
    };
  } catch {
    return { access: null, refresh: null };
  }
}

function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("fps-auth");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const state = parsed?.state ?? parsed;
    state.accessToken = token;
    if (parsed?.state !== undefined) {
      parsed.state = state;
      localStorage.setItem("fps-auth", JSON.stringify(parsed));
    } else {
      localStorage.setItem("fps-auth", JSON.stringify(state));
    }
  } catch {}
}

function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("fps-auth");
  window.location.href = "/login";
}

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { access } = getTokens();
  if (access) {
    config.headers["Authorization"] = `Bearer ${access}`;
  }
  return config;
});

let refreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (refreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (token) {
            original.headers["Authorization"] = `Bearer ${token}`;
            resolve(api(original));
          } else {
            reject(error);
          }
        });
      });
    }

    refreshing = true;
    try {
      const { refresh } = getTokens();
      if (!refresh) throw new Error("No refresh token");
      const { data } = await axios.post(`${BASE_URL}/api/admin/auth/refresh/`, {
        refresh,
      });
      const newAccess: string = data.access;
      setAccessToken(newAccess);
      refreshQueue.forEach((cb) => cb(newAccess));
      refreshQueue = [];
      original.headers["Authorization"] = `Bearer ${newAccess}`;
      return api(original);
    } catch {
      refreshQueue.forEach((cb) => cb(null));
      refreshQueue = [];
      clearAuth();
      return Promise.reject(error);
    } finally {
      refreshing = false;
    }
  }
);

export default api;
