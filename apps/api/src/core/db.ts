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

export type DbHandle =
  | { kind: 'pglite'; db: Db; raw: ReturnType<typeof drizzlePglite>; close(): Promise<void> }
  | { kind: 'postgres'; db: Db; raw: ReturnType<typeof drizzlePg>; close(): Promise<void> };

export interface CreateDbOptions {
  /** Postgres only: run every connection with this search_path (isolated test schemas). */
  searchPath?: string;
}

export function createDb(url: string, opts: CreateDbOptions = {}): DbHandle {
  if (url.startsWith('pglite:')) {
    const location = url.slice('pglite:'.length);
    const client = new PGlite(location === 'memory' || location === '' ? undefined : location);
    const raw = drizzlePglite(client);
    return { kind: 'pglite', raw, db: raw as unknown as Db, close: () => client.close() };
  }
  const pool = new pg.Pool({
    connectionString: url,
    ...(opts.searchPath ? { options: `-c search_path=${opts.searchPath}` } : {}),
  });
  const raw = drizzlePg(pool);
  return { kind: 'postgres', raw, db: raw as unknown as Db, close: () => pool.end() };
}
