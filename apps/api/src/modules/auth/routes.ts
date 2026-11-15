// HTTP endpoints of module `auth` (AUTH-001..004, AUTH-008).
import { LoginRequest, RegisterRequest, type User, type UserResponse } from '@pilates/contracts';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { AppError } from '../../core/errors.js';
import { isUniqueViolation, newId } from '../../core/ids.js';
import type { ModuleContext } from '../../core/module.js';
import { parse } from '../../core/validation.js';
import { SESSION_COOKIE, cookieOptions } from './guards.js';
import { hashPassword, verifyPassword } from './passwords.js';
import type { AuthGuards } from './public.js';
import type { LoginRateLimiter } from './rate-limit.js';
import { authUsers } from './schema.js';
import type { SessionStore } from './sessions.js';

interface Deps {
  ctx: ModuleContext;
  sessions: SessionStore;
  limiter: LoginRateLimiter;
  guards: AuthGuards;
}

export function registerAuthRoutes(app: FastifyInstance, { ctx, sessions, limiter, guards }: Deps) {
  const { db, clock, config } = ctx;

  async function startSession(reply: FastifyReply, user: User) {
    const { sid, expiresAt } = await sessions.create(user);
    reply.setCookie(SESSION_COOKIE, sid, cookieOptions(config, expiresAt));
  }

  app.post('/api/auth/register', async (request, reply): Promise<UserResponse> => {
    const input = parse(RegisterRequest, request.body);
    const taken = () =>
      new AppError('EMAIL_TAKEN', 409, 'An account with this email already exists');
    const [existing] = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.email, input.email));
    if (existing) throw taken();

    const user: User = { id: newId(), email: input.email, name: input.name, role: 'member' };
    try {
      await db.insert(authUsers).values({
        ...user,
        passwordHash: await hashPassword(input.password),
        createdAt: clock.now(),
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw taken(); // concurrent registration
      throw err;
    }
    await startSession(reply, user);
    reply.status(201);
    return { user };
  });

  app.post('/api/auth/login', async (request, reply): Promise<UserResponse> => {
    const { email, password } = parse(LoginRequest, request.body);
    if (limiter.isBlocked(email)) {
      throw new AppError('RATE_LIMITED', 429, 'Too many failed attempts. Try again in 15 minutes.');
    }
    const [row] = await db.select().from(authUsers).where(eq(authUsers.email, email));
    if (!(await verifyPassword(row?.passwordHash ?? null, password)) || !row) {
      limiter.recordFailure(email);
      throw new AppError('INVALID_CREDENTIALS', 401, 'Email or password is incorrect');
    }
    limiter.reset(email);
    const user: User = { id: row.id, email: row.email, name: row.name, role: row.role };
    await startSession(reply, user);
    return { user };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const sid = request.cookies[SESSION_COOKIE];
    if (sid) await sessions.destroy(sid);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    reply.status(204).send();
  });

  app.get(
    '/api/auth/me',
    { preHandler: guards.requireUser },
    async (request): Promise<UserResponse> => ({
      user: request.user!,
    }),
  );
}
