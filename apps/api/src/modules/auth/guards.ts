// AUTH-005 — route guards provided to every module as service `auth.guards`.
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../../core/config.js';
import { AppError } from '../../core/errors.js';
import type { AuthGuards } from './public.js';
import type { SessionStore } from './sessions.js';

export const SESSION_COOKIE = 'sid';

export function cookieOptions(config: Config, expiresAt: Date) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.NODE_ENV !== 'development',
    expires: expiresAt,
  };
}

export function createGuards(sessions: SessionStore, config: Config): AuthGuards {
  async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const sid = request.cookies[SESSION_COOKIE];
    const resolved = sid ? await sessions.resolve(sid) : null;
    if (!sid || !resolved) {
      if (sid) reply.clearCookie(SESSION_COOKIE, { path: '/' });
      throw new AppError('UNAUTHENTICATED', 401, 'Please log in');
    }
    if (resolved.extended)
      reply.setCookie(SESSION_COOKIE, sid, cookieOptions(config, resolved.expiresAt));
    request.user = resolved.user;
    return resolved.user;
  }

  return {
    async requireUser(request, reply) {
      await authenticate(request, reply);
    },
    async requireAdmin(request, reply) {
      const user = await authenticate(request, reply);
      if (user.role !== 'admin') throw new AppError('FORBIDDEN', 403, 'Admins only');
    },
  };
}
