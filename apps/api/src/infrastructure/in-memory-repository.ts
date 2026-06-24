import { nanoid } from 'nanoid';
import type { AirIqRepository } from '../application/ports.js';
import type {
  Advisory, Alert, Attribution, AuditEvent, City, DailyStats, EnforcementCase,
  ForecastPoint, HistoricalReading, IngestionRun, OtpCode, OtpPurpose,
  PasswordReset, SensorReading, Session, User,
} from '../domain/models.js';
import { createSeedData, type SeedData } from './seed-data.js';

export class InMemoryAirIqRepository implements AirIqRepository {
  private readonly audits: AuditEvent[] = [];
  private readonly historicalReadings: HistoricalReading[] = [];
  private readonly dailyStats: DailyStats[] = [];
  private readonly ingestionRuns: IngestionRun[] = [];
  private readonly sessions: Session[] = [];
  private readonly otpCodes: OtpCode[] = [];
  private readonly passwordResets: PasswordReset[] = [];
  private users: User[];

  private constructor(private readonly data: SeedData) {
    this.users = [...data.users];
  }

  static async create(): Promise<InMemoryAirIqRepository> {
    const repo = new InMemoryAirIqRepository(await createSeedData());
    try {
      const { EtlPipeline } = await import('../pipeline/etl-pipeline.js');
      const pipeline = new EtlPipeline(repo);
      await pipeline.run({ daysBack: 30 });
    } catch (e) {
      console.error('Failed to pre-seed in-memory historical readings:', e);
    }
    return repo;
  }

  // Cities
  async listCities(): Promise<City[]> { return structuredClone(this.data.cities); }
  async getCity(id: string): Promise<City | null> { return structuredClone(this.data.cities.find((c) => c.id === id) ?? null); }

  // Readings
  async listReadings(cityId: string, limit = 100): Promise<SensorReading[]> {
    return structuredClone(this.data.readings.filter((r) => r.cityId === cityId).slice(0, limit));
  }

  // Historical
  async insertHistoricalReadings(rows: Omit<HistoricalReading, 'id' | 'ingestedAt'>[]): Promise<number> {
    const now = new Date().toISOString();
    const inserted = rows.map((r, i) => ({ ...r, id: this.historicalReadings.length + i + 1, ingestedAt: now } as HistoricalReading));
    this.historicalReadings.push(...inserted);
    return inserted.length;
  }

  async queryHistorical(params: {
    cityId: string;
    from: string;
    to: string;
    granularity?: 'hourly' | 'daily' | 'monthly' | undefined;
    limit?: number | undefined;
  }): Promise<HistoricalReading[]> {
    const from = new Date(params.from).getTime();
    const to = new Date(params.to).getTime();
    return structuredClone(
      this.historicalReadings
        .filter((r) => r.cityId === params.cityId && new Date(r.observedAt).getTime() >= from && new Date(r.observedAt).getTime() <= to)
        .slice(0, params.limit ?? 1000),
    );
  }

  async getDailyStats(cityId: string, from: string, to: string): Promise<DailyStats[]> {
    return structuredClone(
      this.dailyStats.filter((s) => s.cityId === cityId && s.statDate >= from && s.statDate <= to),
    );
  }

  async upsertDailyStats(stats: DailyStats[]): Promise<void> {
    for (const s of stats) {
      const idx = this.dailyStats.findIndex((d) => d.cityId === s.cityId && d.statDate === s.statDate);
      if (idx === -1) this.dailyStats.push(structuredClone(s));
      else this.dailyStats[idx] = structuredClone(s);
    }
  }

  async startIngestionRun(runType: IngestionRun['runType']): Promise<number> {
    const run: IngestionRun = { id: this.ingestionRuns.length + 1, runType, status: 'running', citiesProcessed: 0, rowsInserted: 0, rowsSkipped: 0, startedAt: new Date().toISOString() };
    this.ingestionRuns.push(run);
    return run.id;
  }

  async finishIngestionRun(id: number, result: Partial<IngestionRun>): Promise<void> {
    const run = this.ingestionRuns.find((r) => r.id === id);
    if (run) Object.assign(run, { ...result, finishedAt: new Date().toISOString() });
  }

  async getLastIngestionRun(): Promise<IngestionRun | null> {
    return structuredClone(this.ingestionRuns.at(-1) ?? null);
  }

  // Forecasts & attribution
  async listForecasts(cityId: string, ward?: string): Promise<ForecastPoint[]> {
    return structuredClone(this.data.forecasts.filter((f) => f.cityId === cityId && (!ward || f.ward === ward)));
  }
  async getAttribution(cityId: string, ward?: string): Promise<Attribution | null> {
    return structuredClone(this.data.attributions.find((a) => a.cityId === cityId && (!ward || a.ward === ward)) ?? null);
  }

  // Alerts
  async listAlerts(filters: { cityId?: string; status?: string; severity?: string } = {}): Promise<Alert[]> {
    return structuredClone(
      this.data.alerts
        .filter((a) => (!filters.cityId || a.cityId === filters.cityId) && (!filters.status || a.status === filters.status) && (!filters.severity || a.severity === filters.severity))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }
  async getAlert(id: string): Promise<Alert | null> { return structuredClone(this.data.alerts.find((a) => a.id === id) ?? null); }
  async saveAlert(alert: Alert): Promise<Alert> { this.upsert(this.data.alerts, alert); return structuredClone(alert); }

  // Advisories
  async listAdvisories(cityId?: string): Promise<Advisory[]> { return structuredClone(this.data.advisories.filter((a) => !cityId || a.cityId === cityId)); }
  async saveAdvisory(advisory: Advisory): Promise<Advisory> { this.upsert(this.data.advisories, advisory); return structuredClone(advisory); }

  // Enforcement
  async listEnforcement(cityId?: string): Promise<EnforcementCase[]> {
    return structuredClone(this.data.enforcement.filter((e) => !cityId || e.cityId === cityId).sort((a, b) => b.priority - a.priority));
  }
  async saveEnforcement(item: EnforcementCase): Promise<EnforcementCase> { this.upsert(this.data.enforcement, item); return structuredClone(item); }

  // Users
  async findUserByEmail(email: string): Promise<User | null> {
    return structuredClone(this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null);
  }
  async findUserById(id: string): Promise<User | null> {
    return structuredClone(this.users.find((u) => u.id === id) ?? null);
  }
  async createUser(user: Omit<User, 'createdAt' | 'failedAttempts'> & { failedAttempts?: number }): Promise<User> {
    const full: User = { ...user, failedAttempts: user.failedAttempts ?? 0, createdAt: new Date().toISOString() };
    this.users.push(full);
    return structuredClone(full);
  }
  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error(`User ${id} not found`);
    this.users[idx] = { ...this.users[idx]!, ...updates };
    return structuredClone(this.users[idx]!);
  }
  async listUsers(): Promise<User[]> { return structuredClone(this.users); }

  // Sessions
  async createSession(s: Omit<Session, 'lastActiveAt' | 'createdAt'>): Promise<Session> {
    const session: Session = { ...s, lastActiveAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    this.sessions.push(session);
    return structuredClone(session);
  }
  async findSession(id: string): Promise<Session | null> { return structuredClone(this.sessions.find((s) => s.id === id) ?? null); }
  async findSessionByRefreshToken(token: string): Promise<Session | null> { return structuredClone(this.sessions.find((s) => s.refreshToken === token) ?? null); }
  async touchSession(id: string): Promise<void> {
    const s = this.sessions.find((s) => s.id === id);
    if (s) s.lastActiveAt = new Date().toISOString();
  }
  async revokeSession(id: string): Promise<void> {
    const s = this.sessions.find((s) => s.id === id);
    if (s) s.revokedAt = new Date().toISOString();
  }
  async revokeAllUserSessions(userId: string): Promise<void> {
    const now = new Date().toISOString();
    this.sessions.filter((s) => s.userId === userId && !s.revokedAt).forEach((s) => { s.revokedAt = now; });
  }
  async listUserSessions(userId: string): Promise<Session[]> {
    return structuredClone(this.sessions.filter((s) => s.userId === userId));
  }

  // OTP
  async createOtp(otp: Omit<OtpCode, 'id' | 'attempts' | 'consumedAt' | 'createdAt'>): Promise<OtpCode> {
    const code: OtpCode = { ...otp, id: this.otpCodes.length + 1, attempts: 0, createdAt: new Date().toISOString() };
    this.otpCodes.push(code);
    return structuredClone(code);
  }
  async findActiveOtp(email: string, purpose: OtpPurpose): Promise<OtpCode | null> {
    const now = new Date();
    return structuredClone(
      this.otpCodes.findLast(
        (o) => o.email.toLowerCase() === email.toLowerCase() && o.purpose === purpose && !o.consumedAt && new Date(o.expiresAt) > now,
      ) ?? null,
    );
  }
  async incrementOtpAttempts(id: number): Promise<void> {
    const o = this.otpCodes.find((o) => o.id === id);
    if (o) o.attempts++;
  }
  async consumeOtp(id: number): Promise<void> {
    const o = this.otpCodes.find((o) => o.id === id);
    if (o) o.consumedAt = new Date().toISOString();
  }
  async invalidatePreviousOtps(email: string, purpose: OtpPurpose): Promise<void> {
    const now = new Date().toISOString();
    this.otpCodes.filter((o) => o.email.toLowerCase() === email.toLowerCase() && o.purpose === purpose && !o.consumedAt).forEach((o) => { o.consumedAt = now; });
  }

  // Password Resets
  async createPasswordReset(reset: Omit<PasswordReset, 'id' | 'consumedAt' | 'createdAt'>): Promise<PasswordReset> {
    const r: PasswordReset = { ...reset, id: this.passwordResets.length + 1, createdAt: new Date().toISOString() };
    this.passwordResets.push(r);
    return structuredClone(r);
  }
  async findPasswordReset(tokenHash: string): Promise<PasswordReset | null> {
    return structuredClone(this.passwordResets.find((r) => r.tokenHash === tokenHash) ?? null);
  }
  async consumePasswordReset(id: number): Promise<void> {
    const r = this.passwordResets.find((r) => r.id === id);
    if (r) r.consumedAt = new Date().toISOString();
  }
  async invalidatePreviousResets(userId: string): Promise<void> {
    const now = new Date().toISOString();
    this.passwordResets.filter((r) => r.userId === userId && !r.consumedAt).forEach((r) => { r.consumedAt = now; });
  }

  private settings = new Map<string, any>([
    ['notifications', { emailsEnabled: true, aqiThreshold: 300 }]
  ]);

  async appendAudit(event: AuditEvent): Promise<void> { this.audits.push(structuredClone(event)); }
  async countCitizensAlerted(cityId: string): Promise<number> {
    return this.data.advisories.filter((a) => a.cityId === cityId && a.status === 'published').reduce((sum, a) => sum + a.reach, 0);
  }
  async getSystemSetting<T>(key: string): Promise<T | null> {
    return (this.settings.get(key) as T) ?? null;
  }
  async saveSystemSetting<T>(key: string, value: T): Promise<void> {
    this.settings.set(key, value);
  }

  private upsert<T extends { id: string }>(items: T[], value: T): void {
    const idx = items.findIndex((item) => item.id === value.id);
    if (idx === -1) items.push(structuredClone(value));
    else items[idx] = structuredClone(value);
  }
}

// Suppress unused import warning
void nanoid;
