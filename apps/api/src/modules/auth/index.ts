// Module `auth`. Requirements: requirements/auth/spec.md
// Other modules may use only ./public.ts (types) and ./testing.ts (fakes).
import { inArray, eq } from 'drizzle-orm';
import { defineModule } from '../../core/module.js';
import { createGuards } from './guards.js';
import './public.js';
import type { AuthUser, UserDirectory } from './public.js';
import { LoginRateLimiter } from './rate-limit.js';
import { registerAuthRoutes } from './routes.js';
import { authUsers } from './schema.js';
import { SessionStore } from './sessions.js';

export default defineModule({
  name: 'auth',
  dependsOn: ['platform'],
  async register(app, ctx) {
    const sessions = new SessionStore(ctx.db, ctx.clock, ctx.config.SESSION_SECRET);
    const guards = createGuards(sessions, ctx.config);

    const publicUser = {
      id: authUsers.id,
      email: authUsers.email,
      name: authUsers.name,
      role: authUsers.role,
    };
    const users: UserDirectory = {
      async findById(id): Promise<AuthUser | null> {
        const [u] = await ctx.db.select(publicUser).from(authUsers).where(eq(authUsers.id, id));
        return u ?? null;
      },
      async findManyByIds(ids): Promise<AuthUser[]> {
        if (!ids.length) return [];
        return ctx.db.select(publicUser).from(authUsers).where(inArray(authUsers.id, ids));
      },
    };

    ctx.services.provide('auth.guards', guards);
    ctx.services.provide('auth.users', users);
    registerAuthRoutes(app, { ctx, sessions, limiter: new LoginRateLimiter(ctx.clock), guards });
  },
});
