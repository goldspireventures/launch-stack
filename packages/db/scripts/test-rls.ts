/**
 * Verify tenant RLS — policies present; cross-tenant probe when the DB role
 * does not bypass RLS (Supabase `postgres` superuser skips row checks).
 *
 * Set DATABASE_URL_APP to run the isolation probe against the production app role.
 *
 * Usage: pnpm --filter @goldspire/db test:rls
 */
import './_load-env';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@goldspire/config/env';
import { schema, withTenantContext } from '../src/index';
import * as schemaExport from '../src/schema';

function createProbeDb(url: string) {
  const sql = postgres(url, { max: 1, prepare: false });
  const database = drizzle(sql, { schema: schemaExport, casing: 'snake_case' });
  return { sql, database };
}

async function roleBypassesRls(database: typeof db): Promise<boolean> {
  const rows = await database.execute<{ bypass: boolean }>(sql`
    select coalesce(rolbypassrls, false) as bypass
    from pg_roles
    where rolname = current_user
  `);
  const row = rows[0] as { bypass?: boolean } | undefined;
  return row?.bypass === true;
}

async function userTableHasTenantPolicy(database: typeof db): Promise<boolean> {
  const rows = await database.execute<{ n: number }>(sql`
    select count(*)::int as n
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user'
      and policyname = 'tenant_isolation'
  `);
  const row = rows[0] as { n?: number } | undefined;
  return (row?.n ?? 0) > 0;
}

async function crossTenantProbe(
  database: typeof db,
  tenants: { id: string; slug: string }[],
): Promise<void> {
  if (tenants.length < 2) {
    console.error('Need at least 2 tenants in DB — run pnpm db:seed');
    process.exit(1);
  }

  const a = tenants[0]!;
  const b = tenants[1]!;
  const usersA = await withTenantContext(database, a.id, null, async (tx) =>
    tx.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.tenantId, a.id)).limit(1),
  );
  const userA = usersA[0];
  if (!userA) {
    console.warn(`No users for tenant ${a.slug} — skipping cross-tenant probe`);
    return;
  }

  const leaked = await withTenantContext(database, b.id, userA.id, async (tx) =>
    tx
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, userA.id))
      .limit(1),
  );

  if (leaked.length > 0) {
    console.error('RLS FAILURE: user from tenant A visible under tenant B context');
    process.exit(1);
  }

  console.log(`RLS probe OK — tenant "${a.slug}" data hidden from "${b.slug}" context.`);
}

function explainAppConnectionError(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  if (!/goldspire_app|tenant\/user|not found/i.test(msg)) return null;
  return [
    'DATABASE_URL_APP could not connect via the Supabase pooler.',
    '',
    'Checklist:',
    '  1. Supabase → Database → Roles → goldspire_app → set a password (not only raw SQL).',
    '  2. .env line uses that password (URL-encode @ # % etc.), not the literal word PASSWORD.',
    '  3. Username must be goldspire_app.YOUR_PROJECT_REF (see pnpm db:app-role).',
    '  4. Host/port match your working DATABASE_URL session pooler (:5432).',
    '  5. If pooler still rejects the role, try direct host for tests only:',
    '     postgresql://goldspire_app.REF:PASS@db.REF.supabase.co:5432/postgres',
    '',
    'Comment out DATABASE_URL_APP to finish policy checks with DATABASE_URL only.',
  ].join('\n');
}

async function probeConnection(
  label: string,
  url: string,
  tenants: { id: string; slug: string }[],
): Promise<void> {
  const { sql, database: probeDb } = createProbeDb(url);
  try {
    const bypass = await roleBypassesRls(probeDb);
    if (bypass) {
      if (label === 'DATABASE_URL_APP') {
        console.error(
          'RLS FAILURE: DATABASE_URL_APP role bypasses row security — run pnpm db:migrate (0012) or: alter role goldspire_app nobypassrls;',
        );
        process.exit(1);
      }
      console.warn(`RLS probe skipped for ${label}: role bypasses row security.`);
      return;
    }
    console.log(`Running cross-tenant probe on ${label} (${await currentUser(probeDb)})…`);
    await crossTenantProbe(probeDb, tenants);
  } catch (err) {
    const hint = explainAppConnectionError(err);
    if (hint) {
      console.error(hint);
    }
    throw err;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function currentUser(database: typeof db): Promise<string> {
  const rows = await database.execute<{ u: string }>(sql`select current_user as u`);
  return (rows[0] as { u?: string } | undefined)?.u ?? 'unknown';
}

async function main() {
  // Policy checks always use DATABASE_URL (postgres/service), not DATABASE_URL_APP.
  const primaryUrl = env.DATABASE_URL.trim();
  const { sql: primarySql, database: primaryDb } = createProbeDb(primaryUrl);

  try {
    const policyOk = await userTableHasTenantPolicy(primaryDb);
    if (!policyOk) {
      console.error('RLS FAILURE: missing tenant_isolation policy on public.user — run pnpm db:migrate');
      process.exit(1);
    }
    console.log('RLS policies present on public.user (tenant_isolation).');

    const tenants = await primaryDb
      .select({ id: schema.tenant.id, slug: schema.tenant.slug })
      .from(schema.tenant)
      .limit(20);

    const bypass = await roleBypassesRls(primaryDb);
    if (bypass) {
      console.warn(
        'DATABASE_URL role bypasses row security (typical for Supabase postgres/service role).',
      );
    } else {
      await crossTenantProbe(primaryDb, tenants);
    }

    const appUrl = env.DATABASE_URL_APP?.trim();
    if (appUrl) {
      await probeConnection('DATABASE_URL_APP', appUrl, tenants);
    } else {
      console.warn(
        'Tip: set DATABASE_URL_APP to the goldspire_app pooler URI to verify tenant isolation like production.',
      );
    }
  } finally {
    await primarySql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
