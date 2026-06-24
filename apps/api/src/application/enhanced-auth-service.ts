import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { nanoid } from 'nanoid';
import type { AirIqRepository } from './ports.js';
import type { OtpPurpose, User, UserRole } from '../domain/models.js';
import { AppError, ForbiddenError } from './errors.js';
import type { IEmailService } from './email-service.js';

const BCRYPT_ROUNDS = 12;
const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60_000;
const OTP_ISSUE_WINDOW_MS = 15 * 60_000;
const OTP_ISSUE_LIMIT = 5;
const RESET_TOKEN_BYTES = 32;
const RESET_TTL_HOURS = 1;
const ACCESS_TOKEN_TTL_SECONDS = 8 * 60 * 60;       // 8 hours
const REFRESH_TTL_DAYS = 7;                           // "Remember Me"
const DEFAULT_SESSION_TTL_DAYS = 1;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  emailVerified: boolean;
  phone?: string;
  avatarUrl?: string;
}

export interface LoginResult {
  user: SafeUser;
  accessToken: string;
  refreshToken?: string;
  sessionId: string;
  expiresIn: number;
}

export interface SessionInfo {
  id: string;
  deviceName: string;
  ipAddress?: string | undefined;
  rememberMe: boolean;
  lastActiveAt: string;
  expiresAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export const safeUser = (user: User): SafeUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  active: user.active,
  emailVerified: user.emailVerified,
  ...(user.phone ? { phone: user.phone } : {}),
  ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
});

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateOtp(): string {
  // Cryptographically random 6-digit code
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, '0');
}

export class EnhancedAuthService {
  private readonly otpLastIssuedAt = new Map<string, number>();
  private readonly otpIssueHistory = new Map<string, number[]>();

  constructor(
    private readonly repository: AirIqRepository,
    private readonly emailSvc: IEmailService,
    private readonly signJwt: (payload: object, ttl: string | number) => string,
  ) {}

  // ──────────────────────────────────────────────────────────────
  // REGISTRATION
  // ──────────────────────────────────────────────────────────────

  async register(params: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<{ userId: string; message: string }> {
    const { name, email, password, role = 'standard_user' } = params;

    // Validate password strength
    if (password.length < 8) throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
    if (!/[A-Z]/.test(password)) throw new AppError('Password must contain an uppercase letter', 400, 'WEAK_PASSWORD');
    if (!/[0-9]/.test(password)) throw new AppError('Password must contain a number', 400, 'WEAK_PASSWORD');

    const existing = await this.repository.findUserByEmail(email);
    if (existing) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');

    const passwordHash = await hash(password, BCRYPT_ROUNDS);
    const user = await this.repository.createUser({
      id: nanoid(),
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role,
      passwordHash,
      active: true,
      emailVerified: false,
      failedAttempts: 0,
    });

    // Send OTP for email verification
    await this.sendOtp(email, 'verify_email', user.id);

    return { userId: user.id, message: 'Account created. Check your email for a verification code.' };
  }

  // ──────────────────────────────────────────────────────────────
  // EMAIL VERIFICATION
  // ──────────────────────────────────────────────────────────────

  async verifyEmail(email: string, code: string): Promise<{ message: string }> {
    const otp = await this.repository.findActiveOtp(email.toLowerCase(), 'verify_email');
    if (!otp) throw new AppError('No active verification code. Request a new one.', 400, 'OTP_NOT_FOUND');

    if (new Date(otp.expiresAt) < new Date()) {
      throw new AppError('Verification code has expired. Request a new one.', 400, 'OTP_EXPIRED');
    }
    if (otp.attempts >= otp.maxAttempts) {
      throw new AppError('Too many failed attempts. Request a new code.', 429, 'OTP_MAX_ATTEMPTS');
    }

    const codeHash = hashToken(code);
    if (codeHash !== otp.codeHash) {
      await this.repository.incrementOtpAttempts(otp.id);
      throw new AppError('Invalid verification code.', 400, 'OTP_INVALID');
    }

    await this.repository.consumeOtp(otp.id);
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (user) {
      await this.repository.updateUser(user.id, { emailVerified: true });
      await this.emailSvc.sendWelcome(email, user.name);
    }

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerificationOtp(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (!user) return; // Silent: don't reveal whether account exists
    if (user.emailVerified) throw new AppError('Email is already verified.', 400, 'ALREADY_VERIFIED');
    await this.sendOtp(email, 'verify_email', user.id);
  }

  // ──────────────────────────────────────────────────────────────
  // LOGIN
  // ──────────────────────────────────────────────────────────────

  async login(params: {
    email: string;
    password: string;
    rememberMe?: boolean;
    deviceName?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<LoginResult> {
    const { email, password, rememberMe = false, deviceName = 'Unknown Device', userAgent, ipAddress } = params;

    const user = await this.repository.findUserByEmail(email.toLowerCase());

    // Rate-limit: check lockout before touching failed_attempts
    if (user?.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remaining = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60_000);
      throw new AppError(`Account locked. Try again in ${remaining} minute(s).`, 429, 'ACCOUNT_LOCKED');
    }

    if (!user || !(await compare(password, user.passwordHash))) {
      if (user) {
        const newAttempts = (user.failedAttempts ?? 0) + 1;
        const updates: Partial<User> = { failedAttempts: newAttempts };
        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          updates.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
        }
        await this.repository.updateUser(user.id, updates);
      }
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.active) throw new ForbiddenError('Account is disabled. Contact your administrator.');

    // Reset failed attempts on successful login
    await this.repository.updateUser(user.id, {
      failedAttempts: 0,
      lockedUntil: undefined,
      lastLoginAt: new Date().toISOString(),
    });

    return this.createSession(user, { rememberMe, deviceName, userAgent, ipAddress });
  }

  async loginWithOtp(params: {
    email: string;
    code: string;
    deviceName?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<LoginResult> {
    const { email, code, deviceName = 'Unknown Device', userAgent, ipAddress } = params;

    const otp = await this.repository.findActiveOtp(email.toLowerCase(), 'login_otp');
    if (!otp) throw new AppError('No active OTP. Request a new login code.', 400, 'OTP_NOT_FOUND');
    if (new Date(otp.expiresAt) < new Date()) throw new AppError('OTP has expired.', 400, 'OTP_EXPIRED');
    if (otp.attempts >= otp.maxAttempts) throw new AppError('Too many attempts. Request a new code.', 429, 'OTP_MAX_ATTEMPTS');

    const codeHash = hashToken(code);
    if (codeHash !== otp.codeHash) {
      await this.repository.incrementOtpAttempts(otp.id);
      throw new AppError('Invalid code.', 400, 'OTP_INVALID');
    }

    await this.repository.consumeOtp(otp.id);
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (!user || !user.active) throw new ForbiddenError('Account not found or disabled.');

    await this.repository.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    return this.createSession(user, { rememberMe: false, deviceName, userAgent, ipAddress });
  }

  async sendLoginOtp(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (!user || !user.active) return; // Silent
    await this.sendOtp(email, 'login_otp', user.id);
  }

  // ──────────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ──────────────────────────────────────────────────────────────

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const session = await this.repository.findSessionByRefreshToken(refreshToken);
    if (!session) throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    if (session.revokedAt) throw new AppError('Session has been revoked.', 401, 'SESSION_REVOKED');
    if (new Date(session.expiresAt) < new Date()) throw new AppError('Session expired. Please log in again.', 401, 'SESSION_EXPIRED');

    const user = await this.repository.findUserById(session.userId);
    if (!user || !user.active) throw new ForbiddenError('Account not found or disabled.');

    await this.repository.touchSession(session.id);

    const accessToken = this.signJwt(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      ACCESS_TOKEN_TTL_SECONDS,
    );

    return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  // ──────────────────────────────────────────────────────────────
  // PASSWORD RESET
  // ──────────────────────────────────────────────────────────────

  async sendPasswordReset(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (!user) return; // Silent: don't reveal account existence

    // Invalidate previous reset tokens
    await this.repository.invalidatePreviousResets(user.id);

    const token = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60_000).toISOString();

    await this.repository.createPasswordReset({ userId: user.id, tokenHash, expiresAt });

    const resetUrl = `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/reset-password?token=${token}`;
    await this.emailSvc.sendPasswordReset(email, resetUrl, user.name);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
    if (!/[A-Z]/.test(newPassword)) throw new AppError('Password must contain an uppercase letter', 400, 'WEAK_PASSWORD');
    if (!/[0-9]/.test(newPassword)) throw new AppError('Password must contain a number', 400, 'WEAK_PASSWORD');

    const tokenHash = hashToken(token);
    const reset = await this.repository.findPasswordReset(tokenHash);
    if (!reset) throw new AppError('Invalid or expired reset link.', 400, 'INVALID_RESET_TOKEN');
    if (reset.consumedAt) throw new AppError('This reset link has already been used.', 400, 'RESET_ALREADY_USED');
    if (new Date(reset.expiresAt) < new Date()) throw new AppError('Reset link has expired.', 400, 'RESET_EXPIRED');

    const passwordHash = await hash(newPassword, BCRYPT_ROUNDS);
    await this.repository.updateUser(reset.userId, { passwordHash, failedAttempts: 0, lockedUntil: undefined });
    await this.repository.consumePasswordReset(reset.id);

    // Revoke all existing sessions for security
    await this.repository.revokeAllUserSessions(reset.userId);
  }

  // ──────────────────────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ──────────────────────────────────────────────────────────────

  async listSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
    const sessions = await this.repository.listUserSessions(userId);
    return sessions
      .filter((s) => !s.revokedAt && new Date(s.expiresAt) > new Date())
      .map((s) => ({
        id: s.id,
        deviceName: s.deviceName,
        ...(s.ipAddress !== undefined ? { ipAddress: s.ipAddress } : {}),
        rememberMe: s.rememberMe,
        lastActiveAt: s.lastActiveAt,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        isCurrent: s.id === currentSessionId,
      } satisfies SessionInfo));
  }

  async revokeSession(sessionId: string, requestingUserId: string): Promise<void> {
    const session = await this.repository.findSession(sessionId);
    if (!session) throw new AppError('Session not found.', 404, 'SESSION_NOT_FOUND');
    if (session.userId !== requestingUserId) throw new ForbiddenError('Cannot revoke another user\'s session.');
    await this.repository.revokeSession(sessionId);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.repository.revokeAllUserSessions(userId);
  }

  // ──────────────────────────────────────────────────────────────
  // ADMIN
  // ──────────────────────────────────────────────────────────────

  async listUsers(): Promise<SafeUser[]> {
    return (await this.repository.listUsers()).map(safeUser);
  }

  async getUser(id: string): Promise<SafeUser> {
    const user = await this.repository.findUserById(id);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    return safeUser(user);
  }

  async deactivateUser(targetId: string, adminId: string): Promise<void> {
    if (targetId === adminId) throw new AppError('Cannot deactivate yourself.', 400, 'SELF_DEACTIVATE');
    await this.repository.updateUser(targetId, { active: false });
    await this.repository.revokeAllUserSessions(targetId);
  }

  // ──────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────

  private async sendOtp(email: string, purpose: OtpPurpose, userId?: string): Promise<void> {
    this.assertOtpIssuanceAllowed(email, purpose);
    await this.repository.invalidatePreviousOtps(email.toLowerCase(), purpose);
    const code = generateOtp();
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();
    await this.repository.createOtp({
      email: email.toLowerCase(),
      ...(userId !== undefined ? { userId } : {}),
      codeHash,
      purpose,
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt,
    });
    await this.emailSvc.sendOtp(email, code, purpose);
  }


  private assertOtpIssuanceAllowed(email: string, purpose: OtpPurpose): void {
    const key = this.otpIssueKey(email, purpose);
    const now = Date.now();

    const lastIssuedAt = this.otpLastIssuedAt.get(key);
    if (lastIssuedAt !== undefined) {
      const elapsed = now - lastIssuedAt;
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new AppError(`Please wait ${remainingSeconds} second(s) before requesting another code.`, 429, 'OTP_RESEND_COOLDOWN');
      }
    }

    const windowStart = now - OTP_ISSUE_WINDOW_MS;
    const history = (this.otpIssueHistory.get(key) ?? []).filter((timestamp) => timestamp >= windowStart);
    if (history.length >= OTP_ISSUE_LIMIT) {
      throw new AppError('Too many OTP requests. Please try again later.', 429, 'OTP_RATE_LIMITED');
    }

    history.push(now);
    this.otpIssueHistory.set(key, history);
    this.otpLastIssuedAt.set(key, now);
  }

  private otpIssueKey(email: string, purpose: OtpPurpose): string {
    return `${email.toLowerCase()}::${purpose}`;
  }
  private async createSession(
    user: User,
    opts: { rememberMe: boolean; deviceName: string; userAgent?: string | undefined; ipAddress?: string | undefined },
  ): Promise<LoginResult> {
    const ttlDays = opts.rememberMe ? REFRESH_TTL_DAYS : DEFAULT_SESSION_TTL_DAYS;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60_000).toISOString();
    const refreshToken = randomBytes(32).toString('hex');
    const sessionId = nanoid();

    await this.repository.createSession({
      id: sessionId,
      userId: user.id,
      refreshToken,
      deviceName: opts.deviceName,
      ...(opts.userAgent !== undefined ? { userAgent: opts.userAgent } : {}),
      ...(opts.ipAddress !== undefined ? { ipAddress: opts.ipAddress } : {}),
      rememberMe: opts.rememberMe,
      expiresAt,
    });

    const accessToken = this.signJwt(
      { sub: user.id, email: user.email, name: user.name, role: user.role, sid: sessionId },
      ACCESS_TOKEN_TTL_SECONDS,
    );

    return {
      user: safeUser(user),
      accessToken,
      ...(opts.rememberMe ? { refreshToken } : {}),
      sessionId,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}

// Legacy compatibility: simple permission map used by existing route guards
const permissions: Record<string, string[]> = {
  city_admin:          ['read', 'alerts:write', 'advisories:write', 'enforcement:write', 'agents:run', 'users:read', 'uploads:write'],
  analyst:             ['read', 'agents:run'],
  enforcement_officer: ['read', 'alerts:write', 'enforcement:write', 'uploads:write'],
  health_officer:      ['read', 'alerts:write', 'advisories:write'],
  standard_user:       ['read'],
};

export function can(role: string, permission: string): boolean {
  return (permissions[role] ?? []).includes(permission);
}
