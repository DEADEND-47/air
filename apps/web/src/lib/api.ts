import type { Advisory, Alert, Attribution, City, Correlation, DashboardOverview, EnforcementCase, ForecastPoint, SensorReading, User } from './types';
import { getActiveAccessToken, isSupabaseAuthEnabled } from './supabase';

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';
const TOKEN_KEY = 'airiq-access-token';
const REFRESH_KEY = 'airiq-refresh-token';
const SESSION_KEY = 'airiq-session-id';

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); this.name = 'ApiError'; }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const refreshStore = {
  get: () => localStorage.getItem(REFRESH_KEY),
  set: (token: string) => localStorage.setItem(REFRESH_KEY, token),
  clear: () => localStorage.removeItem(REFRESH_KEY),
};

export const sessionStore = {
  get: () => localStorage.getItem(SESSION_KEY),
  set: (id: string) => localStorage.setItem(SESSION_KEY, id),
  clear: () => localStorage.removeItem(SESSION_KEY),
};

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

async function tryRefresh(): Promise<boolean> {
  const refreshToken = refreshStore.get();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) { refreshStore.clear(); sessionStore.clear(); return false; }
    const data = await res.json() as { accessToken: string };
    tokenStore.set(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = isSupabaseAuthEnabled ? getActiveAccessToken() ?? tokenStore.get() : tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  // Auto-refresh on 401
  if (response.status === 401) {
    const refreshed = await (isRefreshing
      ? new Promise<boolean>((resolve) => { refreshQueue.push(() => resolve(!!tokenStore.get())); })
      : (async () => {
          isRefreshing = true;
          const ok = await tryRefresh();
          isRefreshing = false;
          refreshQueue.forEach((fn) => fn());
          refreshQueue = [];
          return ok;
        })()
    );
    if (refreshed) return request<T>(path, init); // Retry with new token
    tokenStore.clear(); refreshStore.clear(); sessionStore.clear();
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: { message: 'Request failed', code: 'REQUEST_FAILED' } })) as { error?: { message?: string; code?: string } };
    throw new ApiError(payload.error?.message ?? 'Request failed', response.status, payload.error?.code ?? 'REQUEST_FAILED');
  }
  return response.json() as Promise<T>;
}

const get  = <T>(path: string) => request<T>(path);
const post = <T>(path: string, payload?: unknown) => request<T>(path, { method: 'POST', body: payload === undefined ? undefined : JSON.stringify(payload) });
const patch = <T>(path: string, payload: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(payload) });
const del  = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export interface LoginResult { user: User; accessToken: string; refreshToken?: string; sessionId: string; expiresIn: number }
export interface SessionInfo { id: string; deviceName: string; ipAddress?: string; rememberMe: boolean; lastActiveAt: string; expiresAt: string; createdAt: string; isCurrent: boolean }

export const api = {
  // ── Auth ──
  register: (name: string, email: string, password: string) => post<{ userId: string; message: string }>('/auth/register', { name, email, password }),
  verifyEmail: (email: string, code: string) => post<{ message: string }>('/auth/verify-email', { email, code }),
  resendVerification: (email: string) => post<{ message: string }>('/auth/resend-verification', { email }),
  login: (email: string, password: string, rememberMe = false) => post<LoginResult>('/auth/login', { email, password, rememberMe, deviceName: navigator.userAgent.slice(0, 100) }),
  sendLoginOtp: (email: string) => post<{ message: string }>('/auth/send-otp', { email }),
  loginWithOtp: (email: string, code: string) => post<LoginResult>('/auth/otp-login', { email, code, deviceName: navigator.userAgent.slice(0, 100) }),
  refreshToken: (refreshToken: string) => post<{ accessToken: string; expiresIn: number }>('/auth/refresh', { refreshToken }),
  logout: (sessionId?: string) => post<void>('/auth/logout', { sessionId }),
  sendPasswordReset: (email: string) => post<{ message: string }>('/auth/send-reset', { email }),
  resetPassword: (token: string, password: string) => post<{ message: string }>('/auth/reset-password', { token, password }),
  me: () => get<{ user: User }>('/auth/me'),
  sessions: async () => (await get<{ data: SessionInfo[] }>('/auth/sessions')).data,
  revokeSession: (id: string) => del<void>(`/auth/sessions/${id}`),
  revokeAllSessions: () => del<void>('/auth/sessions'),

  // ── Dashboard ──
  overview: (cityId = 'delhi') => get<DashboardOverview>(`/dashboard/overview?cityId=${encodeURIComponent(cityId)}`),
  cities: async () => (await get<{ data: City[] }>('/cities')).data,
  readings: async (cityId = 'delhi') => (await get<{ data: SensorReading[] }>(`/readings?cityId=${encodeURIComponent(cityId)}`)).data,
  forecasts: async (cityId = 'delhi') => (await get<{ data: ForecastPoint[] }>(`/forecasts?cityId=${encodeURIComponent(cityId)}`)).data,
  attribution: async (cityId = 'delhi') => (await get<{ data: Attribution | null }>(`/attributions?cityId=${encodeURIComponent(cityId)}`)).data,

  // ── Alerts ──
  alerts: async (cityId?: string) => (await get<{ data: Alert[] }>(cityId ? `/alerts?cityId=${encodeURIComponent(cityId)}` : '/alerts')).data,
  correlateAlerts: async (cityId = 'delhi') => (await get<{ data: Correlation }>(`/alerts/correlations?cityId=${encodeURIComponent(cityId)}`)).data,
  updateAlert: (id: string, status: Alert['status']) => patch<Alert>(`/alerts/${id}/status`, { status }),

  // ── Advisories ──
  advisories: async (cityId?: string) => (await get<{ data: Advisory[] }>(cityId ? `/advisories?cityId=${encodeURIComponent(cityId)}` : '/advisories')).data,
  createAdvisory: (payload: { cityId: string; ward: string; aqi: number; audience: string[]; channels: Advisory['channels']; status: Advisory['status']; reach?: number }) => post<Advisory>('/advisories', payload),

  // ── Enforcement ──
  enforcement: async (cityId?: string) => (await get<{ data: EnforcementCase[] }>(cityId ? `/enforcement?cityId=${encodeURIComponent(cityId)}` : '/enforcement')).data,
  updateEnforcement: (id: string, status: EnforcementCase['status'], assignedUnit?: string) => patch<EnforcementCase>(`/enforcement/${id}/status`, { status, assignedUnit }),
  generateEnforcement: async (cityId = 'delhi') => (await post<{ data: EnforcementCase[] }>('/enforcement/generate', { cityId })).data,

  // ── Users ──
  users: async () => (await get<{ data: User[] }>('/auth/users')).data,

  // ── Historical Pipeline ──
  historical: async (cityId = 'delhi', from: string, to: string) => (await get<{ data: unknown[] }>(`/historical?cityId=${encodeURIComponent(cityId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)).data,
  historicalStats: async (cityId = 'delhi', from: string, to: string) => (await get<{ data: unknown[] }>(`/historical/stats?cityId=${encodeURIComponent(cityId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)).data,
  pipelineStatus: () => get<{ data: unknown }>('/pipeline/status'),
};
