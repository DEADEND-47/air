import type { UserRole } from './domain/models.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; name: string; role: UserRole };
    user: { sub: string; email: string; name: string; role: UserRole };
  }
}
