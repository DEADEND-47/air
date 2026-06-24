import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { nanoid } from 'nanoid';
import postgres from 'postgres';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';
import { z, ZodError } from 'zod';
import { createAgentSuite } from './ai/agents.js';
import { CompatibleAiProvider, LocalAiProvider } from './ai/provider.js';
import { AirIqService } from './application/airiq-service.js';
import { AppError } from './application/errors.js';
import { EnhancedAuthService } from './application/enhanced-auth-service.js';
import { emailService, type IEmailService } from './application/email-service.js';
import { authRoutes } from './routes/auth-routes.js';
import type { AirIqRepository } from './application/ports.js';
import { loadConfig, type AppConfig } from './config.js';
import type { Advisory, AlertStatus, EnforcementStatus, Severity } from './domain/models.js';
import { BackgroundScheduler } from './infrastructure/background-scheduler.js';
import { InMemoryAirIqRepository } from './infrastructure/in-memory-repository.js';
import { PostgresAirIqRepository } from './infrastructure/postgres-repository.js';
import { createAuthHelpers } from './infrastructure/supabase-auth.js';

export interface BuildAppOptions {
  config?: AppConfig;
  repository?: AirIqRepository;
  emailService?: IEmailService;
  disableJobs?: boolean;
  logger?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const app = Fastify({
    logger: options.logger ?? config.NODE_ENV !== 'test' ? { level: config.LOG_LEVEL, redact: ['req.headers.authorization', 'body.password'] } : false,
    requestIdHeader: 'x-request-id',
    genReqId: (request) => String(request.headers['x-request-id'] ?? nanoid()),
    trustProxy: true,
  });

  let sql: ReturnType<typeof postgres> | undefined;
  let repository = options.repository;
  if (!repository && config.DATABASE_URL) {
    sql = postgres(config.DATABASE_URL, { max: 10, idle_timeout: 20, connect_timeout: 10 });
    repository = new PostgresAirIqRepository(sql);
  }
  repository ??= await InMemoryAirIqRepository.create();

  const provider = config.AI_PROVIDER === 'compatible' ? new CompatibleAiProvider(config) : new LocalAiProvider();
  const service = new AirIqService(repository, createAgentSuite(provider), config.AI_DAILY_BUDGET_USD);
  const signJwt = (payload: object, ttl: string | number) => app.jwt.sign(payload as any, { expiresIn: ttl as string });
  const auth = new EnhancedAuthService(repository, options.emailService ?? emailService, signJwt);
  const { hydrateUser: authenticate, authorize } = createAuthHelpers(config, repository);
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: 'airiq_' });
  const requests = new Counter({ name: 'airiq_http_requests_total', help: 'Total HTTP requests', labelNames: ['method', 'route', 'status'], registers: [registry] });
  const duration = new Histogram({ name: 'airiq_http_request_duration_seconds', help: 'HTTP request duration', labelNames: ['method', 'route', 'status'], registers: [registry], buckets: [0.01, 0.05, 0.1, 0.3, 1, 3] });

  await app.register(cors, { origin: config.WEB_ORIGIN.split(',').map((origin) => origin.trim()), credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });
  await app.register(helmet, { contentSecurityPolicy: config.NODE_ENV === 'production' });
  await app.register(rateLimit, { max: 180, timeWindow: '1 minute', keyGenerator: (request) => `${request.ip}:${request.user?.sub ?? 'anonymous'}` });
  await app.register(jwt, { secret: config.JWT_SECRET, sign: { expiresIn: '8h' } });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10 } });
  await app.register(swagger, { openapi: { info: { title: 'AirIQ Smart City API', description: 'Operational API for air-quality intelligence, response, and public health workflows.', version: '1.0.0' }, servers: [{ url: '/api/v1' }], components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } } } });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.addHook('onRequest', async (request) => { (request as FastifyRequest & { startedAt: number }).startedAt = performance.now(); });
  app.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions.url ?? request.url;
    const labels = { method: request.method, route, status: String(reply.statusCode) };
    requests.inc(labels);
    duration.observe(labels, (performance.now() - (request as FastifyRequest & { startedAt: number }).startedAt) / 1000);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) return reply.code(422).send({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.issues, requestId: request.id } });
    if (error instanceof AppError) return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message, requestId: request.id } });
    const fastifyError = error as { statusCode?: number; code?: string; message?: string };
    if (fastifyError.statusCode) return reply.code(fastifyError.statusCode).send({ error: { code: fastifyError.code || 'HTTP_ERROR', message: fastifyError.message || 'Request failed', requestId: request.id } });
    request.log.error({ error }, 'unhandled request error');
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId: request.id } });
  });

  app.get('/health/live', { schema: { tags: ['System'] } }, async () => ({ status: 'ok', service: 'airiq-api', timestamp: new Date().toISOString() }));
  app.get('/health/ready', { schema: { tags: ['System'] } }, async (_request, reply) => {
    try { await repository.listCities(); return { status: 'ready', database: config.DATABASE_URL ? 'postgres' : 'memory' }; }
    catch { return reply.code(503).send({ status: 'not_ready' }); }
  });
  app.get('/metrics', { schema: { hide: true } }, async (_request, reply) => reply.header('Content-Type', registry.contentType).send(await registry.metrics()));

  // ── Auth routes (registration, OTP, refresh, reset, sessions) ──
  await authRoutes(app, auth, authenticate);


  app.get('/api/v1/auth/me', { onRequest: authenticate, schema: secured('Authentication', 'Return the current operator') }, async (request) => ({ user: { id: request.user.sub, email: request.user.email, name: request.user.name, role: request.user.role, active: true } }));
  app.get('/api/v1/dashboard/overview', { onRequest: authenticate, schema: secured('Dashboard', 'Executive command center overview') }, async (request) => service.getOverview(query(request, z.object({ cityId: z.string().default('delhi') })).cityId));
  app.get('/api/v1/cities', { onRequest: authenticate, schema: secured('Cities', 'List monitored cities') }, async () => ({ data: await service.listCities() }));
  app.get('/api/v1/readings', { onRequest: authenticate, schema: secured('Sensors', 'List recent sensor readings') }, async (request) => { const input = query(request, z.object({ cityId: z.string().default('delhi'), limit: z.coerce.number().int().min(1).max(500).default(100) })); return { data: await service.listReadings(input.cityId, input.limit) }; });
  app.get('/api/v1/forecasts', { onRequest: authenticate, schema: secured('Forecasts', 'List stored forecasts') }, async (request) => { const input = query(request, z.object({ cityId: z.string().default('delhi'), ward: z.string().optional() })); return { data: await service.listForecasts(input.cityId, input.ward) }; });
  app.get('/api/v1/attributions', { onRequest: authenticate, schema: secured('Attribution', 'Return latest source attribution') }, async (request) => { const input = query(request, z.object({ cityId: z.string().default('delhi'), ward: z.string().optional() })); return { data: await service.getAttribution(input.cityId, input.ward) }; });

  app.get('/api/v1/alerts', { onRequest: authenticate, schema: secured('Alerts', 'List operational alerts') }, async (request) => {
    const input = query(request, z.object({ cityId: z.string().optional(), status: z.enum(['open', 'acknowledged', 'resolved']).optional(), severity: z.enum(['info', 'warning', 'critical']).optional() }));
    const filters: { cityId?: string; status?: string; severity?: string } = {};
    if (input.cityId !== undefined) filters.cityId = input.cityId;
    if (input.status !== undefined) filters.status = input.status;
    if (input.severity !== undefined) filters.severity = input.severity;
    return { data: await service.listAlerts(filters) };
  });
  app.post('/api/v1/alerts', { onRequest: authorize('alerts:write'), schema: secured('Alerts', 'Create an alert') }, async (request, reply) => { const input = body(request, z.object({ cityId: z.string(), ward: z.string().min(2).max(120), title: z.string().min(3).max(160), description: z.string().min(10).max(2_000), severity: z.enum(['info', 'warning', 'critical']), source: z.string().min(2).max(120) })); return reply.code(201).send(await service.createAlert(input as typeof input & { severity: Severity }, request.user.sub)); });
  app.patch('/api/v1/alerts/:id/status', { onRequest: authorize('alerts:write'), schema: secured('Alerts', 'Transition alert status') }, async (request) => { const { id } = params(request); const input = body(request, z.object({ status: z.enum(['open', 'acknowledged', 'resolved']) })); return service.transitionAlert(id, input.status as AlertStatus, request.user.sub); });
  app.get('/api/v1/alerts/correlations', { onRequest: authenticate, schema: secured('Alerts', 'Correlate related alert signals') }, async (request) => ({ data: await service.correlateAlerts(query(request, z.object({ cityId: z.string().default('delhi') })).cityId) }));

  app.get('/api/v1/advisories', { onRequest: authenticate, schema: secured('Advisories', 'List citizen health advisories') }, async (request) => ({ data: await service.listAdvisories(query(request, z.object({ cityId: z.string().optional() })).cityId) }));
  app.post('/api/v1/advisories', { onRequest: authorize('advisories:write'), schema: secured('Advisories', 'Generate and optionally publish a health advisory') }, async (request, reply) => {
    const input = body(request, z.object({ cityId: z.string(), ward: z.string().min(2), aqi: z.number().int().min(0).max(999), audience: z.array(z.string()).min(1), channels: z.array(z.enum(['sms', 'push', 'email', 'public_display'])).min(1), status: z.enum(['draft', 'scheduled', 'published']).default('draft'), reach: z.number().int().nonnegative().optional() }));
    const advisoryInput = {
      cityId: input.cityId,
      ward: input.ward,
      aqi: input.aqi,
      audience: input.audience,
      channels: input.channels as Advisory['channels'],
      status: input.status,
      ...(input.reach !== undefined ? { reach: input.reach } : {})
    };
    return reply.code(201).send(await service.createAdvisory(advisoryInput, request.user.sub));
  });
  app.post('/api/v1/advisories/:id/publish', { onRequest: authorize('advisories:write'), schema: secured('Advisories', 'Publish a draft advisory') }, async (request) => service.publishAdvisory(params(request).id, body(request, z.object({ reach: z.number().int().nonnegative() })).reach, request.user.sub));

  app.get('/api/v1/enforcement', { onRequest: authenticate, schema: secured('Enforcement', 'List prioritized enforcement cases') }, async (request) => ({ data: await service.listEnforcement(query(request, z.object({ cityId: z.string().optional() })).cityId) }));
  app.post('/api/v1/enforcement/generate', { onRequest: authorize('enforcement:write'), schema: secured('Enforcement', 'Generate enforcement priorities') }, async (request, reply) => reply.code(201).send({ data: await service.generateEnforcement(body(request, z.object({ cityId: z.string().default('delhi') })).cityId, request.user.sub) }));
  app.patch('/api/v1/enforcement/:id/status', { onRequest: authorize('enforcement:write'), schema: secured('Enforcement', 'Transition an enforcement case') }, async (request) => { const input = body(request, z.object({ status: z.enum(['queued', 'dispatched', 'investigating', 'resolved']), assignedUnit: z.string().min(2).max(100).optional() })); return service.transitionEnforcement(params(request).id, input.status as EnforcementStatus, input.assignedUnit, request.user.sub); });

  app.post('/api/v1/agents/forecast', { onRequest: authorize('agents:run'), schema: secured('Agents', 'Run the forecast agent') }, async (request) => service.runForecast(body(request, z.object({ cityId: z.string().default('delhi') })).cityId));
  app.post('/api/v1/agents/attribution', { onRequest: authorize('agents:run'), schema: secured('Agents', 'Run the attribution agent') }, async (request) => { const input = body(request, z.object({ cityId: z.string().default('delhi'), ward: z.string().default('Citywide') })); return service.runAttribution(input.cityId, input.ward); });
  app.get('/api/v1/admin/users', { onRequest: authorize('users:read'), schema: secured('Administration', 'List AirIQ operators') }, async () => ({ data: await auth.listUsers() }));

  // ── Historical data pipeline routes ──
  app.get('/api/v1/historical', { onRequest: authenticate, schema: secured('Historical', 'Query historical air quality archive') }, async (request) => {
    const input = query(request, z.object({
      cityId: z.string().default('delhi'),
      from: z.string().default(new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString()),
      to: z.string().default(new Date().toISOString()),
      granularity: z.enum(['hourly', 'daily', 'monthly']).optional(),
      limit: z.coerce.number().int().min(1).max(5000).default(1000),
    }));
    return { data: await repository.queryHistorical(input) };
  });

  app.get('/api/v1/historical/stats', { onRequest: authenticate, schema: secured('Historical', 'Get daily aggregated statistics') }, async (request) => {
    const input = query(request, z.object({
      cityId: z.string().default('delhi'),
      from: z.string().default(new Date(Date.now() - 90 * 24 * 60 * 60_000).toISOString().split('T')[0]!),
      to: z.string().default(new Date().toISOString().split('T')[0]!),
    }));
    return { data: await repository.getDailyStats(input.cityId, input.from, input.to) };
  });

  app.get('/api/v1/pipeline/status', { onRequest: authenticate, schema: secured('Pipeline', 'Get last ETL pipeline run status') }, async () => {
    return { data: await repository.getLastIngestionRun() };
  });

  app.post('/api/v1/pipeline/run', { onRequest: authorize('agents:run'), schema: secured('Pipeline', 'Manually trigger data ingestion') }, async (_request, reply) => {
    // Trigger ingestion in background — returns run ID immediately
    const runId = await repository.startIngestionRun('manual');
    // Actual ingestion would be triggered here via background job
    return reply.code(202).send({ runId, message: 'Ingestion run started.' });
  });

  app.get('/api/v1/admin/settings', { onRequest: authorize('users:read'), schema: secured('Administration', 'Get system settings') }, async () => {
    const settings = await repository.getSystemSetting('notifications') || { emailsEnabled: true, aqiThreshold: 300 };
    return { data: settings };
  });

  app.patch('/api/v1/admin/settings', { onRequest: authorize('users:read'), schema: secured('Administration', 'Update system settings') }, async (request) => {
    const input = body(request, z.object({ emailsEnabled: z.boolean().optional(), aqiThreshold: z.number().int().min(0).max(999).optional() }));
    const current = await repository.getSystemSetting<any>('notifications') || { emailsEnabled: true, aqiThreshold: 300 };
    const updated = { ...current, ...input };
    await repository.saveSystemSetting('notifications', updated);
    return { data: updated };
  });

  app.post('/api/v1/admin/test-email', { onRequest: authorize('users:read'), schema: secured('Administration', 'Send a test email') }, async (request) => {
    const input = body(request, z.object({ email: z.string().email() }));
    await emailService.sendWelcome(input.email, 'Operator Test');
    return { message: 'Test email successfully dispatched.' };
  });


  app.post('/api/v1/uploads', { onRequest: authorize('uploads:write'), schema: secured('Uploads', 'Upload sensor evidence or bulk data') }, async (request, reply) => {
    const file = await request.file();
    if (!file) throw new AppError('A file is required');
    const allowed = new Set(['text/csv', 'application/json', 'image/jpeg', 'image/png', 'application/pdf']);
    if (!allowed.has(file.mimetype)) throw new AppError('Unsupported file type', 415, 'UNSUPPORTED_MEDIA_TYPE');
    const extension = extname(basename(file.filename)).toLowerCase();
    const storedName = `${nanoid(16)}${extension}`;
    const directory = resolve(config.UPLOAD_DIR);
    await mkdir(directory, { recursive: true });
    await pipeline(file.file, createWriteStream(resolve(directory, storedName), { flags: 'wx' }));
    return reply.code(201).send({ id: storedName, filename: basename(file.filename), mimeType: file.mimetype, bytes: file.file.bytesRead });
  });

  const scheduler = new BackgroundScheduler(service, app.log);
  if (!options.disableJobs && !config.DISABLE_JOBS) scheduler.start();
  app.addHook('onClose', async () => { scheduler.stop(); if (sql) await sql.end(); registry.clear(); });
  return app;
}

function secured(tag: string, summary: string) { return { tags: [tag], summary, security: [{ bearerAuth: [] }] }; }
function body<T>(request: FastifyRequest, schema: z.ZodType<T>): T { return schema.parse(request.body); }
function query<T>(request: FastifyRequest, schema: z.ZodType<T>): T { return schema.parse(request.query); }
function params(request: FastifyRequest): { id: string } { return z.object({ id: z.string().min(1) }).parse(request.params); }
