/* eslint-disable no-console */
import './_load-env';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '@goldspire/config/env';

/**
 * Migration strategy:
 *
 *  1. `packages/db/drizzle/` — owned by drizzle-kit. Contains the auto-generated
 *     schema migrations (CREATE TABLE / ALTER TABLE) and the `meta/_journal.json`
 *     used to track which have been applied. We apply these via Drizzle's
 *     migrator so it manages its own state table.
 *
 *  2. `packages/db/policies/` — owned by hand. Contains RLS policies and any
 *     other hand-written DDL that doesn't fit Drizzle's diff model. These are
 *     written to be idempotent (drop ... if exists; create ...) so they're
 *     safe to re-run on every `pnpm db:migrate`.
 */
// `import.meta.url` is a file:// URL; .pathname returns `/C:/...` on Windows
// which existsSync can't open. fileURLToPath gives us a real native path.
const DRIZZLE_DIR = fileURLToPath(new URL('../drizzle/', import.meta.url));
const POLICIES_DIR = fileURLToPath(new URL('../policies/', import.meta.url));
const url = env.DIRECT_URL ?? env.DATABASE_URL;

async function main() {
  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql);

  console.log('▸ running drizzle schema migrations...');
  if (existsSync(DRIZZLE_DIR)) {
    try {
      await migrate(db, { migrationsFolder: DRIZZLE_DIR });
      console.log('  ✓ schema up to date');
    } catch (err) {
      console.error('  ✗ drizzle migrate failed:', err instanceof Error ? err.message : err);
      throw err;
    }
  } else {
    console.log('  (no drizzle/ directory found)');
  }

  console.log('▸ applying hand-written policies...');
  await sql.unsafe("select set_config('app.role', 'STUDIO_OWNER', true)");

  if (existsSync(POLICIES_DIR)) {
    const files = readdirSync(POLICIES_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      const fullPath = join(POLICIES_DIR, file);
      const body = readFileSync(fullPath, 'utf8');
      try {
        await sql.unsafe(body);
        console.log(`  ✓ ${file}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // `0000_rls_policies.sql` is not idempotent (uses plain CREATE POLICY).
        // On re-run it errors with "already exists"; that's expected and safe.
        if (msg.includes('already exists')) {
          console.warn(`  ↺ ${file} (already applied, skipping)`);
          continue;
        }
        console.error(`  ✗ ${file}: ${msg}`);
        throw err;
      }
    }
    console.log(`▸ applied ${files.length} policy file(s)`);
  } else {
    console.log('  (no policies/ directory found)');
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
