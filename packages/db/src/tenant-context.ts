import { sql } from 'drizzle-orm';
import type { Database } from './client';

/**
 * Tenant context setter. Every authenticated request should call this at the
 * start of its DB transaction so that Postgres RLS policies can scope queries
 * to the active tenant.
 *
 *   await withTenantContext(db, tenantId, userId, async (tx) => {
 *     // every query inside this callback runs with app.tenant_id and
 *     // app.user_id set as local session variables, which the RLS policies
 *     // reference via current_setting('app.tenant_id').
 *   })
 *
 * Defense in depth: even if app code forgets to add `where tenantId = X`,
 * the RLS policy refuses cross-tenant reads/writes.
 */
export async function withTenantContext<T>(
  db: Database,
  tenantId: string,
  userId: string | null,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    await tx.execute(sql`select set_config('app.user_id', ${userId ?? ''}, true)`);
    return fn(tx as unknown as Database);
  });
}

/**
 * Studio-scope context. Used by the Studio Console for cross-tenant queries.
 * Setting `app.role = 'STUDIO_OWNER'` flips the RLS policies into bypass mode
 * for the duration of the transaction.
 */
export async function withStudioContext<T>(
  db: Database,
  userId: string,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.role', 'STUDIO_OWNER', true)`);
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx as unknown as Database);
  });
}

/**
 * Server-only studio scope without an end-user id (portal links, Stripe webhooks).
 * Sets the studio role so RLS matches `studio_deal` policies; `app.user_id` is empty.
 */
export async function withSystemStudioContext<T>(
  db: Database,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.role', 'STUDIO_OWNER', true)`);
    await tx.execute(sql`select set_config('app.user_id', '', true)`);
    return fn(tx as unknown as Database);
  });
}
