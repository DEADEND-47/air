import crypto from 'node:crypto';
import { and, count, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { buildAdvisory, correlateAlerts, prioritizeEnforcement, runAttribution, runForecast } from '../agents/local-agents.js';
import { broadcast } from '../realtime/hub.js';

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const parseJson = (value, fallback) => {
  try { return JSON.parse(value); } catch { return fallback; }
};
const pageMeta = (total, page, limit) => ({ total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });

function forecastFromRow(row) {
  return { ...row, drivers: parseJson(row.driversJson, []), driversJson: undefined };
}

function attributionFromRow(row) {
  return row ? { ...row, sources: parseJson(row.sourcesJson, []), sourcesJson: undefined } : null;
}

function advisoryFromRow(row) {
  return { ...row, audience: parseJson(row.audienceJson, []), channels: parseJson(row.channelsJson, []), audienceJson: undefined, channelsJson: undefined };
}

export class AirIqService {
  async listCities() {
    return db.select().from(schema.cities).orderBy(desc(schema.cities.aqi));
  }

  async getCity(cityId) {
    return db.select().from(schema.cities).where(eq(schema.cities.id, cityId)).get();
  }

  async listReadings(cityId, limit = 100) {
    return db.select().from(schema.readings).where(eq(schema.readings.cityId, cityId)).orderBy(desc(schema.readings.observedAt)).limit(limit);
  }

  async listForecasts(cityId) {
    const rows = await db.select().from(schema.forecasts).where(eq(schema.forecasts.cityId, cityId)).orderBy(schema.forecasts.horizonHours);
    return rows.map(forecastFromRow);
  }

  async getAttribution(cityId, ward) {
    const rows = await db.select().from(schema.attributions).where(eq(schema.attributions.cityId, cityId)).orderBy(desc(schema.attributions.generatedAt)).limit(10);
    const row = ward ? rows.find((item) => item.ward === ward) : rows[0];
    return attributionFromRow(row);
  }

  async overview(cityId) {
    const city = await this.getCity(cityId);
    if (!city) return null;
    const readings = await this.listReadings(cityId, 24);
    let forecasts = await this.listForecasts(cityId);
    let attribution = await this.getAttribution(cityId);
    if (forecasts.length === 0) forecasts = runForecast(city, readings);
    if (!attribution) attribution = runAttribution(cityId, 'Citywide', readings);
    const alerts = await this.listAlerts({ cityId });
    const enforcement = await this.listEnforcement(cityId);
    const advisories = await this.listAdvisories(cityId);
    return {
      city,
      forecastDelta: (forecasts.find((item) => item.horizonHours >= 6)?.predictedAqi ?? city.aqi) - city.aqi,
      activeAlerts: alerts.filter((item) => item.status !== 'resolved').length,
      enforcementActions: enforcement.filter((item) => item.status !== 'resolved').length,
      citizensAlerted: advisories.filter((item) => item.status === 'published').reduce((sum, item) => sum + item.reach, 0),
      sensorUptime: 99.1,
      readings,
      forecasts,
      attribution,
      insight: attribution.explanation,
    };
  }

  async listAlerts(filters = {}) {
    const rows = await db.select().from(schema.alerts).orderBy(desc(schema.alerts.createdAt));
    return rows.filter((alert) =>
      (!filters.cityId || alert.cityId === filters.cityId) &&
      (!filters.status || alert.status === filters.status) &&
      (!filters.severity || alert.severity === filters.severity) &&
      (!filters.search || `${alert.title} ${alert.description} ${alert.ward}`.toLowerCase().includes(filters.search.toLowerCase())) &&
      (!filters.unreadOnly || !alert.readAt));
  }

  async listAlertsPage(filters = {}, { page = 1, limit = 20 } = {}) {
    const rows = await this.listAlerts(filters);
    const start = (page - 1) * limit;
    return { data: rows.slice(start, start + limit), ...pageMeta(rows.length, page, limit) };
  }

  async createAlert(input) {
    const alert = { id: id('alert'), status: 'open', createdAt: now(), updatedAt: now(), ...input };
    await db.insert(schema.alerts).values(alert);
    broadcast('alert.created', alert);
    return alert;
  }

  async updateAlertStatus(alertId, status) {
    await db.update(schema.alerts).set({ status, updatedAt: now() }).where(eq(schema.alerts.id, alertId));
    const alert = await db.select().from(schema.alerts).where(eq(schema.alerts.id, alertId)).get();
    broadcast('alert.updated', alert);
    return alert;
  }

  async markAlertRead(alertId) {
    await db.update(schema.alerts).set({ readAt: now(), updatedAt: now() }).where(eq(schema.alerts.id, alertId));
    const alert = await db.select().from(schema.alerts).where(eq(schema.alerts.id, alertId)).get();
    broadcast('alert.read', alert);
    return alert;
  }

  async correlateAlerts(cityId) {
    return correlateAlerts(await this.listAlerts({ cityId }));
  }

  async listAdvisories(cityId) {
    const rows = cityId
      ? await db.select().from(schema.advisories).where(eq(schema.advisories.cityId, cityId)).orderBy(desc(schema.advisories.createdAt))
      : await db.select().from(schema.advisories).orderBy(desc(schema.advisories.createdAt));
    return rows.map(advisoryFromRow);
  }

  async createAdvisory(input) {
    const generated = buildAdvisory(input);
    const advisory = {
      id: id('advisory'),
      ...generated,
      audienceJson: JSON.stringify(generated.audience),
      channelsJson: JSON.stringify(generated.channels),
      status: input.status ?? 'draft',
      reach: input.status === 'published' ? input.reach ?? 0 : 0,
      createdAt: now(),
      publishedAt: input.status === 'published' ? now() : null,
    };
    delete advisory.audience;
    delete advisory.channels;
    await db.insert(schema.advisories).values(advisory);
    return advisoryFromRow(advisory);
  }

  async listEnforcement(cityId) {
    return cityId
      ? db.select().from(schema.enforcementCases).where(eq(schema.enforcementCases.cityId, cityId)).orderBy(desc(schema.enforcementCases.priority))
      : db.select().from(schema.enforcementCases).orderBy(desc(schema.enforcementCases.priority));
  }

  async listEnforcementPage(cityId, { page = 1, limit = 20 } = {}) {
    const rows = await this.listEnforcement(cityId);
    const start = (page - 1) * limit;
    return { data: rows.slice(start, start + limit), ...pageMeta(rows.length, page, limit) };
  }

  async generateEnforcement(cityId) {
    const attribution = await this.getAttribution(cityId) ?? runAttribution(cityId, 'Citywide', await this.listReadings(cityId, 50));
    const alerts = await this.listAlerts({ cityId, status: 'open' });
    const rows = prioritizeEnforcement(cityId, attribution, alerts).map((item) => ({ ...item, id: id('case'), createdAt: now(), updatedAt: now() }));
    for (const row of rows) await db.insert(schema.enforcementCases).values(row);
    return rows;
  }

  async updateEnforcementStatus(caseId, input) {
    await db.update(schema.enforcementCases).set({ status: input.status, assignedUnit: input.assignedUnit ?? null, updatedAt: now() }).where(eq(schema.enforcementCases.id, caseId));
    return db.select().from(schema.enforcementCases).where(eq(schema.enforcementCases.id, caseId)).get();
  }

  async runForecast(cityId) {
    const city = await this.getCity(cityId);
    if (!city) return null;
    return { data: runForecast(city, await this.listReadings(cityId, 24)), fallbackUsed: true, provider: 'local-rules' };
  }

  async runAttribution(cityId, ward = 'Citywide') {
    return { data: runAttribution(cityId, ward, await this.listReadings(cityId, 100)), fallbackUsed: true, provider: 'local-rules' };
  }

  async queryHistorical({ cityId, from, to, limit = 1000 }) {
    return db.select().from(schema.historicalReadings).where(and(
      eq(schema.historicalReadings.cityId, cityId),
      gte(schema.historicalReadings.observedAt, from),
      lte(schema.historicalReadings.observedAt, to),
    )).orderBy(desc(schema.historicalReadings.observedAt)).limit(limit);
  }

  async queryHistoricalPage({ cityId, from, to, page = 1, limit = 20 }) {
    const where = and(
      eq(schema.historicalReadings.cityId, cityId),
      gte(schema.historicalReadings.observedAt, from),
      lte(schema.historicalReadings.observedAt, to),
    );
    const total = (await db.select({ value: count() }).from(schema.historicalReadings).where(where).get())?.value ?? 0;
    const data = await db.select().from(schema.historicalReadings)
      .where(where)
      .orderBy(desc(schema.historicalReadings.observedAt))
      .limit(limit)
      .offset((page - 1) * limit);
    return { data, ...pageMeta(total, page, limit) };
  }

  async compareCities(ids, days = 7) {
    const cityIds = ids.slice(0, 3);
    const from = new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
    const rows = await db.select().from(schema.historicalReadings)
      .where(and(gte(schema.historicalReadings.observedAt, from)))
      .orderBy(schema.historicalReadings.observedAt);
    const cities = await this.listCities();
    return cityIds.map((cityId) => {
      const city = cities.find((item) => item.id === cityId);
      const history = rows.filter((row) => row.cityId === cityId).map((row) => ({
        observedAt: row.observedAt,
        aqi: row.aqi,
        pm25: row.pm25,
        pm10: row.pm10,
        no2: row.no2,
      }));
      const dominantPollutant = city?.pm25 >= city?.pm10 && city?.pm25 >= city?.no2
        ? 'PM2.5'
        : city?.pm10 >= city?.no2 ? 'PM10' : 'NO2';
      return {
        city,
        dominantPollutant,
        trend: city?.trend ?? 'flat',
        lastReadingTime: history.at(-1)?.observedAt ?? city?.updatedAt ?? null,
        readings: history,
      };
    }).filter((item) => item.city);
  }

  async unreadAlerts(limit = 5) {
    return db.select().from(schema.alerts).where(isNull(schema.alerts.readAt)).orderBy(desc(schema.alerts.createdAt)).limit(limit);
  }

  async dailyStats(cityId, from, to) {
    return db.select().from(schema.dailyStats).where(and(
      eq(schema.dailyStats.cityId, cityId),
      gte(schema.dailyStats.statDate, from),
      lte(schema.dailyStats.statDate, to),
    )).orderBy(desc(schema.dailyStats.statDate));
  }

  async getSettings() {
    const row = await db.select().from(schema.settings).where(eq(schema.settings.key, 'notifications')).get();
    return row ? parseJson(row.valueJson, {}) : { emailsEnabled: true, aqiThreshold: 300 };
  }

  async saveSettings(value) {
    await db.insert(schema.settings).values({ key: 'notifications', valueJson: JSON.stringify(value), updatedAt: now() })
      .onConflictDoUpdate({ target: schema.settings.key, set: { valueJson: JSON.stringify(value), updatedAt: now() } });
    return value;
  }

  async listAuditEvents({ page = 1, limit = 50, days = 7, action } = {}) {
    const since = new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
    const rows = await db.select().from(schema.auditEvents).orderBy(desc(schema.auditEvents.createdAt));
    const filtered = rows.filter((event) =>
      event.createdAt >= since &&
      (!action || event.action === action));
    const start = (page - 1) * limit;
    return { data: filtered.slice(start, start + limit), ...pageMeta(filtered.length, page, limit) };
  }
}

export const airiqService = new AirIqService();
