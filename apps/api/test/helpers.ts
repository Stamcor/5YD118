// Test harness for API tests. See requirements/platform/interface.md#testing.
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { buildApp } from '../src/app.js';
import type { Clock } from '../src/core/clock.js';
import { loadConfig, type Config } from '../src/core/config.js';
import { createDb } from '../src/core/db.js';
import { loggerOptions } from '../src/core/logging.js';
import { MIGRATIONS_DIR, runMigrations } from '../src/core/migrate.js';
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

/** PLAT-012 — set TEST_DATABASE_URL to run Postgres-only tests (CI always does). */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const hasPostgres = !!TEST_DATABASE_URL;

export interface TestAppOptions {
  /** Load only these modules. Their dependencies' services must be supplied as fakes. */
  modules?: string[];
  services?: Partial<ServiceMap>;
  now?: Date | string;
  config?: Partial<Record<keyof Config, string>>;
  /** 'pglite' (default): in-process. 'postgres': isolated schema on TEST_DATABASE_URL. */
  db?: 'pglite' | 'postgres';
  /** Capture JSON logs (PLAT-004 tests). */
  logStream?: NodeJS.WritableStream;
  /** Defaults to apps/api/drizzle (all modules' migrations). */
  migrationsFolder?: string;
}

export interface TestApp {
  app: FastifyInstance;
  ctx: ModuleContext;
  clock: FakeClock;
  /** The isolated schema when db: 'postgres'. */
  schema?: string;
  close(): Promise<void>;
}

/** Create a fresh schema on TEST_DATABASE_URL; returns its name and a drop function. */
async function createIsolatedSchema(): Promise<{ schema: string; drop(): Promise<void> }> {
  if (!TEST_DATABASE_URL) throw new Error('db: "postgres" needs TEST_DATABASE_URL (PLAT-012)');
  const schema = `test_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const admin = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await admin.connect();
  await admin.query(`create schema "${schema}"`);
  await admin.end();
  return {
    schema,
    drop: async () => {
      const c = new pg.Client({ connectionString: TEST_DATABASE_URL });
      await c.connect();
      await c.query(`drop schema if exists "${schema}" cascade`);
      await c.end();
    },
  };
}

/**
 * Build an isolated app: fresh, migrated database (PGlite in memory, or an own schema on
 * real Postgres), fake clock, test config. Always `await close()` (e.g. in afterEach).
 */
export async function buildTestApp(opts: TestAppOptions = {}): Promise<TestApp> {
  const isolated = opts.db === 'postgres' ? await createIsolatedSchema() : undefined;
  const config = testConfig(
    isolated ? { ...opts.config, DATABASE_URL: TEST_DATABASE_URL } : opts.config,
  );
  const clock = new FakeClock(opts.now);
  const handle = createDb(config.DATABASE_URL, { searchPath: isolated?.schema });
  await runMigrations(handle, opts.migrationsFolder ?? MIGRATIONS_DIR, {
    migrationsSchema: isolated?.schema,
  });
  const { app, ctx } = await buildApp({
    config,
    db: handle.db,
    clock,
    modules: opts.modules,
    services: opts.services,
    allowMissingDependencies: opts.modules !== undefined,
    logger: opts.logStream ? loggerOptions(config, opts.logStream) : false,
  });
  return {
    app,
    ctx,
    clock,
    schema: isolated?.schema,
    close: async () => {
      await app.close();
      await handle.close();
      await isolated?.drop();
    },
  };
}
