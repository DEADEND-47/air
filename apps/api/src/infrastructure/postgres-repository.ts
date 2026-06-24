import type postgres from 'postgres';
import type { AirIqRepository } from '../application/ports.js';
import type {
  Advisory, Alert, Attribution, AuditEvent, City, DailyStats, EnforcementCase,
  ForecastPoint, HistoricalReading, IngestionRun, OtpCode, OtpPurpose,
  PasswordReset, SensorReading, Session, User,
} from '../domain/models.js';
import type { SeedData } from './seed-data.js';

type Sql = postgres.Sql;
type Row = Record<string, unknown>;
const str  = (v: unknown) => String(v);
const num  = (v: unknown) => Number(v);
const bool = (v: unknown) => Boolean(v);
const opt  = (v: unknown) => (v != null && v !== '' ? str(v) : undefined);
const optNum = (v: unknown) => (v != null ? Number(v) : undefined);
const isoDate = (v: unknown) => (v != null ? new Date(str(v)).toISOString() : undefined);

export class PostgresAirIqRepository implements AirIqRepository {
  constructor(private readonly sql: Sql) {}

  // ──────────────────────────────────────────────────────────────
  // CITIES
  // ──────────────────────────────────────────────────────────────
  async listCities(): Promise<City[]> {
    return (await this.sql`SELECT * FROM cities ORDER BY aqi DESC`).map(this.cityFromRow);
  }
  async getCity(id: string): Promise<City | null> {
    const rows = await this.sql`SELECT * FROM cities WHERE id = ${id} LIMIT 1`;
    return rows[0] ? this.cityFromRow(rows[0]) : null;
  }

  // ──────────────────────────────────────────────────────────────
  // REAL-TIME READINGS
  // ──────────────────────────────────────────────────────────────
  async listReadings(cityId: string, limit = 100): Promise<SensorReading[]> {
    const rows = await this.sql`SELECT * FROM sensor_readings WHERE city_id = ${cityId} ORDER BY observed_at DESC LIMIT ${limit}`;
    return rows.map((row) => ({
      id: str(row.id), sensorId: str(row.sensor_id), cityId: str(row.city_id),
      ward: str(row.ward), latitude: num(row.latitude), longitude: num(row.longitude),
      aqi: num(row.aqi), pm25: num(row.pm25), pm10: num(row.pm10), no2: num(row.no2),
      temperature: num(row.temperature), humidity: num(row.humidity),
      observedAt: new Date(str(row.observed_at)).toISOString(),
    }));
  }

  // ──────────────────────────────────────────────────────────────
  // HISTORICAL DATA PIPELINE
  // ──────────────────────────────────────────────────────────────
  async insertHistoricalReadings(rows: Omit<HistoricalReading, 'id' | 'ingestedAt'>[]): Promise<number> {
    if (rows.length === 0) return 0;
    let inserted = 0;
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const result = await this.sql`
        INSERT INTO historical_readings
          (city_id, station_id, station_name, ward, latitude, longitude,
           aqi, pm25, pm10, no2, so2, co, o3, temperature, humidity,
           wind_speed, wind_direction, rainfall_mm, source, quality_flag, observed_at)
        VALUES ${this.sql(batch.map((r) => [
          r.cityId, r.stationId, r.stationName, r.ward, r.latitude, r.longitude,
          r.aqi, r.pm25, r.pm10, r.no2, r.so2 ?? null, r.co ?? null, r.o3 ?? null,
          r.temperature ?? null, r.humidity ?? null, r.windSpeed ?? null, r.windDirection ?? null,
          r.rainfallMm ?? null, r.source, r.qualityFlag, r.observedAt
        ]))}
        ON CONFLICT (station_id, observed_at) DO NOTHING
        RETURNING id
      `;
      inserted += result.count;
    }
    return inserted;
  }

  async queryHistorical(params: {
    cityId: string;
    from: string;
    to: string;
    granularity?: 'hourly' | 'daily' | 'monthly' | undefined;
    limit?: number | undefined;
  }): Promise<HistoricalReading[]> {
    const limit = params.limit ?? 1000;
    const rows = await this.sql`
      SELECT * FROM historical_readings
      WHERE city_id = ${params.cityId}
        AND observed_at BETWEEN ${params.from}::timestamptz AND ${params.to}::timestamptz
        AND quality_flag != 'missing'
      ORDER BY observed_at DESC
      LIMIT ${limit}
    `;
    return rows.map(this.historicalFromRow);
  }

  async getDailyStats(cityId: string, from: string, to: string): Promise<DailyStats[]> {
    const rows = await this.sql`
      SELECT * FROM daily_city_stats
      WHERE city_id = ${cityId}
        AND stat_date BETWEEN ${from}::date AND ${to}::date
      ORDER BY stat_date DESC
    `;
    return rows.map((row) => ({
      cityId: str(row.city_id), statDate: str(row.stat_date),
      aqiAvg: optNum(row.aqi_avg), aqiMax: optNum(row.aqi_max), aqiMin: optNum(row.aqi_min),
      pm25Avg: optNum(row.pm25_avg), pm10Avg: optNum(row.pm10_avg), no2Avg: optNum(row.no2_avg),
      so2Avg: optNum(row.so2_avg), coAvg: optNum(row.co_avg), o3Avg: optNum(row.o3_avg),
      aqiCategory: opt(row.aqi_category), readingCount: num(row.reading_count),
    }));
  }

  async upsertDailyStats(stats: DailyStats[]): Promise<void> {
    for (const s of stats) {
      await this.sql`
        INSERT INTO daily_city_stats
          (city_id, stat_date, aqi_avg, aqi_max, aqi_min, pm25_avg, pm10_avg,
           no2_avg, so2_avg, co_avg, o3_avg, aqi_category, reading_count)
        VALUES (${s.cityId}, ${s.statDate}::date, ${s.aqiAvg ?? null}, ${s.aqiMax ?? null},
          ${s.aqiMin ?? null}, ${s.pm25Avg ?? null}, ${s.pm10Avg ?? null},
          ${s.no2Avg ?? null}, ${s.so2Avg ?? null}, ${s.coAvg ?? null},
          ${s.o3Avg ?? null}, ${s.aqiCategory ?? null}, ${s.readingCount})
        ON CONFLICT (city_id, stat_date) DO UPDATE SET
          aqi_avg = EXCLUDED.aqi_avg, aqi_max = EXCLUDED.aqi_max, aqi_min = EXCLUDED.aqi_min,
          pm25_avg = EXCLUDED.pm25_avg, pm10_avg = EXCLUDED.pm10_avg, no2_avg = EXCLUDED.no2_avg,
          so2_avg = EXCLUDED.so2_avg, co_avg = EXCLUDED.co_avg, o3_avg = EXCLUDED.o3_avg,
          aqi_category = EXCLUDED.aqi_category, reading_count = EXCLUDED.reading_count,
          computed_at = now()
      `;
    }
  }

  async startIngestionRun(runType: IngestionRun['runType']): Promise<number> {
    const rows = await this.sql`
      INSERT INTO ingestion_runs (run_type, status) VALUES (${runType}, 'running') RETURNING id
    `;
    return num(rows[0]!.id);
  }

  async finishIngestionRun(id: number, result: Partial<IngestionRun>): Promise<void> {
    await this.sql`
      UPDATE ingestion_runs SET
        status = ${result.status ?? 'completed'},
        cities_processed = ${result.citiesProcessed ?? 0},
        rows_inserted = ${result.rowsInserted ?? 0},
        rows_skipped = ${result.rowsSkipped ?? 0},
        error_message = ${result.errorMessage ?? null},
        finished_at = now()
      WHERE id = ${id}
    `;
  }

  async getLastIngestionRun(): Promise<IngestionRun | null> {
    const rows = await this.sql`SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT 1`;
    if (!rows[0]) return null;
    const row = rows[0];
    return {
      id: num(row.id), runType: str(row.run_type) as IngestionRun['runType'],
      status: str(row.status) as IngestionRun['status'],
      citiesProcessed: num(row.cities_processed), rowsInserted: num(row.rows_inserted),
      rowsSkipped: num(row.rows_skipped), errorMessage: opt(row.error_message),
      startedAt: new Date(str(row.started_at)).toISOString(),
      finishedAt: row.finished_at ? new Date(str(row.finished_at)).toISOString() : undefined,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // FORECASTS & ATTRIBUTION
  // ──────────────────────────────────────────────────────────────
  async listForecasts(cityId: string, ward?: string): Promise<ForecastPoint[]> {
    const rows = ward
      ? await this.sql`SELECT * FROM forecasts WHERE city_id = ${cityId} AND ward = ${ward} ORDER BY predicted_at ASC`
      : await this.sql`SELECT * FROM forecasts WHERE city_id = ${cityId} ORDER BY predicted_at ASC`;
    return rows.map((row) => ({
      cityId: str(row.city_id), ward: str(row.ward), horizonHours: num(row.horizon_hours),
      predictedAqi: num(row.predicted_aqi), lowerBound: num(row.lower_bound),
      upperBound: num(row.upper_bound), confidence: num(row.confidence),
      predictedAt: new Date(str(row.predicted_at)).toISOString(), drivers: row.drivers as string[],
    }));
  }

  async getAttribution(cityId: string, ward?: string): Promise<Attribution | null> {
    const rows = ward
      ? await this.sql`SELECT * FROM attributions WHERE city_id = ${cityId} AND ward = ${ward} ORDER BY generated_at DESC LIMIT 1`
      : await this.sql`SELECT * FROM attributions WHERE city_id = ${cityId} ORDER BY generated_at DESC LIMIT 1`;
    const row = rows[0];
    return row ? {
      cityId: str(row.city_id), ward: str(row.ward),
      generatedAt: new Date(str(row.generated_at)).toISOString(),
      confidence: num(row.confidence), sources: row.sources as Attribution['sources'],
      explanation: str(row.explanation),
    } : null;
  }

  // ──────────────────────────────────────────────────────────────
  // ALERTS
  // ──────────────────────────────────────────────────────────────
  async listAlerts(filters: { cityId?: string; status?: string; severity?: string } = {}): Promise<Alert[]> {
    const rows = await this.sql`SELECT * FROM alerts ORDER BY created_at DESC`;
    return rows.map(this.alertFromRow).filter(
      (item) => (!filters.cityId || item.cityId === filters.cityId) &&
                (!filters.status || item.status === filters.status) &&
                (!filters.severity || item.severity === filters.severity),
    );
  }
  async getAlert(id: string): Promise<Alert | null> {
    const rows = await this.sql`SELECT * FROM alerts WHERE id = ${id} LIMIT 1`;
    return rows[0] ? this.alertFromRow(rows[0]) : null;
  }
  async saveAlert(alert: Alert): Promise<Alert> {
    await this.sql`
      INSERT INTO alerts (id, city_id, ward, title, description, severity, status, source, correlation_id, assigned_to, created_at, updated_at)
      VALUES (${alert.id}, ${alert.cityId}, ${alert.ward}, ${alert.title}, ${alert.description},
              ${alert.severity}, ${alert.status}, ${alert.source}, ${alert.correlationId ?? null},
              ${alert.assignedTo ?? null}, ${alert.createdAt}, ${alert.updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status, assigned_to = EXCLUDED.assigned_to,
        updated_at = EXCLUDED.updated_at, correlation_id = EXCLUDED.correlation_id
    `;
    return alert;
  }

  // ──────────────────────────────────────────────────────────────
  // ADVISORIES
  // ──────────────────────────────────────────────────────────────
  async listAdvisories(cityId?: string): Promise<Advisory[]> {
    const rows = cityId
      ? await this.sql`SELECT * FROM advisories WHERE city_id = ${cityId} ORDER BY created_at DESC`
      : await this.sql`SELECT * FROM advisories ORDER BY created_at DESC`;
    return rows.map((row) => ({
      id: str(row.id), cityId: str(row.city_id), ward: str(row.ward),
      severity: row.severity as Advisory['severity'], audience: row.audience as string[],
      channels: row.channels as Advisory['channels'], message: str(row.message),
      status: row.status as Advisory['status'], reach: num(row.reach),
      createdAt: new Date(str(row.created_at)).toISOString(),
      ...(row.published_at ? { publishedAt: new Date(str(row.published_at)).toISOString() } : {}),
    }));
  }
  async saveAdvisory(item: Advisory): Promise<Advisory> {
    await this.sql`
      INSERT INTO advisories (id, city_id, ward, severity, audience, channels, message, status, reach, created_at, published_at)
      VALUES (${item.id}, ${item.cityId}, ${item.ward}, ${item.severity},
              ${this.sql.json(item.audience)}, ${this.sql.json(item.channels)},
              ${item.message}, ${item.status}, ${item.reach}, ${item.createdAt}, ${item.publishedAt ?? null})
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status, message = EXCLUDED.message,
        reach = EXCLUDED.reach, published_at = EXCLUDED.published_at
    `;
    return item;
  }

  // ──────────────────────────────────────────────────────────────
  // ENFORCEMENT
  // ──────────────────────────────────────────────────────────────
  async listEnforcement(cityId?: string): Promise<EnforcementCase[]> {
    const rows = cityId
      ? await this.sql`SELECT * FROM enforcement_cases WHERE city_id = ${cityId} ORDER BY priority DESC`
      : await this.sql`SELECT * FROM enforcement_cases ORDER BY priority DESC`;
    return rows.map(this.enforcementFromRow);
  }
  async saveEnforcement(item: EnforcementCase): Promise<EnforcementCase> {
    await this.sql`
      INSERT INTO enforcement_cases (id, city_id, ward, target, category, priority, evidence_score, estimated_impact, status, assigned_unit, created_at, updated_at)
      VALUES (${item.id}, ${item.cityId}, ${item.ward}, ${item.target}, ${item.category},
              ${item.priority}, ${item.evidenceScore}, ${item.estimatedImpact}, ${item.status},
              ${item.assignedUnit ?? null}, ${item.createdAt}, ${item.updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status, assigned_unit = EXCLUDED.assigned_unit, updated_at = EXCLUDED.updated_at
    `;
    return item;
  }

  // ──────────────────────────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────────────────────────
  async findUserByEmail(email: string): Promise<User | null> {
    const rows = await this.sql`SELECT * FROM users WHERE lower(email) = lower(${email}) LIMIT 1`;
    return rows[0] ? this.userFromRow(rows[0]) : null;
  }
  async findUserById(id: string): Promise<User | null> {
    const rows = await this.sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    return rows[0] ? this.userFromRow(rows[0]) : null;
  }
  async createUser(user: Omit<User, 'createdAt' | 'failedAttempts'> & { failedAttempts?: number }): Promise<User> {
    const rows = await this.sql`
      INSERT INTO users (id, email, name, role, password_hash, active, email_verified, phone, avatar_url, failed_attempts)
      VALUES (${user.id}, ${user.email}, ${user.name}, ${user.role}, ${user.passwordHash},
              ${user.active}, ${user.emailVerified}, ${user.phone ?? null}, ${user.avatarUrl ?? null},
              ${user.failedAttempts ?? 0})
      RETURNING *
    `;
    return this.userFromRow(rows[0]!);
  }
  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    // Build a dynamic SET clause safely
    const sets: string[] = [];
    const values: unknown[] = [];
    const field = (col: string, val: unknown) => { sets.push(`${col} = $${sets.length + 2}`); values.push(val); };

    if (updates.email !== undefined) field('email', updates.email);
    if (updates.name !== undefined) field('name', updates.name);
    if (updates.role !== undefined) field('role', updates.role);
    if (updates.passwordHash !== undefined) field('password_hash', updates.passwordHash);
    if (updates.active !== undefined) field('active', updates.active);
    if (updates.emailVerified !== undefined) field('email_verified', updates.emailVerified);
    if (updates.phone !== undefined) field('phone', updates.phone ?? null);
    if (updates.avatarUrl !== undefined) field('avatar_url', updates.avatarUrl ?? null);
    if (updates.lastLoginAt !== undefined) field('last_login_at', updates.lastLoginAt ?? null);
    if (updates.failedAttempts !== undefined) field('failed_attempts', updates.failedAttempts);
    if ('lockedUntil' in updates) field('locked_until', updates.lockedUntil ?? null);

    if (sets.length === 0) return (await this.findUserById(id))!;

    const query = `UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING *`;
    const rows = await this.sql.unsafe(query, [id, ...values] as any);
    return this.userFromRow(rows[0] as Row);
  }
  async listUsers(): Promise<User[]> {
    return (await this.sql`SELECT * FROM users ORDER BY name`).map(this.userFromRow);
  }

  // ──────────────────────────────────────────────────────────────
  // SESSIONS
  // ──────────────────────────────────────────────────────────────
  async createSession(s: Omit<Session, 'lastActiveAt' | 'createdAt'>): Promise<Session> {
    const rows = await this.sql`
      INSERT INTO sessions (id, user_id, refresh_token, device_name, user_agent, ip_address, remember_me, expires_at)
      VALUES (${s.id}, ${s.userId}, ${s.refreshToken}, ${s.deviceName},
              ${s.userAgent ?? null}, ${s.ipAddress ?? null}, ${s.rememberMe}, ${s.expiresAt})
      RETURNING *
    `;
    return this.sessionFromRow(rows[0]!);
  }
  async findSession(id: string): Promise<Session | null> {
    const rows = await this.sql`SELECT * FROM sessions WHERE id = ${id} LIMIT 1`;
    return rows[0] ? this.sessionFromRow(rows[0]) : null;
  }
  async findSessionByRefreshToken(token: string): Promise<Session | null> {
    const rows = await this.sql`SELECT * FROM sessions WHERE refresh_token = ${token} LIMIT 1`;
    return rows[0] ? this.sessionFromRow(rows[0]) : null;
  }
  async touchSession(id: string): Promise<void> {
    await this.sql`UPDATE sessions SET last_active_at = now() WHERE id = ${id}`;
  }
  async revokeSession(id: string): Promise<void> {
    await this.sql`UPDATE sessions SET revoked_at = now() WHERE id = ${id}`;
  }
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sql`UPDATE sessions SET revoked_at = now() WHERE user_id = ${userId} AND revoked_at IS NULL`;
  }
  async listUserSessions(userId: string): Promise<Session[]> {
    const rows = await this.sql`
      SELECT * FROM sessions WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
    return rows.map(this.sessionFromRow);
  }

  // ──────────────────────────────────────────────────────────────
  // OTP
  // ──────────────────────────────────────────────────────────────
  async createOtp(otp: Omit<OtpCode, 'id' | 'attempts' | 'consumedAt' | 'createdAt'>): Promise<OtpCode> {
    const rows = await this.sql`
      INSERT INTO otp_codes (user_id, email, code_hash, purpose, max_attempts, expires_at)
      VALUES (${otp.userId ?? null}, ${otp.email}, ${otp.codeHash}, ${otp.purpose}, ${otp.maxAttempts}, ${otp.expiresAt})
      RETURNING *
    `;
    return this.otpFromRow(rows[0]!);
  }
  async findActiveOtp(email: string, purpose: OtpPurpose): Promise<OtpCode | null> {
    const rows = await this.sql`
      SELECT * FROM otp_codes
      WHERE lower(email) = lower(${email}) AND purpose = ${purpose}
        AND consumed_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC LIMIT 1
    `;
    return rows[0] ? this.otpFromRow(rows[0]) : null;
  }
  async incrementOtpAttempts(id: number): Promise<void> {
    await this.sql`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ${id}`;
  }
  async consumeOtp(id: number): Promise<void> {
    await this.sql`UPDATE otp_codes SET consumed_at = now() WHERE id = ${id}`;
  }
  async invalidatePreviousOtps(email: string, purpose: OtpPurpose): Promise<void> {
    await this.sql`
      UPDATE otp_codes SET consumed_at = now()
      WHERE lower(email) = lower(${email}) AND purpose = ${purpose} AND consumed_at IS NULL
    `;
  }

  // ──────────────────────────────────────────────────────────────
  // PASSWORD RESETS
  // ──────────────────────────────────────────────────────────────
  async createPasswordReset(reset: Omit<PasswordReset, 'id' | 'consumedAt' | 'createdAt'>): Promise<PasswordReset> {
    const rows = await this.sql`
      INSERT INTO password_resets (user_id, token_hash, expires_at)
      VALUES (${reset.userId}, ${reset.tokenHash}, ${reset.expiresAt})
      RETURNING *
    `;
    return this.resetFromRow(rows[0]!);
  }
  async findPasswordReset(tokenHash: string): Promise<PasswordReset | null> {
    const rows = await this.sql`SELECT * FROM password_resets WHERE token_hash = ${tokenHash} LIMIT 1`;
    return rows[0] ? this.resetFromRow(rows[0]) : null;
  }
  async consumePasswordReset(id: number): Promise<void> {
    await this.sql`UPDATE password_resets SET consumed_at = now() WHERE id = ${id}`;
  }
  async invalidatePreviousResets(userId: string): Promise<void> {
    await this.sql`
      UPDATE password_resets SET consumed_at = now()
      WHERE user_id = ${userId} AND consumed_at IS NULL
    `;
  }

  // ──────────────────────────────────────────────────────────────
  // AUDIT
  // ──────────────────────────────────────────────────────────────
  async appendAudit(item: AuditEvent): Promise<void> {
    await this.sql`
      INSERT INTO audit_events (id, actor_id, action, entity_type, entity_id, metadata, created_at)
      VALUES (${item.id}, ${item.actorId}, ${item.action}, ${item.entityType}, ${item.entityId},
              ${this.sql.json(item.metadata as unknown as Parameters<typeof this.sql.json>[0])}, ${item.createdAt})
    `;
  }

  async countCitizensAlerted(cityId: string): Promise<number> {
    const rows = await this.sql`
      SELECT COALESCE(SUM(reach), 0) AS total FROM advisories WHERE city_id = ${cityId} AND status = 'published'
    `;
    return num(rows[0]?.total ?? 0);
  }

  async getSystemSetting<T>(key: string): Promise<T | null> {
    const rows = await this.sql`SELECT value FROM system_settings WHERE key = ${key} LIMIT 1`;
    return rows[0] ? (rows[0].value as T) : null;
  }

  async saveSystemSetting<T>(key: string, value: T): Promise<void> {
    await this.sql`
      INSERT INTO system_settings (key, value)
      VALUES (${key}, ${this.sql.json(value as any)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  }

  // ──────────────────────────────────────────────────────────────
  // SEED (preserved from original, updated for new user columns)
  // ──────────────────────────────────────────────────────────────
  async seed(data: SeedData): Promise<void> {
    await this.sql.begin(async (tx) => {
      for (const item of data.users) {
        await tx`
          INSERT INTO users (id, email, name, role, password_hash, active, email_verified)
          VALUES (${item.id}, ${item.email}, ${item.name}, ${item.role}, ${item.passwordHash}, ${item.active}, true)
          ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, active = EXCLUDED.active, email_verified = true
        `;
      }
      for (const item of data.cities) {
        await tx`
          INSERT INTO cities (id, name, state, latitude, longitude, aqi, pm25, pm10, no2, trend, updated_at)
          VALUES (${item.id}, ${item.name}, ${item.state}, ${item.latitude}, ${item.longitude},
                  ${item.aqi}, ${item.pm25}, ${item.pm10}, ${item.no2}, ${item.trend}, ${item.updatedAt})
          ON CONFLICT (id) DO UPDATE SET
            aqi = EXCLUDED.aqi, pm25 = EXCLUDED.pm25, pm10 = EXCLUDED.pm10,
            no2 = EXCLUDED.no2, trend = EXCLUDED.trend, updated_at = EXCLUDED.updated_at
        `;
      }
      for (const item of data.readings) {
        await tx`
          INSERT INTO sensor_readings (id, sensor_id, city_id, ward, latitude, longitude, aqi, pm25, pm10, no2, temperature, humidity, observed_at)
          VALUES (${item.id}, ${item.sensorId}, ${item.cityId}, ${item.ward}, ${item.latitude},
                  ${item.longitude}, ${item.aqi}, ${item.pm25}, ${item.pm10}, ${item.no2},
                  ${item.temperature}, ${item.humidity}, ${item.observedAt})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      await tx`DELETE FROM forecasts`;
      for (const item of data.forecasts) {
        await tx`
          INSERT INTO forecasts (city_id, ward, horizon_hours, predicted_aqi, lower_bound, upper_bound, confidence, predicted_at, drivers)
          VALUES (${item.cityId}, ${item.ward}, ${item.horizonHours}, ${item.predictedAqi},
                  ${item.lowerBound}, ${item.upperBound}, ${item.confidence}, ${item.predictedAt}, ${tx.json(item.drivers)})
        `;
      }
      await tx`DELETE FROM attributions`;
      for (const item of data.attributions) {
        await tx`
          INSERT INTO attributions (city_id, ward, generated_at, confidence, sources, explanation)
          VALUES (${item.cityId}, ${item.ward}, ${item.generatedAt}, ${item.confidence}, ${tx.json(item.sources)}, ${item.explanation})
        `;
      }
      for (const item of data.alerts) {
        await tx`
          INSERT INTO alerts (id, city_id, ward, title, description, severity, status, source, correlation_id, assigned_to, created_at, updated_at)
          VALUES (${item.id}, ${item.cityId}, ${item.ward}, ${item.title}, ${item.description},
                  ${item.severity}, ${item.status}, ${item.source}, ${item.correlationId ?? null},
                  ${item.assignedTo ?? null}, ${item.createdAt}, ${item.updatedAt})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      for (const item of data.advisories) {
        await tx`
          INSERT INTO advisories (id, city_id, ward, severity, audience, channels, message, status, reach, created_at, published_at)
          VALUES (${item.id}, ${item.cityId}, ${item.ward}, ${item.severity}, ${tx.json(item.audience)},
                  ${tx.json(item.channels)}, ${item.message}, ${item.status}, ${item.reach},
                  ${item.createdAt}, ${item.publishedAt ?? null})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      for (const item of data.enforcement) {
        await tx`
          INSERT INTO enforcement_cases (id, city_id, ward, target, category, priority, evidence_score, estimated_impact, status, assigned_unit, created_at, updated_at)
          VALUES (${item.id}, ${item.cityId}, ${item.ward}, ${item.target}, ${item.category},
                  ${item.priority}, ${item.evidenceScore}, ${item.estimatedImpact}, ${item.status},
                  ${item.assignedUnit ?? null}, ${item.createdAt}, ${item.updatedAt})
          ON CONFLICT (id) DO NOTHING
        `;
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  // ROW MAPPERS
  // ──────────────────────────────────────────────────────────────
  private cityFromRow = (row: Row): City => ({
    id: str(row.id), name: str(row.name), state: str(row.state),
    latitude: num(row.latitude), longitude: num(row.longitude),
    aqi: num(row.aqi), pm25: num(row.pm25), pm10: num(row.pm10), no2: num(row.no2),
    trend: row.trend as City['trend'], updatedAt: new Date(str(row.updated_at)).toISOString(),
  });

  private alertFromRow = (row: Row): Alert => ({
    id: str(row.id), cityId: str(row.city_id), ward: str(row.ward),
    title: str(row.title), description: str(row.description),
    severity: row.severity as Alert['severity'], status: row.status as Alert['status'],
    source: str(row.source),
    ...(row.correlation_id ? { correlationId: str(row.correlation_id) } : {}),
    ...(row.assigned_to ? { assignedTo: str(row.assigned_to) } : {}),
    createdAt: new Date(str(row.created_at)).toISOString(),
    updatedAt: new Date(str(row.updated_at)).toISOString(),
  });

  private enforcementFromRow = (row: Row): EnforcementCase => ({
    id: str(row.id), cityId: str(row.city_id), ward: str(row.ward),
    target: str(row.target), category: str(row.category),
    priority: num(row.priority), evidenceScore: num(row.evidence_score),
    estimatedImpact: num(row.estimated_impact), status: row.status as EnforcementCase['status'],
    ...(row.assigned_unit ? { assignedUnit: str(row.assigned_unit) } : {}),
    createdAt: new Date(str(row.created_at)).toISOString(),
    updatedAt: new Date(str(row.updated_at)).toISOString(),
  });

  private userFromRow = (row: Row): User => ({
    id: str(row.id), email: str(row.email), name: str(row.name),
    role: row.role as User['role'], passwordHash: str(row.password_hash),
    active: bool(row.active), emailVerified: bool(row.email_verified),
    failedAttempts: num(row.failed_attempts ?? 0),
    ...(row.phone ? { phone: str(row.phone) } : {}),
    ...(row.avatar_url ? { avatarUrl: str(row.avatar_url) } : {}),
    ...(row.last_login_at ? { lastLoginAt: new Date(str(row.last_login_at)).toISOString() } : {}),
    ...(row.locked_until ? { lockedUntil: new Date(str(row.locked_until)).toISOString() } : {}),
    createdAt: new Date(str(row.created_at)).toISOString(),
  });

  private sessionFromRow = (row: Row): Session => ({
    id: str(row.id), userId: str(row.user_id), refreshToken: str(row.refresh_token),
    deviceName: str(row.device_name), rememberMe: bool(row.remember_me),
    ...(row.user_agent ? { userAgent: str(row.user_agent) } : {}),
    ...(row.ip_address ? { ipAddress: str(row.ip_address) } : {}),
    lastActiveAt: new Date(str(row.last_active_at)).toISOString(),
    expiresAt: new Date(str(row.expires_at)).toISOString(),
    ...(row.revoked_at ? { revokedAt: new Date(str(row.revoked_at)).toISOString() } : {}),
    createdAt: new Date(str(row.created_at)).toISOString(),
  });

  private otpFromRow = (row: Row): OtpCode => ({
    id: num(row.id), email: str(row.email), codeHash: str(row.code_hash),
    purpose: str(row.purpose) as OtpCode['purpose'],
    attempts: num(row.attempts), maxAttempts: num(row.max_attempts),
    expiresAt: new Date(str(row.expires_at)).toISOString(),
    ...(row.user_id ? { userId: str(row.user_id) } : {}),
    ...(row.consumed_at ? { consumedAt: new Date(str(row.consumed_at)).toISOString() } : {}),
    createdAt: new Date(str(row.created_at)).toISOString(),
  });

  private resetFromRow = (row: Row): PasswordReset => ({
    id: num(row.id), userId: str(row.user_id), tokenHash: str(row.token_hash),
    expiresAt: new Date(str(row.expires_at)).toISOString(),
    ...(row.consumed_at ? { consumedAt: new Date(str(row.consumed_at)).toISOString() } : {}),
    createdAt: new Date(str(row.created_at)).toISOString(),
  });

  private historicalFromRow = (row: Row): HistoricalReading => ({
    id: num(row.id), cityId: str(row.city_id), stationId: str(row.station_id),
    stationName: str(row.station_name), ward: str(row.ward),
    latitude: num(row.latitude), longitude: num(row.longitude),
    aqi: num(row.aqi), pm25: num(row.pm25), pm10: num(row.pm10), no2: num(row.no2),
    so2: optNum(row.so2), co: optNum(row.co), o3: optNum(row.o3),
    temperature: optNum(row.temperature), humidity: optNum(row.humidity),
    windSpeed: optNum(row.wind_speed), windDirection: optNum(row.wind_direction),
    rainfallMm: optNum(row.rainfall_mm), source: str(row.source),
    qualityFlag: str(row.quality_flag) as HistoricalReading['qualityFlag'],
    observedAt: new Date(str(row.observed_at)).toISOString(),
    ingestedAt: new Date(str(row.ingested_at)).toISOString(),
  });
}
