// Requirements: requirements/platform/spec.md (PLAT-006, PLAT-012)
import { existsSync, readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from '../src/core/db.js';
import { MIGRATIONS_DIR, migrateOnStart, runMigrations } from '../src/core/migrate.js';
import { buildTestApp, hasPostgres, testConfig, type TestApp } from './helpers.js';

const FIXTURE_MIGRATIONS = new URL('./fixtures/migrations', import.meta.url).pathname;
const EMPTY_DIR = new URL('./fixtures/no-migrations', import.meta.url).pathname;
const root = new URL('../../../', import.meta.url);

const tableExists = async (t: TestApp, table: string) => {
  const res = await t.ctx.db.execute(sql`select to_regclass(${table}) as t`);
  return (res as unknown as { rows: { t: string | null }[] }).rows[0]?.t != null;
};

let apps: TestApp[] = [];
afterEach(async () => {
  for (const a of apps) await a.close();
  apps = [];
});
const track = (t: TestApp) => (apps.push(t), t);

describe('PLAT-006 — Versioned database migrations', () => {
  it('[PLAT-006/AC1] drizzle-kit reads every module schema.ts and writes to apps/api/drizzle', () => {
    const cfg = readFileSync(new URL('apps/api/drizzle.config.ts', root), 'utf8');
    expect(cfg).toContain("schema: './src/modules/*/schema.ts'");
    expect(cfg).toContain("out: './drizzle'");
    expect(MIGRATIONS_DIR).toMatch(/apps\/api\/drizzle$/);
  });

  it('[PLAT-006/AC2] buildTestApp applies migrations to a fresh PGlite database', async () => {
    const t = track(await buildTestApp({ modules: [], migrationsFolder: FIXTURE_MIGRATIONS }));
    expect(await tableExists(t, 'fixture_notes')).toBe(true);
    // fresh: a second app does not see rows of the first
    await t.ctx.db.execute(sql`insert into fixture_notes (id, body) values ('1', 'x')`);
    const t2 = track(await buildTestApp({ modules: [], migrationsFolder: FIXTURE_MIGRATIONS }));
    const res = await t2.ctx.db.execute(sql`select count(*)::int as n from fixture_notes`);
    expect((res as unknown as { rows: { n: number }[] }).rows[0]?.n).toBe(0);
  });

  it('[PLAT-006/AC3] pnpm db:drift exists and CI runs it', () => {
    const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
    expect(pkg.scripts['db:drift']).toBeDefined();
    expect(readFileSync(new URL('.github/workflows/ci.yml', root), 'utf8')).toContain('db:drift');
  });

  it('[PLAT-006/AC4] migrates on start unless DB_MIGRATE_ON_START=false; no migrations is a no-op', async () => {
    const on = createDb('pglite:memory');
    const off = createDb('pglite:memory');
    try {
      expect(await migrateOnStart(testConfig(), on, FIXTURE_MIGRATIONS)).toBe('migrated');
      expect(
        await migrateOnStart(testConfig({ DB_MIGRATE_ON_START: 'false' }), off, FIXTURE_MIGRATIONS),
      ).toBe('skipped');
      expect(existsSync(EMPTY_DIR)).toBe(false);
      expect(await runMigrations(on, EMPTY_DIR)).toBe('no-migrations');
    } finally {
      await on.close();
      await off.close();
    }
  });
});

describe('PLAT-012 — Integration tests against real Postgres', () => {
  it.runIf(hasPostgres)(
    '[PLAT-012/AC1] db:"postgres" uses an isolated, migrated schema that is dropped afterwards',
    async () => {
      const a = await buildTestApp({
        modules: [],
        db: 'postgres',
        migrationsFolder: FIXTURE_MIGRATIONS,
      });
      const b = track(
        await buildTestApp({ modules: [], db: 'postgres', migrationsFolder: FIXTURE_MIGRATIONS }),
      );
      await a.ctx.db.execute(sql`insert into fixture_notes (id, body) values ('a', 'only in a')`);
      const inB = await b.ctx.db.execute(sql`select count(*)::int as n from fixture_notes`);
      expect((inB as unknown as { rows: { n: number }[] }).rows[0]?.n).toBe(0);

      const schema = a.schema!;
      expect(schema).toMatch(/^test_[a-z0-9]+$/);
      await a.close();
      const left = await b.ctx.db.execute(
        sql`select count(*)::int as n from information_schema.schemata where schema_name = ${schema}`,
      );
      expect((left as unknown as { rows: { n: number }[] }).rows[0]?.n).toBe(0);
    },
  );

  it('[PLAT-012/AC2] CI provides TEST_DATABASE_URL so Postgres-only tests always run there', () => {
    const ci = readFileSync(new URL('.github/workflows/ci.yml', root), 'utf8');
    expect(ci).toMatch(/TEST_DATABASE_URL: postgres:\/\//);
    expect(typeof hasPostgres).toBe('boolean');
  });
});
