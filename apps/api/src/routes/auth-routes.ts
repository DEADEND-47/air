import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { EnhancedAuthService } from '../application/enhanced-auth-service.js';

const UA_HEADER = 'user-agent';

function body<T>(request: FastifyRequest, schema: z.ZodType<T>): T {
  return schema.parse(request.body);
}

export async function authRoutes(app: FastifyInstance, authSvc: EnhancedAuthService, authenticate: (request: FastifyRequest) => Promise<void>): Promise<void> {
  const tag = { tags: ['Auth'] };

  // ──────────────────────────────────────────────────────────────
  // REGISTRATION
  // ──────────────────────────────────────────────────────────────
  app.post('/api/v1/auth/register', { schema: { ...tag, summary: 'Register a new user account' } }, async (request, reply) => {
    const input = body(request, z.object({
      name: z.string().min(2).max(100),
      email: z.string().email(),
      password: z.string().min(8).max(200),
      role: z.enum(['city_admin', 'analyst', 'enforcement_officer', 'health_officer', 'standard_user']).optional(),
    }));
    const result = await authSvc.register({
      name: input.name,
      email: input.email,
      password: input.password,
      ...(input.role !== undefined ? { role: input.role } : {}),
    });
    return reply.code(201).send(result);
  });

  app.post('/api/v1/auth/verify-email', { schema: { ...tag, summary: 'Verify email address with OTP' } }, async (request) => {
    const input = body(request, z.object({
      email: z.string().email(),
      code: z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits'),
    }));
    return authSvc.verifyEmail(input.email, input.code);
  });

  app.post('/api/v1/auth/resend-verification', { schema: { ...tag, summary: 'Resend email verification OTP' } }, async (request, reply) => {
    const input = body(request, z.object({ email: z.string().email() }));
    await authSvc.resendVerificationOtp(input.email);
    return reply.code(202).send({ message: 'If your account exists, a new code has been sent.' });
  });

  // ──────────────────────────────────────────────────────────────
  // LOGIN
  // ──────────────────────────────────────────────────────────────
  app.post('/api/v1/auth/login', { schema: { ...tag, summary: 'Login with email and password' } }, async (request) => {
    const input = body(request, z.object({
      email: z.string().email(),
      password: z.string().min(1),
      rememberMe: z.boolean().optional().default(false),
      deviceName: z.string().max(120).optional(),
    }));
    return authSvc.login({
      email: input.email,
      password: input.password,
      rememberMe: input.rememberMe,
      ...(input.deviceName !== undefined ? { deviceName: input.deviceName } : {}),
      ...(request.headers[UA_HEADER] !== undefined ? { userAgent: request.headers[UA_HEADER] } : {}),
      ipAddress: request.ip,
    });
  });

  app.post('/api/v1/auth/send-otp', { schema: { ...tag, summary: 'Send a one-time login code to email' } }, async (request, reply) => {
    const input = body(request, z.object({ email: z.string().email() }));
    await authSvc.sendLoginOtp(input.email);
    return reply.code(202).send({ message: 'If your account exists, a login code has been sent.' });
  });

  app.post('/api/v1/auth/otp-login', { schema: { ...tag, summary: 'Login with emailed OTP code' } }, async (request) => {
    const input = body(request, z.object({
      email: z.string().email(),
      code: z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits'),
      deviceName: z.string().max(120).optional(),
    }));
    return authSvc.loginWithOtp({
      email: input.email,
      code: input.code,
      ...(input.deviceName !== undefined ? { deviceName: input.deviceName } : {}),
      ...(request.headers[UA_HEADER] !== undefined ? { userAgent: request.headers[UA_HEADER] } : {}),
      ipAddress: request.ip,
    });
  });

  // ──────────────────────────────────────────────────────────────
  // TOKEN REFRESH
  // ──────────────────────────────────────────────────────────────
  app.post('/api/v1/auth/refresh', { schema: { ...tag, summary: 'Exchange refresh token for new access token' } }, async (request) => {
    const input = body(request, z.object({ refreshToken: z.string().min(1) }));
    return authSvc.refreshToken(input.refreshToken);
  });

  // ──────────────────────────────────────────────────────────────
  // LOGOUT
  // ──────────────────────────────────────────────────────────────
  app.post('/api/v1/auth/logout', {
    onRequest: authenticate,
    schema: { ...tag, summary: 'Revoke current session', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const input = body(request, z.object({ sessionId: z.string().optional() }));
    const sid = input.sessionId ?? (request.user as { sid?: string }).sid;
    if (sid) await authSvc.revokeSession(sid, request.user.sub);
    return reply.code(204).send();
  });

  // ──────────────────────────────────────────────────────────────
  // PASSWORD RESET
  // ──────────────────────────────────────────────────────────────
  app.post('/api/v1/auth/send-reset', { schema: { ...tag, summary: 'Request password reset email' } }, async (request, reply) => {
    const input = body(request, z.object({ email: z.string().email() }));
    await authSvc.sendPasswordReset(input.email);
    return reply.code(202).send({ message: 'If your account exists, a reset link has been sent.' });
  });

  app.post('/api/v1/auth/reset-password', { schema: { ...tag, summary: 'Apply a new password using reset token' } }, async (request) => {
    const input = body(request, z.object({
      token: z.string().min(1),
      password: z.string().min(8).max(200),
    }));
    await authSvc.resetPassword(input.token, input.password);
    return { message: 'Password reset successfully. Please log in with your new password.' };
  });

  // ──────────────────────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ──────────────────────────────────────────────────────────────
  const authSchema = { security: [{ bearerAuth: [] }] };

  app.get('/api/v1/auth/sessions', {
    onRequest: authenticate,
    schema: { ...tag, ...authSchema, summary: 'List active sessions for current user' },
  }, async (request) => {
    const currentSid = (request.user as { sid?: string }).sid;
    const sessions = await authSvc.listSessions(request.user.sub, currentSid);
    return { data: sessions };
  });

  app.delete('/api/v1/auth/sessions/:id', {
    onRequest: authenticate,
    schema: { ...tag, ...authSchema, summary: 'Revoke a specific session' },
  }, async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    await authSvc.revokeSession(id, request.user.sub);
    return reply.code(204).send();
  });

  app.delete('/api/v1/auth/sessions', {
    onRequest: authenticate,
    schema: { ...tag, ...authSchema, summary: 'Revoke all sessions (sign out everywhere)' },
  }, async (request, reply) => {
    await authSvc.revokeAllSessions(request.user.sub);
    return reply.code(204).send();
  });

  // ──────────────────────────────────────────────────────────────
  // ADMIN USER MANAGEMENT
  // ──────────────────────────────────────────────────────────────
  app.get('/api/v1/auth/users', {
    onRequest: authenticate,
    schema: { ...tag, ...authSchema, summary: 'List all users (admin only)' },
  }, async (request) => {
    if (!['city_admin'].includes(request.user.role)) {
      return { data: [await authSvc.getUser(request.user.sub)] };
    }
    return { data: await authSvc.listUsers() };
  });
}
