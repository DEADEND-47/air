import { relations } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'analyst', 'viewer'] }).notNull().default('viewer'),
  passwordHash: text('password_hash').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  resetTokenHash: text('reset_token_hash'),
  resetTokenExpiresAt: text('reset_token_expires_at'),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  createdAt: text('created_at').notNull(),
});

export const cities = sqliteTable('cities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  state: text('state').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  aqi: integer('aqi').notNull(),
  pm25: real('pm25').notNull(),
  pm10: real('pm10').notNull(),
  no2: real('no2').notNull(),
  trend: text('trend', { enum: ['up', 'down', 'flat'] }).notNull().default('flat'),
  updatedAt: text('updated_at').notNull(),
});

export const readings = sqliteTable('readings', {
  id: text('id').primaryKey(),
  cityId: text('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  sensorId: text('sensor_id').notNull(),
  ward: text('ward').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  aqi: integer('aqi').notNull(),
  pm25: real('pm25').notNull(),
  pm10: real('pm10').notNull(),
  no2: real('no2').notNull(),
  temperature: real('temperature').notNull(),
  humidity: real('humidity').notNull(),
  observedAt: text('observed_at').notNull(),
}, (table) => ({
  sensorTime: uniqueIndex('readings_sensor_time_idx').on(table.sensorId, table.observedAt),
}));

export const historicalReadings = sqliteTable('historical_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cityId: text('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  stationId: text('station_id').notNull(),
  stationName: text('station_name').notNull(),
  ward: text('ward').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  aqi: integer('aqi').notNull(),
  pm25: real('pm25').notNull(),
  pm10: real('pm10').notNull(),
  no2: real('no2').notNull(),
  temperature: real('temperature'),
  humidity: real('humidity'),
  windSpeed: real('wind_speed'),
  windDirection: real('wind_direction'),
  source: text('source').notNull().default('synthetic'),
  qualityFlag: text('quality_flag').notNull().default('good'),
  observedAt: text('observed_at').notNull(),
  ingestedAt: text('ingested_at').notNull(),
}, (table) => ({
  stationTime: uniqueIndex('historical_station_time_idx').on(table.stationId, table.observedAt),
}));

export const dailyStats = sqliteTable('daily_stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cityId: text('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  statDate: text('stat_date').notNull(),
  aqiAvg: real('aqi_avg'),
  aqiMax: integer('aqi_max'),
  aqiMin: integer('aqi_min'),
  pm25Avg: real('pm25_avg'),
  pm10Avg: real('pm10_avg'),
  no2Avg: real('no2_avg'),
  readingCount: integer('reading_count').notNull().default(0),
}, (table) => ({
  cityDate: uniqueIndex('daily_stats_city_date_idx').on(table.cityId, table.statDate),
}));

export const forecasts = sqliteTable('forecasts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cityId: text('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  ward: text('ward').notNull(),
  horizonHours: integer('horizon_hours').notNull(),
  predictedAqi: integer('predicted_aqi').notNull(),
  lowerBound: integer('lower_bound').notNull(),
  upperBound: integer('upper_bound').notNull(),
  confidence: real('confidence').notNull(),
  predictedAt: text('predicted_at').notNull(),
  driversJson: text('drivers_json').notNull().default('[]'),
});

export const attributions = sqliteTable('attributions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cityId: text('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  ward: text('ward').notNull(),
  confidence: real('confidence').notNull(),
  sourcesJson: text('sources_json').notNull(),
  explanation: text('explanation').notNull(),
  generatedAt: text('generated_at').notNull(),
});

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  cityId: text('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  ward: text('ward').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  severity: text('severity', { enum: ['info', 'warning', 'critical'] }).notNull(),
  status: text('status', { enum: ['open', 'acknowledged', 'resolved'] }).notNull().default('open'),
  source: text('source').notNull(),
  assignedTo: text('assigned_to'),
  readAt: text('read_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const advisories = sqliteTable('advisories', {
  id: text('id').primaryKey(),
  cityId: text('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  ward: text('ward').notNull(),
  severity: text('severity', { enum: ['info', 'warning', 'critical'] }).notNull(),
  audienceJson: text('audience_json').notNull(),
  channelsJson: text('channels_json').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['draft', 'scheduled', 'published'] }).notNull().default('draft'),
  reach: integer('reach').notNull().default(0),
  createdAt: text('created_at').notNull(),
  publishedAt: text('published_at'),
});

export const enforcementCases = sqliteTable('enforcement_cases', {
  id: text('id').primaryKey(),
  cityId: text('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  ward: text('ward').notNull(),
  target: text('target').notNull(),
  category: text('category').notNull(),
  priority: integer('priority').notNull(),
  evidenceScore: real('evidence_score').notNull(),
  estimatedImpact: real('estimated_impact').notNull(),
  status: text('status', { enum: ['queued', 'dispatched', 'investigating', 'resolved'] }).notNull().default('queued'),
  assignedUnit: text('assigned_unit'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const uploads = sqliteTable('uploads', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
}));
