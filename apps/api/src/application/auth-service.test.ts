import { describe, expect, it } from 'vitest';
import { AuthService, can } from './auth-service.js';
import { InMemoryAirIqRepository } from '../infrastructure/in-memory-repository.js';
import { AppError, ForbiddenError } from './errors.js';

describe('AuthService & Permissions', () => {
  it('should authenticate a valid active user and return safe user info', async () => {
    const repository = await InMemoryAirIqRepository.create();
    const service = new AuthService(repository);

    // Default seeded user: admin@airiq.city / AirIQ!2026
    const result = await service.authenticate('admin@airiq.city', 'AirIQ!2026');
    expect(result).toBeDefined();
    expect(result.email).toBe('admin@airiq.city');
    expect(result.role).toBe('city_admin');
    expect(result.active).toBe(true);
    // Safe user should not contain password hash
    expect('passwordHash' in result).toBe(false);
  });

  it('should throw an error for invalid email or password', async () => {
    const repository = await InMemoryAirIqRepository.create();
    const service = new AuthService(repository);

    await expect(service.authenticate('admin@airiq.city', 'WrongPassword')).rejects.toThrowError(
      new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    );

    await expect(service.authenticate('nonexistent@airiq.city', 'AirIQ!2026')).rejects.toThrowError(
      new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    );
  });

  it('should throw ForbiddenError for disabled user accounts', async () => {
    const repository = await InMemoryAirIqRepository.create();
    const service = new AuthService(repository);

    // Fetch and deactivate the user
    const users = await repository.listUsers();
    const user = users[0];
    expect(user).toBeDefined();
    if (user) {
      await repository.updateUser(user.id, { active: false });

      await expect(service.authenticate(user.email, 'AirIQ!2026')).rejects.toThrowError(
        new ForbiddenError('This account has been disabled')
      );
    }
  });

  it('should list all operators in the repository', async () => {
    const repository = await InMemoryAirIqRepository.create();
    const service = new AuthService(repository);

    const list = await service.listUsers();
    expect(list.length).toBeGreaterThan(0);
    const firstUser = list[0];
    expect(firstUser).toBeDefined();
    if (firstUser) {
      expect(firstUser.email).toBeDefined();
      expect('passwordHash' in firstUser).toBe(false);
    }
  });

  it('should correctly evaluate role-based permission requirements', () => {
    // city_admin checks
    expect(can('city_admin', 'alerts:write')).toBe(true);
    expect(can('city_admin', 'agents:run')).toBe(true);
    expect(can('city_admin', 'users:read')).toBe(true);

    // analyst checks
    expect(can('analyst', 'read')).toBe(true);
    expect(can('analyst', 'agents:run')).toBe(true);
    expect(can('analyst', 'alerts:write')).toBe(false);

    // enforcement_officer checks
    expect(can('enforcement_officer', 'enforcement:write')).toBe(true);
    expect(can('enforcement_officer', 'advisories:write')).toBe(false);

    // health_officer checks
    expect(can('health_officer', 'advisories:write')).toBe(true);
    expect(can('health_officer', 'enforcement:write')).toBe(false);
  });
});
