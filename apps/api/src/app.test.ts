import { describe, expect, it, vi } from 'vitest';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { InMemoryAirIqRepository } from './infrastructure/in-memory-repository.js';

describe('Fastify API Integration Gateway', () => {
  const config = loadConfig({
    ...process.env,
    DATABASE_URL: '', // triggers InMemoryRepository
    AI_PROVIDER: 'local',
  });

  const getApp = async () => {
    return buildApp({ config, disableJobs: true, logger: false });
  };

  it('should respond to liveness and readiness health checks', async () => {
    const app = await getApp();

    const liveRes = await app.inject({ method: 'GET', url: '/health/live' });
    expect(liveRes.statusCode).toBe(200);
    expect(JSON.parse(liveRes.payload).status).toBe('ok');

    const readyRes = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(readyRes.statusCode).toBe(200);
    expect(JSON.parse(readyRes.payload).status).toBe('ready');

    await app.close();
  });

  it('should allow authenticating with valid credentials and return a token', async () => {
    const app = await getApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@airiq.city',
        password: 'AirIQ!2026',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.accessToken).toBeDefined();
    expect(body.user.email).toBe('admin@airiq.city');

    await app.close();
  });

  it('should reject login for invalid credentials with 401', async () => {
    const app = await getApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@airiq.city',
        password: 'WrongPassword',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error.code).toBe('INVALID_CREDENTIALS');

    await app.close();
  });

  it('should restrict secured endpoints for unauthenticated requests with 401', async () => {
    const app = await getApp();

    const endpoints = [
      '/api/v1/auth/me',
      '/api/v1/dashboard/overview',
      '/api/v1/cities',
      '/api/v1/readings',
      '/api/v1/forecasts',
      '/api/v1/attributions',
      '/api/v1/alerts',
      '/api/v1/advisories',
      '/api/v1/enforcement',
    ];

    for (const url of endpoints) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(401);
    }

    await app.close();
  });

  it('should allow access to secured endpoints when passing a valid JWT token', async () => {
    const app = await getApp();

    // Login to get token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@airiq.city',
        password: 'AirIQ!2026',
      },
    });
    const { accessToken } = JSON.parse(loginRes.payload);
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Test GET /api/v1/auth/me
    const meRes = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers });
    expect(meRes.statusCode).toBe(200);
    expect(JSON.parse(meRes.payload).user.email).toBe('admin@airiq.city');

    // Test GET /api/v1/dashboard/overview
    const overviewRes = await app.inject({ method: 'GET', url: '/api/v1/dashboard/overview?cityId=delhi', headers });
    expect(overviewRes.statusCode).toBe(200);
    expect(JSON.parse(overviewRes.payload).city.name).toBe('Delhi');

    // Test GET /api/v1/cities
    const citiesRes = await app.inject({ method: 'GET', url: '/api/v1/cities', headers });
    expect(citiesRes.statusCode).toBe(200);
    expect(JSON.parse(citiesRes.payload).data).toBeDefined();

    // Test GET /api/v1/alerts
    const alertsRes = await app.inject({ method: 'GET', url: '/api/v1/alerts?cityId=delhi', headers });
    expect(alertsRes.statusCode).toBe(200);
    expect(JSON.parse(alertsRes.payload).data.length).toBeGreaterThan(0);

    // Test POST /api/v1/alerts (Create alert)
    const alertCreateRes = await app.inject({
      method: 'POST',
      url: '/api/v1/alerts',
      headers,
      payload: {
        cityId: 'delhi',
        ward: 'Connaught Place',
        title: 'High PM peak',
        description: 'Temporary spike detected in retail district.',
        severity: 'warning',
        source: 'Sensor DL-005',
      },
    });
    expect(alertCreateRes.statusCode).toBe(201);
    const createdAlert = JSON.parse(alertCreateRes.payload);
    expect(createdAlert.title).toBe('High PM peak');

    // Test PATCH /api/v1/alerts/:id/status (Transition alert)
    const alertTransitionRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/alerts/${createdAlert.id}/status`,
      headers,
      payload: { status: 'acknowledged' },
    });
    expect(alertTransitionRes.statusCode).toBe(200);
    expect(JSON.parse(alertTransitionRes.payload).status).toBe('acknowledged');

    await app.close();
  });

  it('should complete register to OTP login and session rotation flow end to end', async () => {
    const repository = await InMemoryAirIqRepository.create();
    const emailLog: Array<{ to: string; subject: string; text: string; html?: string }> = [];
    const emailService = {
      sendOtp: vi.fn(async (to: string, otp: string, purpose: 'verify_email' | 'login_otp' | 'two_factor') => {
        emailLog.push({
          to,
          subject: purpose === 'verify_email' ? 'Verify your AirIQ account' : purpose === 'login_otp' ? 'Your AirIQ login code' : 'Your AirIQ two-factor verification code',
          text: otp,
        });
      }),
      sendPasswordReset: vi.fn(),
      sendWelcome: vi.fn().mockResolvedValue(undefined),
      sendAdvisory: vi.fn(),
      sendAlert: vi.fn(),
    };
    const app = await buildApp({ config, repository, emailService: emailService as never, disableJobs: true, logger: false });

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'OTP Operator',
        email: 'otp-operator@airiq.city',
        password: 'SecurePassword123!',
      },
    });
    expect(registerRes.statusCode).toBe(201);
    const registerBody = JSON.parse(registerRes.payload);
    expect(registerBody.message).toContain('Account created');

    const verifyOtp = emailLog.at(-1)?.text;
    expect(verifyOtp).toMatch(/^\d{6}$/);

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      payload: {
        email: 'otp-operator@airiq.city',
        code: verifyOtp,
      },
    });
    expect(verifyRes.statusCode).toBe(200);

    const sendLoginOtpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/send-otp',
      payload: { email: 'otp-operator@airiq.city' },
    });
    expect(sendLoginOtpRes.statusCode).toBe(202);

    const loginOtp = emailLog.at(-1)?.text;
    expect(loginOtp).toMatch(/^\d{6}$/);

    const otpLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp-login',
      payload: {
        email: 'otp-operator@airiq.city',
        code: loginOtp,
      },
    });
    expect(otpLoginRes.statusCode).toBe(200);
    const otpLoginBody = JSON.parse(otpLoginRes.payload);
    expect(otpLoginBody.accessToken).toBeDefined();
    expect(otpLoginBody.sessionId).toBeDefined();

    const authHeaders = { Authorization: `Bearer ${otpLoginBody.accessToken}` };
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: authHeaders,
      payload: { sessionId: otpLoginBody.sessionId },
    });
    expect(logoutRes.statusCode).toBe(204);

    const passwordLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'otp-operator@airiq.city',
        password: 'SecurePassword123!',
      },
    });
    expect(passwordLoginRes.statusCode).toBe(200);
    const passwordLoginBody = JSON.parse(passwordLoginRes.payload);
    expect(passwordLoginBody.accessToken).toBeDefined();

    await app.close();
  });

  it('should restrict writes or operations based on role authorizations', async () => {
    const app = await getApp();

    // Login as a user with non-admin/non-officer role if possible, or verify admin permissions
    // In our seed, usr-enforcement has the role "enforcement_officer"
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'enforcement@airiq.city',
        password: 'AirIQ!2026',
      },
    });
    const { accessToken } = JSON.parse(loginRes.payload);
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Enforcement officers should not be allowed to write advisories (only health officers and admins can)
    const advisoryRes = await app.inject({
      method: 'POST',
      url: '/api/v1/advisories',
      headers,
      payload: {
        cityId: 'delhi',
        ward: 'Okhla',
        aqi: 250,
        audience: ['children'],
        channels: ['push'],
      },
    });
    // Should return 403 Forbidden
    expect(advisoryRes.statusCode).toBe(403);

    // Enforcement officers should be allowed to run/dispatch enforcement case status
    const listRes = await app.inject({ method: 'GET', url: '/api/v1/enforcement', headers });
    const enforcementCases = JSON.parse(listRes.payload).data;
    const firstCase = enforcementCases.find((c: { status: string; id: string }) => c.status === 'queued');

    if (firstCase) {
      const dispatchRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/enforcement/${firstCase.id}/status`,
        headers,
        payload: { status: 'dispatched', assignedUnit: 'Beta-4' },
      });
      expect(dispatchRes.statusCode).toBe(200);
      expect(JSON.parse(dispatchRes.payload).status).toBe('dispatched');
    }

    await app.close();
  });
});
