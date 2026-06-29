import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { db, sqlite } from './index.js';

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    password_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    reset_token_hash TEXT,
    reset_token_expires_at TEXT,
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `ALTER TABLE users ADD COLUMN last_login_at TEXT`,
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    aqi INTEGER NOT NULL,
    pm25 REAL NOT NULL,
    pm10 REAL NOT NULL,
    no2 REAL NOT NULL,
    trend TEXT NOT NULL DEFAULT 'flat',
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS readings (
    id TEXT PRIMARY KEY,
    city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    sensor_id TEXT NOT NULL,
    ward TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    aqi INTEGER NOT NULL,
    pm25 REAL NOT NULL,
    pm10 REAL NOT NULL,
    no2 REAL NOT NULL,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    observed_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS readings_sensor_time_idx ON readings(sensor_id, observed_at)`,
  `CREATE TABLE IF NOT EXISTS historical_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    station_id TEXT NOT NULL,
    station_name TEXT NOT NULL,
    ward TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    aqi INTEGER NOT NULL,
    pm25 REAL NOT NULL,
    pm10 REAL NOT NULL,
    no2 REAL NOT NULL,
    temperature REAL,
    humidity REAL,
    wind_speed REAL,
    wind_direction REAL,
    source TEXT NOT NULL DEFAULT 'synthetic',
    quality_flag TEXT NOT NULL DEFAULT 'good',
    observed_at TEXT NOT NULL,
    ingested_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS historical_station_time_idx ON historical_readings(station_id, observed_at)`,
  `CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    stat_date TEXT NOT NULL,
    aqi_avg REAL,
    aqi_max INTEGER,
    aqi_min INTEGER,
    pm25_avg REAL,
    pm10_avg REAL,
    no2_avg REAL,
    reading_count INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS daily_stats_city_date_idx ON daily_stats(city_id, stat_date)`,
  `CREATE TABLE IF NOT EXISTS forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    horizon_hours INTEGER NOT NULL,
    predicted_aqi INTEGER NOT NULL,
    lower_bound INTEGER NOT NULL,
    upper_bound INTEGER NOT NULL,
    confidence REAL NOT NULL,
    predicted_at TEXT NOT NULL,
    drivers_json TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE TABLE IF NOT EXISTS attributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    confidence REAL NOT NULL,
    sources_json TEXT NOT NULL,
    explanation TEXT NOT NULL,
    generated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    source TEXT NOT NULL,
    assigned_to TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `ALTER TABLE alerts ADD COLUMN read_at TEXT`,
  `CREATE TABLE IF NOT EXISTS advisories (
    id TEXT PRIMARY KEY,
    city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    severity TEXT NOT NULL,
    audience_json TEXT NOT NULL,
    channels_json TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    reach INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    published_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS enforcement_cases (
    id TEXT PRIMARY KEY,
    city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    target TEXT NOT NULL,
    category TEXT NOT NULL,
    priority INTEGER NOT NULL,
    evidence_score REAL NOT NULL,
    estimated_impact REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    assigned_unit TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
  )`,
];

export function migrate() {
  const run = sqlite.transaction(() => {
    for (const statement of statements) {
      try { db.run(sql.raw(statement)); }
      catch (error) {
        const message = `${error.message} ${error.cause?.message ?? ''}`;
        if (!message.includes('duplicate column name')) throw error;
      }
    }
  });
  run();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrate();
  console.log('SQLite database is ready');
}
