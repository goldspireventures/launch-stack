/* eslint-disable no-console */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import { env } from '@goldspire/config/env';

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

  console.log('▸ applying RLS / hand-written SQL migrations...');
  await sql.unsafe("select set_config('app.role', 'STUDIO_OWNER', true)");

  // Apply every *.sql file in the drizzle/ dir in lexicographic order.
  // The base `0000_rls_policies.sql` isn't idempotent on its own, so we
  // catch "already exists" for it specifically. Subsequent files should
  // use `drop ... if exists; create ...` and be safe to re-run.
  if (existsSync(DRIZZLE_DIR)) {
    const files = readdirSync(DRIZZLE_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      const fullPath = join(DRIZZLE_DIR, file);
      const body = readFileSync(fullPath, 'utf8');
      try {
        await sql.unsafe(body);
        console.log(`  ✓ ${file}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('already exists')) {
          console.warn(`  ↺ ${file} (already applied, skipping)`);
          continue;
        }
        console.error(`  ✗ ${file}: ${msg}`);
        throw err;
      }
    }
    console.log(`▸ applied ${files.length} SQL migration file(s)`);
  } else {
    console.log('  (no drizzle/ directory found)');
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
