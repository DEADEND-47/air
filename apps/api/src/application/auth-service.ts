import { compare } from 'bcryptjs';
import type { AirIqRepository } from './ports.js';
import type { User, UserRole } from '../domain/models.js';
import { AppError, ForbiddenError } from './errors.js';

export interface SafeUser { id: string; email: string; name: string; role: UserRole; active: boolean }
export const safeUser = (user: User): SafeUser => ({ id: user.id, email: user.email, name: user.name, role: user.role, active: user.active });

export class AuthService {
  constructor(private readonly repository: AirIqRepository) {}

  async authenticate(email: string, password: string): Promise<SafeUser> {
    const user = await this.repository.findUserByEmail(email);
    if (!user || !(await compare(password, user.passwordHash))) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    if (!user.active) throw new ForbiddenError('This account has been disabled');
    return safeUser(user);
  }

  async listUsers(): Promise<SafeUser[]> {
    return (await this.repository.listUsers()).map(safeUser);
  }
}

const permissions: Record<UserRole, string[]> = {
  city_admin: ['read', 'alerts:write', 'advisories:write', 'enforcement:write', 'agents:run', 'users:read', 'uploads:write'],
  analyst: ['read', 'agents:run'],
  enforcement_officer: ['read', 'alerts:write', 'enforcement:write', 'uploads:write'],
  health_officer: ['read', 'alerts:write', 'advisories:write'],
  standard_user: ['read'],
};

export function can(role: UserRole, permission: string): boolean {
  return permissions[role].includes(permission);
}
