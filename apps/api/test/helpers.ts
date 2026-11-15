// Test harness for API tests. See requirements/platform/interface.md#testing.
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Clock } from '../src/core/clock.js';
import { loadConfig, type Config } from '../src/core/config.js';
import { createDb } from '../src/core/db.js';
import type { ModuleContext } from '../src/core/module.js';
import type { ServiceMap } from '../src/core/registry.js';

export const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'pglite:memory',
  SESSION_SECRET: 'test-secret-test-secret-test-secret-1234',
  WEB_ORIGIN: 'http://web.test',
  ADMIN_ORIGIN: 'http://admin.test',
  STUDIO_TIMEZONE: 'Europe/Berlin',
  STUDIO_CURRENCY: 'eur',
  STRIPE_SECRET_KEY: 'sk_test_dummy',
  STRIPE_WEBHOOK_SECRET: 'whsec_dummy',
} as const;

export function testConfig(overrides: Partial<Record<keyof Config, string>> = {}): Config {
  return loadConfig({ ...TEST_ENV, ...overrides });
}

/** A clock that only moves when told to. */
export class FakeClock implements Clock {
  private current: Date;
  constructor(start: Date | string = '2026-11-16T08:00:00.000Z') {
    this.current = new Date(start);
  }
  now(): Date {
    return new Date(this.current);
  }
  set(to: Date | string): void {
    this.current = new Date(to);
  }
  advance({ days = 0, hours = 0, minutes = 0, seconds = 0 }): void {
    const ms = ((days * 24 + hours) * 60 + minutes) * 60_000 + seconds * 1000;
    this.current = new Date(this.current.getTime() + ms);
  }
}

export interface TestAppOptions {
  /** Load only these modules. Their dependencies' services must be supplied as fakes. */
  modules?: string[];
  services?: Partial<ServiceMap>;
  now?: Date | string;
  config?: Partial<Record<keyof Config, string>>;
}

export interface TestApp {
  app: FastifyInstance;
  ctx: ModuleContext;
  clock: FakeClock;
  close(): Promise<void>;
}

/**
 * Build an isolated app: fresh in-memory PGlite database, fake clock, test config.
 * Always `await close()` (e.g. in afterEach).
 */
export async function buildTestApp(opts: TestAppOptions = {}): Promise<TestApp> {
  const config = testConfig(opts.config);
  const clock = new FakeClock(opts.now);
  const handle = createDb(config.DATABASE_URL);
  // TODO(PLAT-006): apply migrations from apps/api/drizzle here.
  const { app, ctx } = await buildApp({
    config,
    db: handle.db,
    clock,
    modules: opts.modules,
    services: opts.services,
    allowMissingDependencies: opts.modules !== undefined,
  });
  return {
    app,
    ctx,
    clock,
    close: async () => {
      await app.close();
      await handle.close();
    },
  };
}
