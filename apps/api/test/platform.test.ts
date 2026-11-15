// Requirements: requirements/platform/spec.md
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorResponseSchema } from '@pilates/contracts';
import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ConfigError, loadConfig } from '../src/core/config.js';
import { AppError, registerErrorHandling } from '../src/core/errors.js';
import { discoverModules, sortByDependencies, type AppModule } from '../src/core/module.js';
import { EventBus, ServiceRegistry } from '../src/core/registry.js';
import { parse } from '../src/core/validation.js';
import { TEST_ENV, buildTestApp, type TestApp } from './helpers.js';

let t: TestApp | undefined;
afterEach(async () => {
  await t?.close();
  t = undefined;
});

describe('PLAT-001 — Health endpoint', () => {
  it('[PLAT-001/AC1] GET /api/health answers 200 { status: "ok" }', async () => {
    t = await buildTestApp({ modules: [] });
    const res = await t.app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('[PLAT-001/AC2] needs no authentication', async () => {
    t = await buildTestApp({ modules: [] });
    const res = await t.app.inject({ method: 'GET', url: '/api/health', headers: {} });
    expect(res.statusCode).toBe(200);
  });
});

describe('PLAT-002 — Configuration is validated at startup', () => {
  it('[PLAT-002/AC1] returns typed config with defaults applied', () => {
    const c = loadConfig({ ...TEST_ENV });
    expect(c.PORT).toBe(3000);
    expect(c.BOOKING_HOLD_MINUTES).toBe(30);
    expect(c.BOOKING_CUTOFF_MINUTES).toBe(60);
    expect(c.CANCELLATION_DEADLINE_HOURS).toBe(24);
  });

  it('[PLAT-002/AC2] names every invalid key and never echoes secret values', () => {
    const env = { ...TEST_ENV, SESSION_SECRET: 'too-short-secret', WEB_ORIGIN: 'nope' } as Record<
      string,
      string | undefined
    >;
    delete env.DATABASE_URL;
    let error: unknown;
    try {
      loadConfig(env);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ConfigError);
    const ce = error as ConfigError;
    expect(ce.invalidKeys.sort()).toEqual(['DATABASE_URL', 'SESSION_SECRET', 'WEB_ORIGIN']);
    expect(ce.message).not.toContain('too-short-secret');
  });

  it('[PLAT-002/AC3] rejects BOOKING_HOLD_MINUTES below the Stripe minimum of 30', () => {
    expect(() => loadConfig({ ...TEST_ENV, BOOKING_HOLD_MINUTES: '15' })).toThrow(ConfigError);
  });

  it('[PLAT-002/AC4] rejects Stripe test keys in production', () => {
    expect(() => loadConfig({ ...TEST_ENV, NODE_ENV: 'production' })).toThrow(/STRIPE_SECRET_KEY/);
  });
});

describe('PLAT-003 — Uniform error responses', () => {
  async function appWith(handler: () => unknown) {
    const app = Fastify();
    registerErrorHandling(app);
    app.post('/boom', async (req) => {
      handler();
      return parse(z.object({ n: z.number() }), req.body);
    });
    await app.ready();
    return app;
  }

  it('[PLAT-003/AC1] AppError → its status and { error: { code, message } }', async () => {
    const app = await appWith(() => {
      throw new AppError('APPOINTMENT_FULL', 409, 'No seats left');
    });
    const res = await app.inject({ method: 'POST', url: '/boom', payload: {} });
    expect(res.statusCode).toBe(409);
    expect(ErrorResponseSchema.parse(res.json())).toEqual({
      error: { code: 'APPOINTMENT_FULL', message: 'No seats left' },
    });
  });

  it('[PLAT-003/AC2] schema failure → 400 VALIDATION_ERROR with failing paths', async () => {
    const app = await appWith(() => undefined);
    const res = await app.inject({ method: 'POST', url: '/boom', payload: { n: 'x' } });
    expect(res.statusCode).toBe(400);
    const body = ErrorResponseSchema.parse(res.json());
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.issues).toEqual([expect.objectContaining({ path: 'n' })]);
  });

  it('[PLAT-003/AC3] unexpected error → 500 INTERNAL without leaking internals', async () => {
    const app = await appWith(() => {
      throw new Error('db password is hunter2');
    });
    const res = await app.inject({ method: 'POST', url: '/boom', payload: {} });
    expect(res.statusCode).toBe(500);
    expect(res.json().error.code).toBe('INTERNAL');
    expect(res.body).not.toContain('hunter2');
    expect(res.body).not.toContain('at ');
  });

  it('[PLAT-003/AC4] unknown route → 404 NOT_FOUND in the same shape', async () => {
    t = await buildTestApp({ modules: [] });
    const res = await t.app.inject({ method: 'GET', url: '/api/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expect(ErrorResponseSchema.parse(res.json()).error.code).toBe('NOT_FOUND');
  });
});

describe('PLAT-007 — Module loader and domain event bus', () => {
  const mod = (name: string, dependsOn: string[] = []): AppModule => ({
    name,
    dependsOn,
    register: () => undefined,
  });

  it('[PLAT-007/AC1] discovers every module directory without a central list', async () => {
    // Robust to sparse checkouts: compare with whatever module directories are present.
    const dir = fileURLToPath(new URL('../src/modules', import.meta.url));
    const present = readdirSync(dir).filter((d) => existsSync(join(dir, d, 'index.ts')));
    const discovered = await discoverModules(dir);
    expect(discovered.map((m) => m.name).sort()).toEqual(present.sort());

    t = await buildTestApp({ modules: present });
    expect((await t.app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200);
  });

  it('[PLAT-007/AC2] registers in dependency order and fails on a missing dependency', () => {
    const order = sortByDependencies([
      mod('booking', ['platform', 'scheduling']),
      mod('scheduling'),
    ]);
    expect(order.map((m) => m.name)).toEqual(['scheduling', 'booking']);
    expect(() => sortByDependencies([mod('booking', ['payments'])])).toThrow(
      /"booking" depends on "payments"/,
    );
    expect(sortByDependencies([mod('booking', ['payments'])], true)).toHaveLength(1);
  });

  it('[PLAT-007/AC3] require() of an unknown service names the service; overrides win', () => {
    const services = new ServiceRegistry();
    expect(() => services.require('payments.checkout' as never)).toThrow(/payments\.checkout/);

    const fake = { refundForBooking: async () => undefined };
    const withOverride = new ServiceRegistry({ 'payments.refunds': fake } as never);
    withOverride.provide('payments.refunds' as never, { real: true } as never);
    expect(withOverride.require('payments.refunds' as never)).toBe(fake);
  });

  it('[PLAT-007/AC4] a failing handler does not fail the publisher or other handlers', async () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.subscribe('payment.succeeded' as never, () => {
      throw new Error('boom');
    });
    bus.subscribe('payment.succeeded' as never, (p: { bookingId: string }) =>
      seen.push(p.bookingId),
    );
    await expect(
      bus.publish('payment.succeeded' as never, { bookingId: 'b1', paymentId: 'p1' } as never),
    ).resolves.toBeUndefined();
    expect(seen).toEqual(['b1']);
  });
});

describe('PLAT-011 — Continuous integration', () => {
  it('[PLAT-011/AC1] CI runs format, lint, typecheck, tests and req:check', () => {
    const ci = readFileSync(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8');
    for (const step of ['format:check', 'lint', 'typecheck', 'pnpm test', 'req:check'])
      expect(ci).toContain(step);
  });

  it('[PLAT-011/AC2] e2e job runs against Postgres when E2E_ENABLED is set', () => {
    const ci = readFileSync(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8');
    expect(ci).toContain("vars.E2E_ENABLED == 'true'");
    expect(ci).toMatch(/postgres:/);
  });
});
