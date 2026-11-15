// Database access. Real Postgres via node-postgres, or PGlite (in-process WASM Postgres)
// for tests and quick local runs: DATABASE_URL=pglite:memory
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';

export type Db = PgDatabase<PgQueryResultHKT>;
/** Transaction handle passed to `db.transaction(async (tx) => …)`. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface DbHandle {
  db: Db;
  close(): Promise<void>;
}

export function createDb(url: string): DbHandle {
  if (url.startsWith('pglite:')) {
    const location = url.slice('pglite:'.length);
    const client = new PGlite(location === 'memory' || location === '' ? undefined : location);
    return { db: drizzlePglite(client) as unknown as Db, close: () => client.close() };
  }
  const pool = new pg.Pool({ connectionString: url });
  return { db: drizzlePg(pool) as unknown as Db, close: () => pool.end() };
}
