/* eslint-disable no-console */
import './_load-env';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env, resolveDatabaseUrls } from '@goldspire/config/env';

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
const JOURNAL_PATH = join(DRIZZLE_DIR, 'meta', '_journal.json');

function verifyDrizzleJournal(): void {
  if (!existsSync(JOURNAL_PATH)) {
    throw new Error(`Missing Drizzle journal: ${JOURNAL_PATH}`);
  }
  const journal = JSON.parse(readFileSync(JOURNAL_PATH, 'utf8')) as {
    entries?: { tag: string }[];
  };
  const missing: string[] = [];
  for (const e of journal.entries ?? []) {
    if (!existsSync(join(DRIZZLE_DIR, `${e.tag}.sql`))) missing.push(e.tag);
  }
  if (missing.length > 0) {
    throw new Error(
      `Journal entries missing SQL files: ${missing.join(', ')}. ` +
        'Add packages/db/drizzle/<tag>.sql before running migrate.',
    );
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '(unparseable URL)';
  }
}

async function main() {
  verifyDrizzleJournal();
  const { migration: url, rationale } = resolveDatabaseUrls();
  console.log('▸ migration target:', hostOf(url));
  console.log('  rationale       :', rationale);
  if (hostOf(url).startsWith('db.') && hostOf(url).endsWith('.supabase.co')) {
    console.warn(
      '⚠ Using direct Supabase host (db.*). If you see ENOTFOUND, switch DATABASE_URL to the Session pooler URI (host *.pooler.supabase.com) in .env.',
    );
  }

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

main()
  .then(() => {
    // postgres-js's sql.end() resolves immediately but background sockets
    // can keep the event loop alive on Supavisor. Force a clean exit so
    // `pnpm db:migrate` doesn't appear to hang after "✓ migrations complete".
    process.exit(0);
  })
  .catch((err) => {
    console.error('✗ migration failed:', err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ENOTFOUND') && msg.includes('db.') && msg.includes('supabase.co')) {
      console.error(
        '\nHint: Direct db.<project>.supabase.co did not resolve. Put the Supabase Session pooler URI in DATABASE_URL (host should be *.pooler.supabase.com), then retry.',
      );
    }
    if (isConnectionRefused(err)) {
      console.error(
        '\nHint: Postgres refused the connection. Set DATABASE_URL in `.env` to a reachable instance (e.g. Supabase session pooler), or start Postgres on the host and port in your URL.',
      );
    }
    process.exit(1);
  });
