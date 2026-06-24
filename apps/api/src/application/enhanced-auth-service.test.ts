import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EnhancedAuthService } from './enhanced-auth-service.js';
import { InMemoryAirIqRepository } from '../infrastructure/in-memory-repository.js';
import { AppError } from './errors.js';

describe('EnhancedAuthService', () => {
  let repository: InMemoryAirIqRepository;
  let service: EnhancedAuthService;
  const mockEmailService = {
    sendOtp: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    sendWelcome: vi.fn().mockResolvedValue(undefined),
  };
  const mockSignJwt = vi.fn().mockReturnValue('mocked-jwt-token');

  beforeEach(async () => {
    vi.clearAllMocks();
    repository = await InMemoryAirIqRepository.create();
    service = new EnhancedAuthService(repository, mockEmailService as any, mockSignJwt);
  });

  describe('registration & verification flow', () => {
    it('should register a new user successfully and send an OTP code', async () => {
      const result = await service.register({
        name: 'Jane Doe',
        email: 'jane@airiq.city',
        password: 'SecurePassword123!',
        role: 'standard_user',
      });

      expect(result.userId).toBeDefined();
      expect(result.message).toContain('Account created');
      
      const user = await repository.findUserByEmail('jane@airiq.city');
      expect(user).toBeDefined();
      expect(user?.name).toBe('Jane Doe');
      expect(user?.emailVerified).toBe(false);
      expect(mockEmailService.sendOtp).toHaveBeenCalledWith('jane@airiq.city', expect.any(String), 'verify_email');
    });

    it('should throw error when registering with an existing email', async () => {
      await expect(
        service.register({
          name: 'Admin Duplicate',
          email: 'admin@airiq.city', // Already seeded
          password: 'Password123!',
        })
      ).rejects.toThrowError(new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN'));
    });

    it('should verify email successfully with correct OTP', async () => {
      await service.register({
        name: 'Bob Ross',
        email: 'bob@airiq.city',
        password: 'HappyLittleTrees123!',
      });

      // Find the created OTP from memory repo
      const otps = repository['otpCodes'];
      const activeOtp = otps.find((o) => o.email === 'bob@airiq.city');
      expect(activeOtp).toBeDefined();

      // Retrieve mock otp value sent to email service
      const sentCode = mockEmailService.sendOtp.mock.calls[0]![1] as string;
      
      const verifyResult = await service.verifyEmail('bob@airiq.city', sentCode);

      expect(verifyResult.message).toContain('verified successfully');
      const user = await repository.findUserByEmail('bob@airiq.city');
      expect(user?.emailVerified).toBe(true);
    });

    it('should enforce resend cooldown and OTP issuance rate limiting', async () => {
      await vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-24T10:00:00.000Z'));

      await service.register({
        name: 'Cooldown User',
        email: 'cooldown@airiq.city',
        password: 'SecurePassword123!',
      });

      await expect(service.resendVerificationOtp('cooldown@airiq.city')).rejects.toThrowError(
        new AppError('Please wait 60 second(s) before requesting another code.', 429, 'OTP_RESEND_COOLDOWN'),
      );

      vi.setSystemTime(new Date('2026-06-24T10:01:01.000Z'));
      await expect(service.resendVerificationOtp('cooldown@airiq.city')).resolves.toBeUndefined();

      const loginEmail = 'admin@airiq.city';
      for (let i = 0; i < 5; i++) {
        await service.sendLoginOtp(loginEmail);
        vi.setSystemTime(new Date(Date.now() + 61_000));
      }

      await expect(service.sendLoginOtp(loginEmail)).rejects.toThrowError(
        new AppError('Too many OTP requests. Please try again later.', 429, 'OTP_RATE_LIMITED'),
      );

      vi.useRealTimers();
    });
  });

  describe('login flow', () => {
    it('should authenticate a valid active user and return JWT + session info', async () => {
      const loginResult = await service.login({
        email: 'admin@airiq.city',
        password: 'AirIQ!2026',
        rememberMe: true,
        deviceName: 'Test Phone',
      });

      expect(loginResult.accessToken).toBe('mocked-jwt-token');
      expect(loginResult.user.email).toBe('admin@airiq.city');
      expect(loginResult.sessionId).toBeDefined();
    });

    it('should track failed attempts and lock out user after maximum attempts', async () => {
      const email = 'admin@airiq.city';
      
      // Attempt login with wrong password multiple times
      for (let i = 0; i < 5; i++) {
        await expect(
          service.login({ email, password: 'wrongPassword' })
        ).rejects.toThrow();
      }

      // 6th attempt should trigger lock out
      await expect(
        service.login({ email, password: 'wrongPassword' })
      ).rejects.toThrowError(/Account locked\. Try again in/);
    });
  });

  describe('sessions management', () => {
    it('should list and revoke active sessions', async () => {
      const loginResult = await service.login({
        email: 'admin@airiq.city',
        password: 'AirIQ!2026',
        rememberMe: true,
        deviceName: 'Device A',
      });

      const user = await repository.findUserByEmail('admin@airiq.city');
      const sessions = await service.listSessions(user!.id);
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0]!.deviceName).toBe('Device A');

      await service.revokeSession(loginResult.sessionId, user!.id);
      
      const sessionAfterRevocation = await repository.findSession(loginResult.sessionId);
      expect(sessionAfterRevocation?.revokedAt).toBeDefined();
    });
  });
});
