import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { config } from '../config.js';
import { emailService } from './email-service.js';

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export async function writeAudit({ user, action, entityType, entityId, ipAddress }) {
  await db.insert(schema.auditEvents).values({
    id: id('audit'),
    userId: user?.id ?? user?.sub ?? null,
    userEmail: user?.email ?? null,
    action,
    entityType,
    entityId: entityId ?? null,
    ipAddress: ipAddress ?? null,
    createdAt: now(),
  });
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: Boolean(user.active),
    lastLoginAt: user.lastLoginAt ?? null,
    demoMode: user.email === 'demo@airiq.local',
  };
}

export class AuthService {
  signAccessToken(user) {
    return jwt.sign(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      config.JWT_SECRET,
      { expiresIn: `${config.ACCESS_TOKEN_MINUTES}m` },
    );
  }

  async createRefreshToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const record = {
      id: id('rt'),
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_DAYS * 24 * 60 * 60_000).toISOString(),
      createdAt: now(),
    };
    await db.insert(schema.refreshTokens).values(record);
    return token;
  }

  async register(input) {
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, input.email.toLowerCase())).get();
    if (existing) {
      const error = new Error('An account with this email already exists');
      error.status = 409;
      throw error;
    }
    const user = {
      id: id('usr'),
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      role: input.role ?? 'viewer',
      passwordHash: await bcrypt.hash(input.password, 10),
      active: true,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.insert(schema.users).values(user);
    await emailService.sendWelcome(user);
    return {
      user: safeUser(user),
      accessToken: this.signAccessToken(user),
      refreshToken: await this.createRefreshToken(user.id),
      expiresIn: config.ACCESS_TOKEN_MINUTES * 60,
    };
  }

  async login(email, password, ipAddress) {
    const user = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).get();
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }
    const lastLoginAt = now();
    await db.update(schema.users).set({ lastLoginAt, updatedAt: lastLoginAt }).where(eq(schema.users.id, user.id));
    const signedUser = { ...user, lastLoginAt };
    await writeAudit({ user: signedUser, action: 'login', entityType: 'user', entityId: user.id, ipAddress });
    return {
      user: safeUser(signedUser),
      accessToken: this.signAccessToken(signedUser),
      refreshToken: await this.createRefreshToken(user.id),
      expiresIn: config.ACCESS_TOKEN_MINUTES * 60,
    };
  }

  async refresh(refreshToken) {
    const tokenHash = sha256(refreshToken);
    const record = await db.select().from(schema.refreshTokens).where(and(
      eq(schema.refreshTokens.tokenHash, tokenHash),
      isNull(schema.refreshTokens.revokedAt),
      gt(schema.refreshTokens.expiresAt, now()),
    )).get();
    if (!record) {
      const error = new Error('Invalid refresh token');
      error.status = 401;
      throw error;
    }
    const user = await db.select().from(schema.users).where(eq(schema.users.id, record.userId)).get();
    if (!user || !user.active) {
      const error = new Error('User is inactive');
      error.status = 401;
      throw error;
    }
    return { accessToken: this.signAccessToken(user), expiresIn: config.ACCESS_TOKEN_MINUTES * 60 };
  }

  async logout(refreshToken) {
    if (!refreshToken) return;
    await db.update(schema.refreshTokens)
      .set({ revokedAt: now() })
      .where(eq(schema.refreshTokens.tokenHash, sha256(refreshToken)));
  }

  async sendPasswordReset(email, origin = 'http://localhost:5173') {
    const user = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).get();
    if (!user) return;
    const token = crypto.randomBytes(24).toString('hex');
    await db.update(schema.users).set({
      resetTokenHash: sha256(token),
      resetTokenExpiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      updatedAt: now(),
    }).where(eq(schema.users.id, user.id));
    await emailService.sendPasswordReset(user, `${origin}/reset-password?token=${token}`);
  }

  async resetPassword(token, password) {
    const user = await db.select().from(schema.users).where(and(
      eq(schema.users.resetTokenHash, sha256(token)),
      gt(schema.users.resetTokenExpiresAt, now()),
    )).get();
    if (!user) {
      const error = new Error('Reset token is invalid or expired');
      error.status = 400;
      throw error;
    }
    await db.update(schema.users).set({
      passwordHash: await bcrypt.hash(password, 10),
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      updatedAt: now(),
    }).where(eq(schema.users.id, user.id));
  }

  async listUsers() {
    return (await db.select().from(schema.users)).map(safeUser);
  }

  async getProfile(userId) {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return safeUser(user);
  }

  async updateProfile(userId, input) {
    const name = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
    await db.update(schema.users).set({ name, updatedAt: now() }).where(eq(schema.users.id, userId));
    await writeAudit({ user: { id: userId }, action: 'profile.update', entityType: 'user', entityId: userId });
    return this.getProfile(userId);
  }

  async changePassword(userId, input) {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      const error = new Error('Current password is incorrect');
      error.status = 400;
      throw error;
    }
    await db.update(schema.users).set({
      passwordHash: await bcrypt.hash(input.newPassword, 10),
      updatedAt: now(),
    }).where(eq(schema.users.id, userId));
    await writeAudit({ user: { id: userId }, action: 'password.change', entityType: 'user', entityId: userId });
    return { message: 'Password changed successfully.' };
  }
}

export const authService = new AuthService();

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: { message: 'Missing bearer token', code: 'UNAUTHORIZED' } });
  try {
    req.user = jwt.verify(header.slice('Bearer '.length), config.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: { message: 'Invalid token', code: 'UNAUTHORIZED' } });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } });
    return next();
  };
}

export function rejectDemoWrites(req, res, next) {
  if (req.user?.email === 'demo@airiq.local') {
    return res.status(403).json({ error: { message: 'Demo mode is read-only', code: 'DEMO_READ_ONLY' } });
  }
  return next();
}
