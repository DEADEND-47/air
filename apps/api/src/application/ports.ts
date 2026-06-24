import type {
  Advisory,
  Alert,
  Attribution,
  AuditEvent,
  City,
  DailyStats,
  EnforcementCase,
  ForecastPoint,
  HistoricalReading,
  IngestionRun,
  OtpCode,
  OtpPurpose,
  PasswordReset,
  SensorReading,
  Session,
  User,
} from '../domain/models.js';

export interface AirIqRepository {
  // Cities
  listCities(): Promise<City[]>;
  getCity(id: string): Promise<City | null>;

  // Real-time readings
  listReadings(cityId: string, limit?: number): Promise<SensorReading[]>;

  // Historical data pipeline
  insertHistoricalReadings(rows: Omit<HistoricalReading, 'id' | 'ingestedAt'>[]): Promise<number>;
  queryHistorical(params: {
    cityId: string;
    from: string;
    to: string;
    granularity?: 'hourly' | 'daily' | 'monthly' | undefined;
    limit?: number | undefined;
  }): Promise<HistoricalReading[]>;
  getDailyStats(cityId: string, from: string, to: string): Promise<DailyStats[]>;
  upsertDailyStats(stats: Omit<DailyStats, never>[]): Promise<void>;
  startIngestionRun(runType: IngestionRun['runType']): Promise<number>;
  finishIngestionRun(id: number, result: Partial<IngestionRun>): Promise<void>;
  getLastIngestionRun(): Promise<IngestionRun | null>;

  // Forecasts & attribution
  listForecasts(cityId: string, ward?: string): Promise<ForecastPoint[]>;
  getAttribution(cityId: string, ward?: string): Promise<Attribution | null>;

  // Alerts
  listAlerts(filters?: { cityId?: string; status?: string; severity?: string }): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | null>;
  saveAlert(alert: Alert): Promise<Alert>;

  // Advisories
  listAdvisories(cityId?: string): Promise<Advisory[]>;
  saveAdvisory(advisory: Advisory): Promise<Advisory>;

  // Enforcement
  listEnforcement(cityId?: string): Promise<EnforcementCase[]>;
  saveEnforcement(item: EnforcementCase): Promise<EnforcementCase>;

  // Users (core)
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  createUser(user: Omit<User, 'createdAt' | 'failedAttempts'> & { failedAttempts?: number }): Promise<User>;
  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User>;
  listUsers(): Promise<User[]>;

  // Sessions
  createSession(session: Omit<Session, 'lastActiveAt' | 'createdAt'>): Promise<Session>;
  findSession(id: string): Promise<Session | null>;
  findSessionByRefreshToken(token: string): Promise<Session | null>;
  touchSession(id: string): Promise<void>;
  revokeSession(id: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  listUserSessions(userId: string): Promise<Session[]>;

  // OTP codes
  createOtp(otp: Omit<OtpCode, 'id' | 'attempts' | 'consumedAt' | 'createdAt'>): Promise<OtpCode>;
  findActiveOtp(email: string, purpose: OtpPurpose): Promise<OtpCode | null>;
  incrementOtpAttempts(id: number): Promise<void>;
  consumeOtp(id: number): Promise<void>;
  invalidatePreviousOtps(email: string, purpose: OtpPurpose): Promise<void>;

  // Password resets
  createPasswordReset(reset: Omit<PasswordReset, 'id' | 'consumedAt' | 'createdAt'>): Promise<PasswordReset>;
  findPasswordReset(tokenHash: string): Promise<PasswordReset | null>;
  consumePasswordReset(id: number): Promise<void>;
  invalidatePreviousResets(userId: string): Promise<void>;

  // Audit
  appendAudit(event: AuditEvent): Promise<void>;
  countCitizensAlerted(cityId: string): Promise<number>;
  getSystemSetting<T>(key: string): Promise<T | null>;
  saveSystemSetting<T>(key: string, value: T): Promise<void>;
}

export interface IntelligenceAgent<Input, Output> {
  readonly name: string;
  run(input: Input, context: AgentContext): Promise<AgentResult<Output>>;
}

export interface AgentContext {
  traceId: string;
  budgetRemainingUsd: number;
  attempt: number;
}

export interface AgentResult<T> {
  data: T;
  confidence: number;
  provider: string;
  costUsd: number;
  durationMs: number;
  fallbackUsed: boolean;
  rationale: string;
}

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
