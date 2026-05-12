/**
 * Smart database URL picker.
 *
 * Goldspire talks to two physically different Postgres endpoints depending
 * on what it's doing:
 *
 *   - **Runtime** (Next.js, tRPC handlers, background workers) wants the
 *     Supabase **transaction pooler** on port 6543. Short-lived connections,
 *     prepared-statement-incompatible, scales to many concurrent requests.
 *
 *   - **Migrations / DDL** (`pnpm db:migrate`, `db:seed`, `db:reset`,
 *     drizzle-kit) want the Supabase **session pooler** on port 5432, or a
 *     direct connection. The transaction pooler can't run DDL.
 *
 * Historically we exposed two env vars (DATABASE_URL + DIRECT_URL) and forced
 * the developer to keep them in sync. That's annoying and footguny — paste
 * the wrong one in the wrong slot and migrations either silently break or
 * the app server can't keep up.
 *
 * This module accepts EITHER one URL or both, and intelligently derives
 * what each subsystem needs. Rules in priority order:
 *
 *   1. If both DATABASE_URL and DIRECT_URL are set → trust the developer.
 *      DATABASE_URL is runtime, DIRECT_URL is migrations.
 *
 *   2. If only DATABASE_URL is set, parse the host + port:
 *      - host=`*.pooler.supabase.com`, port=6543 (transaction)
 *           → runtime = as-is
 *           → migration = same URL with port swapped to 5432 (session)
 *             (we KNOW the transaction pooler can't run DDL, so deriving
 *              the session pooler URL is mandatory and safe to assume —
 *              every Supabase project exposes both on the same host.)
 *      - host=`*.pooler.supabase.com`, port=5432 (session)
 *           → both = as-is
 *             (session pooler is slower for high-fanout but always works;
 *              we deliberately do NOT derive a 6543 transaction URL here
 *              because not every project has it enabled.)
 *      - host=`db.*.supabase.co` (direct, IPv6-only on free tier)
 *           → both = as-is (warn separately about IPv6)
 *      - anything else (localhost, custom Postgres)
 *           → both = as-is
 *
 *   3. If only DIRECT_URL is set → both = DIRECT_URL (treat as session/direct).
 *
 * The returned `rationale` field explains the choice so scripts can log it.
 * Use `getRuntimeDatabaseUrl()` from app code and
 * `getMigrationDatabaseUrl()` from any DDL-bearing script or config.
 */

import { env } from './env';

export type DatabaseUrlChoice = {
  runtime: string;
  migration: string;
  rationale: string;
};

const SUPABASE_TRANSACTION_PORT = '6543';
const SUPABASE_SESSION_PORT = '5432';

function safeParse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isSupabasePooler(host: string): boolean {
  return host.endsWith('.pooler.supabase.com');
}

function isSupabaseDirect(host: string): boolean {
  return host.startsWith('db.') && host.endsWith('.supabase.co');
}

function deriveSessionFromTransaction(transactionUrl: string): string | null {
  const parsed = safeParse(transactionUrl);
  if (!parsed) return null;
  parsed.port = SUPABASE_SESSION_PORT;
  return parsed.toString();
}

/**
 * Compute the runtime + migration URLs and a human-readable rationale.
 * Pure function; safe to call from anywhere `env` is loaded.
 */
export function resolveDatabaseUrls(): DatabaseUrlChoice {
  const dbUrl = env.DATABASE_URL;
  const directUrl = env.DIRECT_URL;

  if (directUrl && directUrl !== dbUrl) {
    return {
      runtime: dbUrl,
      migration: directUrl,
      rationale: 'using explicit DATABASE_URL (runtime) + DIRECT_URL (migrations)',
    };
  }

  const parsed = safeParse(dbUrl);
  if (!parsed) {
    return {
      runtime: dbUrl,
      migration: dbUrl,
      rationale: 'unparseable DATABASE_URL — using as-is for both',
    };
  }

  const host = parsed.hostname;
  const port = parsed.port;

  if (isSupabasePooler(host)) {
    if (port === SUPABASE_TRANSACTION_PORT) {
      const session = deriveSessionFromTransaction(dbUrl);
      if (session) {
        return {
          runtime: dbUrl,
          migration: session,
          rationale:
            'DATABASE_URL is Supabase transaction pooler (6543); derived session pooler (5432) for migrations',
        };
      }
    }
    if (port === SUPABASE_SESSION_PORT) {
      return {
        runtime: dbUrl,
        migration: dbUrl,
        rationale:
          'DATABASE_URL is Supabase session pooler (5432); using for both (set DIRECT_URL to override migration target)',
      };
    }
    return {
      runtime: dbUrl,
      migration: dbUrl,
      rationale: `DATABASE_URL is Supabase pooler with unexpected port ${port}; using as-is for both`,
    };
  }

  if (isSupabaseDirect(host)) {
    return {
      runtime: dbUrl,
      migration: dbUrl,
      rationale:
        'DATABASE_URL is Supabase direct host (db.*) — works for both, but is IPv6-only on the free tier',
    };
  }

  return {
    runtime: dbUrl,
    migration: dbUrl,
    rationale: `DATABASE_URL host=${host} (non-Supabase); using as-is for both`,
  };
}

export function getRuntimeDatabaseUrl(): string {
  return resolveDatabaseUrls().runtime;
}

export function getMigrationDatabaseUrl(): string {
  return resolveDatabaseUrls().migration;
}
