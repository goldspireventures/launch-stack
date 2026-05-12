import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env, getRuntimeDatabaseUrl } from '@goldspire/config/env';
import * as schema from './schema';

/**
 * Database client singleton.
 *
 * We use postgres-js as the driver and Drizzle as the typed query builder.
 * The connection is cached on `globalThis` in development so HMR doesn't
 * exhaust the connection pool.
 */
declare global {
  // eslint-disable-next-line no-var
  var __goldspire_db: ReturnType<typeof createClient> | undefined;
}

function createClient() {
  // getRuntimeDatabaseUrl() prefers the transaction pooler (port 6543) when
  // available, falling back to whatever DATABASE_URL is. Single source of
  // truth is packages/config/src/db-url.ts.
  const sql = postgres(getRuntimeDatabaseUrl(), {
    max: env.NODE_ENV === 'production' ? 20 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // pgBouncer/Supabase pooler compatibility
  });
  return drizzle(sql, {
    schema,
    casing: 'snake_case',
    logger: env.NODE_ENV === 'development',
  });
}

export const db = globalThis.__goldspire_db ?? createClient();

if (env.NODE_ENV !== 'production') {
  globalThis.__goldspire_db = db;
}

export { schema };
export type Database = typeof db;
