// Requirements: requirements/auth/spec.md
import cookie from '@fastify/cookie';
import { ErrorResponseSchema, UserResponse } from '@pilates/contracts';
import { eq } from 'drizzle-orm';
import Fastify, { type LightMyRequestResponse } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { registerErrorHandling } from '../../../core/errors.js';
import { TEST_ENV, buildTestApp, type TestApp } from '../../../../test/helpers.js';
import { createAdmin, parseCreateAdminArgs } from '../admin.js';
import { authSessions, authUsers } from '../schema.js';

const ORIGIN = { origin: TEST_ENV.WEB_ORIGIN };
const PASSWORD = 'correct horse battery';

let t: TestApp;
afterEach(async () => t?.close());

const start = async () => (t = await buildTestApp({ modules: ['auth'] }));

function sidOf(res: LightMyRequestResponse): string | undefined {
  return res.cookies.find((c) => c.name === 'sid')?.value;
}
const withSid = (sid: string | undefined) => ({ ...ORIGIN, cookie: `sid=${sid}` });

async function register(email = 'ann@example.com', password = PASSWORD, extra: object = {}) {
  return t.app.inject({
    method: 'POST',
    url: '/api/auth/register',
    headers: ORIGIN,
    payload: { name: 'Ann', email, password, ...extra },
  });
}
async function login(email: string, password = PASSWORD) {
  return t.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: ORIGIN,
    payload: { email, password },
  });
}
const me = (sid: string | undefined) =>
  t.app.inject({ method: 'GET', url: '/api/auth/me', headers: withSid(sid) });

describe('AUTH-001 — Member registration', () => {
  it('[AUTH-001/AC1] creates a member, returns 201 without password data, and logs in', async () => {
    await start();
    const res = await register();
    expect(res.statusCode).toBe(201);
    const { user } = UserResponse.parse(res.json());
    expect(user).toMatchObject({ email: 'ann@example.com', name: 'Ann', role: 'member' });
    expect(res.body).not.toMatch(/password|hash/i);
    expect((await me(sidOf(res))).statusCode).toBe(200);
  });

  it('[AUTH-001/AC2] emails are normalised; an existing email in any case → 409 EMAIL_TAKEN', async () => {
    await start();
    expect((await register('  Ann@Example.com ')).json().user.email).toBe('ann@example.com');
    const again = await register('ANN@example.COM');
    expect(again.statusCode).toBe(409);
    expect(ErrorResponseSchema.parse(again.json()).error.code).toBe('EMAIL_TAKEN');
  });

  it('[AUTH-001/AC3] short password or invalid email → 400 VALIDATION_ERROR', async () => {
    await start();
    for (const res of [
      await register('ann@example.com', 'short'),
      await register('not-an-email'),
    ]) {
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('[AUTH-001/AC4] passwords are stored only as an argon2id hash', async () => {
    await start();
    await register();
    const [row] = await t.ctx.db.select().from(authUsers);
    expect(row?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(row)).not.toContain(PASSWORD);
  });
});

describe('AUTH-002 — Login', () => {
  it('[AUTH-002/AC1] correct credentials → 200 with the user and a secure session cookie', async () => {
    await start();
    await register();
    const res = await login('ANN@example.com');
    expect(res.statusCode).toBe(200);
    expect(UserResponse.parse(res.json()).user.email).toBe('ann@example.com');
    const c = res.cookies.find((x) => x.name === 'sid');
    expect(c).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
    expect(c?.secure).toBe(true); // NODE_ENV=test is not development
    expect((await me(c?.value)).json().user.email).toBe('ann@example.com');
  });

  it('[AUTH-002/AC2] wrong password and unknown email → identical 401 INVALID_CREDENTIALS', async () => {
    await start();
    await register();
    const wrong = await login('ann@example.com', 'wrong password!!');
    const unknown = await login('nobody@example.com', 'wrong password!!');
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.body).toBe(unknown.body);
    expect(wrong.json().error.code).toBe('INVALID_CREDENTIALS');
    expect(sidOf(wrong)).toBeUndefined();
  });
});

describe('AUTH-003 — Logout', () => {
  it('[AUTH-003/AC1] deletes the session server-side and clears the cookie (204)', async () => {
    await start();
    const sid = sidOf(await register());
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: withSid(sid),
    });
    expect(res.statusCode).toBe(204);
    const cleared = res.cookies.find((c) => c.name === 'sid');
    expect(cleared?.value).toBe('');
    expect(await t.ctx.db.select().from(authSessions)).toHaveLength(0);
  });

  it('[AUTH-003/AC2] a logged-out session id gets 401 afterwards', async () => {
    await start();
    const sid = sidOf(await register());
    await t.app.inject({ method: 'POST', url: '/api/auth/logout', headers: withSid(sid) });
    expect((await me(sid)).statusCode).toBe(401);
  });
});

describe('AUTH-004 — Current user', () => {
  it('[AUTH-004/AC1] GET /api/auth/me returns { id, email, name, role }', async () => {
    await start();
    const sid = sidOf(await register());
    const res = await me(sid);
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json().user).sort()).toEqual(['email', 'id', 'name', 'role']);
  });

  it('[AUTH-004/AC2] without a valid session → 401 UNAUTHENTICATED', async () => {
    await start();
    for (const res of [
      await t.app.inject({ method: 'GET', url: '/api/auth/me' }),
      await me('made-up-session-id'),
    ]) {
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHENTICATED');
    }
  });
});

describe('AUTH-005 — Role-based access control', () => {
  /** Mount the guards on probe routes, exactly as another module would. */
  async function probe() {
    const guards = t.ctx.services.require('auth.guards');
    const app = Fastify();
    registerErrorHandling(app);
    await app.register(cookie);
    app.get('/api/admin/probe', { preHandler: guards.requireAdmin }, async (req) => ({
      user: req.user,
    }));
    app.get('/api/probe', { preHandler: guards.requireUser }, async (req) => ({ user: req.user }));
    await app.ready();
    return app;
  }

  async function adminSid() {
    await createAdmin(t.ctx.db, { email: 'admin@studio.test', name: 'Admin', password: PASSWORD });
    return sidOf(await login('admin@studio.test'));
  }

  it('[AUTH-005/AC1] requireUser and requireAdmin are provided as service auth.guards', async () => {
    await start();
    const guards = t.ctx.services.require('auth.guards');
    expect(typeof guards.requireUser).toBe('function');
    expect(typeof guards.requireAdmin).toBe('function');
    const users = t.ctx.services.require('auth.users');
    const { user } = (await register()).json();
    expect(await users.findById(user.id)).toEqual(user);
    expect(await users.findManyByIds([user.id, crypto.randomUUID()])).toEqual([user]);
  });

  it('[AUTH-005/AC2] admin routes: no session → 401, member → 403, admin → 200', async () => {
    await start();
    const app = await probe();
    const memberSid = sidOf(await register());
    const anon = await app.inject({ method: 'GET', url: '/api/admin/probe' });
    expect([anon.statusCode, anon.json().error.code]).toEqual([401, 'UNAUTHENTICATED']);
    const member = await app.inject({
      method: 'GET',
      url: '/api/admin/probe',
      headers: withSid(memberSid),
    });
    expect([member.statusCode, member.json().error.code]).toEqual([403, 'FORBIDDEN']);
    const admin = await app.inject({
      method: 'GET',
      url: '/api/admin/probe',
      headers: withSid(await adminSid()),
    });
    expect(admin.statusCode).toBe(200);
    expect(admin.json().user.role).toBe('admin');
    await app.close();
  });

  it('[AUTH-005/AC3] admins can use member endpoints too', async () => {
    await start();
    const app = await probe();
    const res = await app.inject({
      method: 'GET',
      url: '/api/probe',
      headers: withSid(await adminSid()),
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});

describe('AUTH-006 — Admin provisioning', () => {
  it('[AUTH-006/AC1] role in the registration body is ignored', async () => {
    await start();
    const res = await register('eve@example.com', PASSWORD, { role: 'admin' });
    expect(res.json().user.role).toBe('member');
  });

  it('[AUTH-006/AC2] admin:create creates an admin, or promotes an existing user', async () => {
    await start();
    expect(parseCreateAdminArgs(['--email', 'Boss@Studio.test', '--name', 'Boss'])).toEqual({
      email: 'boss@studio.test',
      name: 'Boss',
    });
    expect(() => parseCreateAdminArgs(['--name', 'x'])).toThrow(/--email/);

    expect(
      await createAdmin(t.ctx.db, { email: 'boss@studio.test', name: 'Boss', password: PASSWORD }),
    ).toBe('created');
    expect((await login('boss@studio.test')).json().user.role).toBe('admin');

    await register('ann@example.com');
    expect(
      await createAdmin(t.ctx.db, {
        email: 'ann@example.com',
        name: 'Ann',
        password: 'new password 123',
      }),
    ).toBe('promoted');
    const [ann] = await t.ctx.db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, 'ann@example.com'));
    expect(ann?.role).toBe('admin');
    expect((await login('ann@example.com', 'new password 123')).statusCode).toBe(200);

    await expect(
      createAdmin(t.ctx.db, { email: 'x@studio.test', name: 'X', password: 'short' }),
    ).rejects.toThrow(/12/);
  });
});

describe('AUTH-007 — Session lifetime', () => {
  it('[AUTH-007/AC1] member sessions slide 14 days; admin sessions end 12 h after login', async () => {
    await start();
    const memberSid = sidOf(await register());
    t.clock.advance({ days: 13 });
    expect((await me(memberSid)).statusCode).toBe(200); // used → extended
    t.clock.advance({ days: 13 });
    expect((await me(memberSid)).statusCode).toBe(200);
    t.clock.advance({ days: 14, minutes: 1 });
    expect((await me(memberSid)).statusCode).toBe(401);

    await createAdmin(t.ctx.db, { email: 'admin@studio.test', name: 'A', password: PASSWORD });
    const adminSid = sidOf(await login('admin@studio.test'));
    t.clock.advance({ hours: 11 });
    expect((await me(adminSid)).statusCode).toBe(200); // use does not extend
    t.clock.advance({ hours: 1, minutes: 1 });
    expect((await me(adminSid)).statusCode).toBe(401);
  });

  it('[AUTH-007/AC2] an expired session → 401 and its row is deleted', async () => {
    await start();
    const sid = sidOf(await register());
    expect(await t.ctx.db.select().from(authSessions)).toHaveLength(1);
    t.clock.advance({ days: 15 });
    expect((await me(sid)).statusCode).toBe(401);
    expect(await t.ctx.db.select().from(authSessions)).toHaveLength(0);
  });
});

describe('AUTH-008 — Login rate limiting', () => {
  it('[AUTH-008/AC1] 5 failures in 15 min → 429 RATE_LIMITED, even with the right password', async () => {
    await start();
    await register();
    for (let i = 0; i < 5; i++)
      expect((await login('ann@example.com', 'nope nope nope')).statusCode).toBe(401);
    const blocked = await login('ann@example.com');
    expect([blocked.statusCode, blocked.json().error.code]).toEqual([429, 'RATE_LIMITED']);
    t.clock.advance({ minutes: 15, seconds: 1 });
    expect((await login('ann@example.com')).statusCode).toBe(200);
  });

  it('[AUTH-008/AC2] a successful login resets the counter', async () => {
    await start();
    await register();
    for (let i = 0; i < 4; i++) await login('ann@example.com', 'nope nope nope');
    expect((await login('ann@example.com')).statusCode).toBe(200);
    for (let i = 0; i < 4; i++) await login('ann@example.com', 'nope nope nope');
    expect((await login('ann@example.com')).statusCode).toBe(200);
  });
});
