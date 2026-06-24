import type { FastifyRequest } from 'fastify';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AirIqRepository } from '../application/ports.js';
import { ForbiddenError } from '../application/errors.js';
import type { AppConfig } from '../config.js';
import type { UserRole } from '../domain/models.js';

type RequestUser = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  sid?: string;
};

function isBearerToken(value: string | undefined): value is string {
  return Boolean(value?.startsWith('Bearer '));
}

function supabaseIssuer(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
}

export function createAuthHelpers(config: AppConfig, repository: AirIqRepository) {
  const supabaseUrl = config.SUPABASE_URL;
  const jwks = supabaseUrl
    ? createRemoteJWKSet(new URL(`${supabaseIssuer(supabaseUrl)}/.well-known/jwks.json`))
    : null;

  const hydrateUser = async (request: FastifyRequest & { user?: RequestUser }) => {
    const authHeader = request.headers.authorization;
    if (isBearerToken(authHeader) && jwks && supabaseUrl) {
      const token = authHeader.slice('Bearer '.length).trim();
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer: supabaseIssuer(supabaseUrl),
          audience: 'authenticated',
        });

        const email = String(payload.email ?? '').trim().toLowerCase();
        const localUser = email ? await repository.findUserByEmail(email) : null;
        if (localUser && !localUser.active) throw new ForbiddenError('This account has been disabled');

        request.user = {
          sub: String(payload.sub ?? localUser?.id ?? ''),
          email: email || localUser?.email || '',
          name: String((payload.user_metadata as Record<string, unknown> | undefined)?.name ?? localUser?.name ?? email ?? 'Operator'),
          role: (localUser?.role ?? ((payload.user_metadata as Record<string, unknown> | undefined)?.role as UserRole | undefined) ?? 'standard_user') as UserRole,
          active: localUser?.active ?? true,
          ...(payload.session_id ? { sid: String(payload.session_id) } : {}),
        };
        return request.user;
      } catch {
        // Fall through to the legacy JWT flow so the current auth system keeps working.
      }
    }

    await request.jwtVerify();
    return request.user as RequestUser;
  };

  const authorize = (permission: string) => async (request: FastifyRequest & { user?: RequestUser }) => {
    const user = await hydrateUser(request);
    const permissions: Record<UserRole, string[]> = {
      city_admin: ['read', 'alerts:write', 'advisories:write', 'enforcement:write', 'agents:run', 'users:read', 'uploads:write'],
      analyst: ['read', 'agents:run'],
      enforcement_officer: ['read', 'alerts:write', 'enforcement:write', 'uploads:write'],
      health_officer: ['read', 'alerts:write', 'advisories:write'],
      standard_user: ['read'],
    };
    if (!permissions[user.role].includes(permission)) throw new ForbiddenError();
    return user;
  };

  return { hydrateUser, authorize };
}