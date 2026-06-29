import { Router } from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { config } from '../config.js';
import { airiqService } from '../services/airiq-service.js';
import { authenticate, authService, rejectDemoWrites, requireRole } from '../services/auth-service.js';
import { runEtl } from '../pipeline/etl-pipeline.js';
import { cacheGet } from '../middleware/cache.js';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const airiqRoutes = Router();
mkdirSync(resolve(process.cwd(), config.UPLOAD_DIR), { recursive: true });
const upload = multer({
  dest: resolve(process.cwd(), config.UPLOAD_DIR),
  limits: { fileSize: 10 * 1024 * 1024 },
});

airiqRoutes.use(authenticate);

async function sendDashboardOverview(req, res, next) {
  try {
    const { cityId } = z.object({ cityId: z.string().default('delhi') }).parse(req.query);
    const data = await airiqService.overview(cityId);
    if (!data) return res.status(404).json({ error: { message: 'City not found', code: 'NOT_FOUND' } });
    return res.json(data);
  } catch (error) { return next(error); }
}

airiqRoutes.get('/dashboard', cacheGet(), sendDashboardOverview);
airiqRoutes.get('/dashboard/overview', cacheGet(), sendDashboardOverview);

airiqRoutes.get('/cities', cacheGet(), async (_req, res, next) => {
  try { res.json({ data: await airiqService.listCities() }); }
  catch (error) { next(error); }
});

airiqRoutes.get('/cities/compare', async (req, res, next) => {
  try {
    const input = z.object({
      ids: z.string().default('delhi,mumbai,bengaluru'),
      days: z.coerce.number().int().min(1).max(30).default(7),
    }).parse(req.query);
    res.json({ data: await airiqService.compareCities(input.ids.split(',').map((id) => id.trim()).filter(Boolean), input.days) });
  } catch (error) { next(error); }
});

airiqRoutes.get('/readings', async (req, res, next) => {
  try {
    const input = z.object({ cityId: z.string().default('delhi'), limit: z.coerce.number().int().min(1).max(500).default(100) }).parse(req.query);
    res.json({ data: await airiqService.listReadings(input.cityId, input.limit) });
  } catch (error) { next(error); }
});

airiqRoutes.get('/forecasts', async (req, res, next) => {
  try { res.json({ data: await airiqService.listForecasts(String(req.query.cityId ?? 'delhi')) }); }
  catch (error) { next(error); }
});

airiqRoutes.get('/attributions', async (req, res, next) => {
  try { res.json({ data: await airiqService.getAttribution(String(req.query.cityId ?? 'delhi'), req.query.ward ? String(req.query.ward) : undefined) }); }
  catch (error) { next(error); }
});

airiqRoutes.get('/alerts', async (req, res, next) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    const data = await airiqService.listAlertsPage({
      cityId: req.query.city_id ? String(req.query.city_id) : req.query.cityId ? String(req.query.cityId) : undefined,
      status: req.query.status ? String(req.query.status).replace('active', 'open') : undefined,
      severity: req.query.severity ? String(req.query.severity).replace('high', 'critical').replace('medium', 'warning').replace('low', 'info') : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      unreadOnly: req.query.unread === 'true',
    }, pagination);
    res.json(data);
  }
  catch (error) { next(error); }
});

airiqRoutes.post('/alerts', rejectDemoWrites, requireRole('admin', 'analyst'), async (req, res, next) => {
  try {
    const input = z.object({
      cityId: z.string(),
      ward: z.string().min(2),
      title: z.string().min(3),
      description: z.string().min(10),
      severity: z.enum(['info', 'warning', 'critical']),
      source: z.string().min(2),
    }).parse(req.body);
    res.status(201).json(await airiqService.createAlert(input));
  } catch (error) { next(error); }
});

airiqRoutes.patch('/alerts/:id/status', rejectDemoWrites, requireRole('admin', 'analyst'), async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['open', 'acknowledged', 'resolved']) }).parse(req.body);
    res.json(await airiqService.updateAlertStatus(req.params.id, status));
  } catch (error) { next(error); }
});

airiqRoutes.patch('/alerts/:id/read', async (req, res, next) => {
  try { res.json(await airiqService.markAlertRead(req.params.id)); }
  catch (error) { next(error); }
});

airiqRoutes.get('/alerts/correlations', async (req, res, next) => {
  try { res.json({ data: await airiqService.correlateAlerts(String(req.query.cityId ?? 'delhi')) }); }
  catch (error) { next(error); }
});

airiqRoutes.get('/advisories', async (req, res, next) => {
  try { res.json({ data: await airiqService.listAdvisories(req.query.cityId ? String(req.query.cityId) : undefined) }); }
  catch (error) { next(error); }
});

airiqRoutes.post('/advisories', rejectDemoWrites, requireRole('admin', 'analyst'), async (req, res, next) => {
  try {
    const input = z.object({
      cityId: z.string(),
      ward: z.string().min(2),
      aqi: z.number().int().min(0).max(999),
      audience: z.array(z.string()).min(1),
      channels: z.array(z.enum(['sms', 'push', 'email', 'public_display'])).min(1),
      status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
      reach: z.number().int().nonnegative().optional(),
    }).parse(req.body);
    res.status(201).json(await airiqService.createAdvisory(input));
  } catch (error) { next(error); }
});

airiqRoutes.get('/enforcement', async (req, res, next) => {
  try {
    const pagination = paginationSchema.parse(req.query);
    res.json(await airiqService.listEnforcementPage(req.query.cityId ? String(req.query.cityId) : undefined, pagination));
  }
  catch (error) { next(error); }
});

airiqRoutes.post('/enforcement/generate', rejectDemoWrites, requireRole('admin', 'analyst'), async (req, res, next) => {
  try { res.status(201).json({ data: await airiqService.generateEnforcement(String(req.body.cityId ?? 'delhi')) }); }
  catch (error) { next(error); }
});

airiqRoutes.patch('/enforcement/:id/status', rejectDemoWrites, requireRole('admin', 'analyst'), async (req, res, next) => {
  try {
    const input = z.object({ status: z.enum(['queued', 'dispatched', 'investigating', 'resolved']), assignedUnit: z.string().optional() }).parse(req.body);
    res.json(await airiqService.updateEnforcementStatus(req.params.id, input));
  } catch (error) { next(error); }
});

airiqRoutes.post('/agents/forecast', rejectDemoWrites, requireRole('admin', 'analyst'), async (req, res, next) => {
  try { res.json(await airiqService.runForecast(String(req.body.cityId ?? 'delhi'))); }
  catch (error) { next(error); }
});

airiqRoutes.post('/agents/attribution', rejectDemoWrites, requireRole('admin', 'analyst'), async (req, res, next) => {
  try { res.json(await airiqService.runAttribution(String(req.body.cityId ?? 'delhi'), String(req.body.ward ?? 'Citywide'))); }
  catch (error) { next(error); }
});

airiqRoutes.get('/historical', async (req, res, next) => {
  try {
    const input = z.object({
      cityId: z.string().default('delhi'),
      from: z.string().default(new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString()),
      to: z.string().default(new Date().toISOString()),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(5000).default(20),
    }).parse(req.query);
    res.json(await airiqService.queryHistoricalPage(input));
  } catch (error) { next(error); }
});

airiqRoutes.get('/historical/stats', async (req, res, next) => {
  try {
    const input = z.object({
      cityId: z.string().default('delhi'),
      from: z.string().default(new Date(Date.now() - 90 * 24 * 60 * 60_000).toISOString().slice(0, 10)),
      to: z.string().default(new Date().toISOString().slice(0, 10)),
    }).parse(req.query);
    res.json({ data: await airiqService.dailyStats(input.cityId, input.from, input.to) });
  } catch (error) { next(error); }
});

airiqRoutes.post('/pipeline/run', rejectDemoWrites, requireRole('admin'), async (req, res, next) => {
  try { res.status(202).json({ data: await runEtl({ source: req.body.source ?? 'synthetic', daysBack: req.body.daysBack ?? 30 }) }); }
  catch (error) { next(error); }
});

airiqRoutes.get('/admin/settings', requireRole('admin'), async (_req, res, next) => {
  try { res.json({ data: await airiqService.getSettings() }); }
  catch (error) { next(error); }
});

airiqRoutes.patch('/admin/settings', requireRole('admin'), async (req, res, next) => {
  try { res.json({ data: await airiqService.saveSettings(req.body) }); }
  catch (error) { next(error); }
});

airiqRoutes.get('/admin/audit', requireRole('admin'), async (req, res, next) => {
  try {
    const input = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      days: z.coerce.number().int().min(1).max(365).default(7),
      action: z.string().optional(),
    }).parse(req.query);
    res.json(await airiqService.listAuditEvents(input));
  } catch (error) { next(error); }
});

airiqRoutes.get('/users/me', async (req, res, next) => {
  try { res.json({ data: await authService.getProfile(req.user.sub) }); }
  catch (error) { next(error); }
});

airiqRoutes.patch('/users/me', rejectDemoWrites, async (req, res, next) => {
  try {
    const input = z.object({ firstName: z.string().min(1), lastName: z.string().min(1) }).parse(req.body);
    res.json({ data: await authService.updateProfile(req.user.sub, input) });
  } catch (error) { next(error); }
});

airiqRoutes.patch('/users/me/password', rejectDemoWrites, async (req, res, next) => {
  try {
    const input = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }).parse(req.body);
    res.json(await authService.changePassword(req.user.sub, input));
  } catch (error) { next(error); }
});

airiqRoutes.post('/uploads', rejectDemoWrites, requireRole('admin', 'analyst'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: { message: 'File is required', code: 'FILE_REQUIRED' } });
    const record = {
      id: `upload-${crypto.randomUUID().slice(0, 8)}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.sub,
      createdAt: new Date().toISOString(),
    };
    await db.insert(schema.uploads).values(record);
    return res.status(201).json(record);
  } catch (error) { return next(error); }
});
