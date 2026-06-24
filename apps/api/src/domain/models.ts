export type UserRole = 'city_admin' | 'analyst' | 'enforcement_officer' | 'health_officer' | 'standard_user';
export type Severity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type EnforcementStatus = 'queued' | 'dispatched' | 'investigating' | 'resolved';
export type OtpPurpose = 'verify_email' | 'login_otp' | 'two_factor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  active: boolean;
  emailVerified: boolean;
  phone?: string | undefined;
  avatarUrl?: string | undefined;
  lastLoginAt?: string | undefined;
  failedAttempts: number;
  lockedUntil?: string | undefined;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  deviceName: string;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
  rememberMe: boolean;
  lastActiveAt: string;
  expiresAt: string;
  revokedAt?: string | undefined;
  createdAt: string;
}

export interface OtpCode {
  id: number;
  userId?: string | undefined;
  email: string;
  codeHash: string;
  purpose: OtpPurpose;
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  consumedAt?: string | undefined;
  createdAt: string;
}

export interface PasswordReset {
  id: number;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  consumedAt?: string | undefined;
  createdAt: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  trend: 'up' | 'down' | 'flat';
  updatedAt: string;
}

export interface SensorReading {
  id: string;
  sensorId: string;
  cityId: string;
  ward: string;
  latitude: number;
  longitude: number;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  temperature: number;
  humidity: number;
  observedAt: string;
}

export interface HistoricalReading {
  id: number;
  cityId: string;
  stationId: string;
  stationName: string;
  ward: string;
  latitude: number;
  longitude: number;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2?: number | undefined;
  co?: number | undefined;
  o3?: number | undefined;
  temperature?: number | undefined;
  humidity?: number | undefined;
  windSpeed?: number | undefined;
  windDirection?: number | undefined;
  rainfallMm?: number | undefined;
  source: string;
  qualityFlag: 'good' | 'suspect' | 'missing';
  observedAt: string;
  ingestedAt: string;
}

export interface DailyStats {
  cityId: string;
  statDate: string;
  aqiAvg?: number | undefined;
  aqiMax?: number | undefined;
  aqiMin?: number | undefined;
  pm25Avg?: number | undefined;
  pm10Avg?: number | undefined;
  no2Avg?: number | undefined;
  so2Avg?: number | undefined;
  coAvg?: number | undefined;
  o3Avg?: number | undefined;
  aqiCategory?: string | undefined;
  readingCount: number;
}

export interface IngestionRun {
  id: number;
  runType: 'bulk' | 'daily' | 'manual';
  status: 'running' | 'completed' | 'failed';
  citiesProcessed: number;
  rowsInserted: number;
  rowsSkipped: number;
  errorMessage?: string | undefined;
  startedAt: string;
  finishedAt?: string | undefined;
}

export interface ForecastPoint {
  cityId: string;
  ward: string;
  horizonHours: number;
  predictedAqi: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  predictedAt: string;
  drivers: string[];
}

export interface Attribution {
  cityId: string;
  ward: string;
  generatedAt: string;
  confidence: number;
  sources: Array<{ source: string; contribution: number; direction: 'rising' | 'falling' | 'stable' }>;
  explanation: string;
}

export interface Alert {
  id: string;
  cityId: string;
  ward: string;
  title: string;
  description: string;
  severity: Severity;
  status: AlertStatus;
  source: string;
  correlationId?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Advisory {
  id: string;
  cityId: string;
  ward: string;
  severity: Severity;
  audience: string[];
  channels: Array<'sms' | 'push' | 'email' | 'public_display'>;
  message: string;
  status: 'draft' | 'scheduled' | 'published';
  reach: number;
  createdAt: string;
  publishedAt?: string;
}

export interface EnforcementCase {
  id: string;
  cityId: string;
  ward: string;
  target: string;
  category: string;
  priority: number;
  evidenceScore: number;
  estimatedImpact: number;
  status: EnforcementStatus;
  assignedUnit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardOverview {
  city: City;
  forecastDelta: number;
  activeAlerts: number;
  enforcementActions: number;
  citizensAlerted: number;
  sensorUptime: number;
  readings: SensorReading[];
  forecasts: ForecastPoint[];
  attribution: Attribution;
  insight: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
