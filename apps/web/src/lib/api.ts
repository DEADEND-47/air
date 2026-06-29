import type { Advisory, Alert, AuditEvent, Attribution, City, CityComparison, Correlation, DashboardOverview, EnforcementCase, ForecastPoint, HistoricalReading, Paginated, SensorReading, User } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';
const WS_URL = API_URL.startsWith('http')
  ? API_URL.replace(/^http/, 'ws').replace(/\/api\/v1$/, '/ws')
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
const TOKEN_KEY = 'airiq-access-token';
const REFRESH_KEY = 'airiq-refresh-token';

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = 'ApiError';
  }
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: { message: 'Request failed', code: 'REQUEST_FAILED' } })) as { error?: { message?: string; code?: string } };
    throw new ApiError(payload.error?.message ?? 'Request failed', response.status, payload.error?.code ?? 'REQUEST_FAILED');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, payload?: unknown) => request<T>(path, { method: 'POST', body: payload === undefined ? undefined : JSON.stringify(payload) });
const patch = <T>(path: string, payload: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(payload) });

export interface LoginResult { user: User; accessToken: string; refreshToken: string; expiresIn: number }

export const api = {
  register: (name: string, email: string, password: string) => post<LoginResult>('/auth/register', { name, email, password }),
  login: (email: string, password: string) => post<LoginResult>('/auth/login', { email, password }),
  demoLogin: () => post<LoginResult>('/auth/login', { email: 'demo@airiq.local', password: 'Password123!' }),
  refreshToken: (refreshToken: string) => post<{ accessToken: string; expiresIn: number }>('/auth/refresh', { refreshToken }),
  logout: (refreshToken?: string) => post<void>('/auth/logout', { refreshToken }),
  sendPasswordReset: (email: string) => post<{ message: string }>('/auth/send-reset', { email }),
  resetPassword: (token: string, password: string) => post<{ message: string }>('/auth/reset-password', { token, password }),
  me: () => get<{ user: User }>('/auth/me'),

  overview: (cityId = 'delhi') => get<DashboardOverview>(`/dashboard/overview?cityId=${encodeURIComponent(cityId)}`),
  cities: async () => (await get<{ data: City[] }>('/cities')).data,
  compareCities: async (ids: string[], days = 7) => (await get<{ data: CityComparison[] }>(`/cities/compare?ids=${encodeURIComponent(ids.join(','))}&days=${days}`)).data,
  readings: async (cityId = 'delhi') => (await get<{ data: SensorReading[] }>(`/readings?cityId=${encodeURIComponent(cityId)}`)).data,
  forecasts: async (cityId = 'delhi') => (await get<{ data: ForecastPoint[] }>(`/forecasts?cityId=${encodeURIComponent(cityId)}`)).data,
  attribution: async (cityId = 'delhi') => (await get<{ data: Attribution | null }>(`/attributions?cityId=${encodeURIComponent(cityId)}`)).data,

  alertsPage: (params: { cityId?: string; page?: number; limit?: number; unread?: boolean; status?: string; severity?: string; search?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.cityId) search.set('city_id', params.cityId);
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.unread) search.set('unread', 'true');
    if (params.status) search.set('status', params.status);
    if (params.severity) search.set('severity', params.severity);
    if (params.search) search.set('search', params.search);
    return get<Paginated<Alert>>(`/alerts?${search.toString()}`);
  },
  alerts: async (cityId?: string) => (await api.alertsPage({ cityId, limit: 100 })).data,
  unreadAlerts: async () => (await api.alertsPage({ unread: true, limit: 5 })).data,
  correlateAlerts: async (cityId = 'delhi') => (await get<{ data: Correlation }>(`/alerts/correlations?cityId=${encodeURIComponent(cityId)}`)).data,
  updateAlert: (id: string, status: Alert['status']) => patch<Alert>(`/alerts/${id}/status`, { status }),
  markAlertRead: (id: string) => patch<Alert>(`/alerts/${id}/read`, {}),

  advisories: async (cityId?: string) => (await get<{ data: Advisory[] }>(cityId ? `/advisories?cityId=${encodeURIComponent(cityId)}` : '/advisories')).data,
  createAdvisory: (payload: { cityId: string; ward: string; aqi: number; audience: string[]; channels: Advisory['channels']; status: Advisory['status']; reach?: number }) => post<Advisory>('/advisories', payload),

  enforcementPage: (params: { cityId?: string; page?: number; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.cityId) search.set('cityId', params.cityId);
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    return get<Paginated<EnforcementCase>>(`/enforcement?${search.toString()}`);
  },
  enforcement: async (cityId?: string) => (await api.enforcementPage({ cityId, limit: 100 })).data,
  updateEnforcement: (id: string, status: EnforcementCase['status'], assignedUnit?: string) => patch<EnforcementCase>(`/enforcement/${id}/status`, { status, assignedUnit }),
  generateEnforcement: async (cityId = 'delhi') => (await post<{ data: EnforcementCase[] }>('/enforcement/generate', { cityId })).data,

  users: async () => (await get<{ data: User[] }>('/auth/users')).data,
  auditEvents: (params: { page?: number; limit?: number; days?: number; action?: string } = {}) => {
    const search = new URLSearchParams({
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 50),
      days: String(params.days ?? 7),
    });
    if (params.action) search.set('action', params.action);
    return get<Paginated<AuditEvent>>(`/admin/audit?${search.toString()}`);
  },
  profile: async () => (await get<{ data: User }>('/users/me')).data,
  updateProfile: async (payload: { firstName: string; lastName: string }) => (await patch<{ data: User }>('/users/me', payload)).data,
  changePassword: (payload: { currentPassword: string; newPassword: string }) => patch<{ message: string }>('/users/me/password', payload),
  historicalPage: (params: { cityId?: string; from: string; to: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams({
      cityId: params.cityId ?? 'delhi',
      from: params.from,
      to: params.to,
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
    });
    return get<Paginated<HistoricalReading>>(`/historical?${search.toString()}`);
  },
  historical: async (cityId = 'delhi', from: string, to: string) => (await api.historicalPage({ cityId, from, to, limit: 1000 })).data,
  historicalStats: async (cityId = 'delhi', from: string, to: string) => (await get<{ data: unknown[] }>(`/historical/stats?cityId=${encodeURIComponent(cityId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)).data,
  runPipeline: (source = 'synthetic', daysBack = 30) => post<{ data: unknown }>('/pipeline/run', { source, daysBack }),
  websocketUrl: () => WS_URL,
};
