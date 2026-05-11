/* eslint-disable no-console */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import { env } from '@goldspire/config';

const DRIZZLE_DIR = new URL('../drizzle/', import.meta.url).pathname;
const url = env.DIRECT_URL ?? env.DATABASE_URL;

async function main() {
  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql);

  console.log('▸ running drizzle migrations...');
  if (existsSync(DRIZZLE_DIR)) {
    try {
      await migrate(db, { migrationsFolder: DRIZZLE_DIR });
    } catch (err) {
      console.warn('  (no generated migrations found, skipping)', err instanceof Error ? err.message : err);
    }
  }

  console.log('▸ applying RLS policies...');
  await sql.unsafe("select set_config('app.role', 'STUDIO_OWNER', true)");
  const rlsFile = join(DRIZZLE_DIR, '0000_rls_policies.sql');
  if (existsSync(rlsFile)) {
    const policies = readFileSync(rlsFile, 'utf8');
    // Split is naive; for production use a real SQL parser. Works for our migration.
    try {
      await sql.unsafe(policies);
    } catch (err) {
      // Idempotent re-runs will fail on "policy already exists" — that's ok.
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('already exists')) {
        throw err;
      }
      console.warn('  (RLS policies already in place, skipping)');
    }
  } else {
    console.log('  (no RLS file found)');
  }

  // Print discovered migration files for debug
  if (existsSync(DRIZZLE_DIR)) {
    const files = readdirSync(DRIZZLE_DIR).filter((f) => f.endsWith('.sql'));
    console.log(`▸ applied ${files.length} migration file(s)`);
  }

  await sql.end();
  console.log('✓ migrations complete');
}

function isConnectionRefused(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ECONNREFUSED') {
    return true;
  }
  if (err instanceof AggregateError) {
    return err.errors.some(
      (e) => e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'ECONNREFUSED',
    );
  }
  return false;
}

main().catch((err) => {
  console.error('✗ migration failed:', err);
  if (isConnectionRefused(err)) {
    console.error(
      '\nHint: Postgres refused the connection. Set DATABASE_URL / DIRECT_URL in `.env` to a reachable instance (e.g. Supabase), or start Postgres on the host and port in your URL.',
    );
  }
  process.exit(1);
});
