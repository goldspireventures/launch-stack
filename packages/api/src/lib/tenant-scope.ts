import { eq } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import type { AuthedUser } from '@goldspire/auth';
import type { SupportAccessScope } from '@goldspire/commercial';
import type { Context } from '../context';

/** Resolve tenant primary key from slug or 26-char id hint. */
export async function resolveTenantIdFromHint(
  db: Database,
  hint: string,
): Promise<string | null> {
  const trimmed = hint.trim();
  if (!trimmed) return null;
  if (trimmed.length === 26) {
    const [row] = await db
      .select({ id: schema.tenant.id })
      .from(schema.tenant)
      .where(eq(schema.tenant.id, trimmed))
      .limit(1);
    return row?.id ?? null;
  }
  const [row] = await db
    .select({ id: schema.tenant.id })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, trimmed.toLowerCase()))
    .limit(1);
  return row?.id ?? null;
}

export type TenantScopedContext = Context & {
  user: AuthedUser;
  /** Tenant row queries should scope to this id (Admin lens for studio roles). */
  activeTenantId: string;
  supportSession?: {
    scope: SupportAccessScope;
    expiresAt: Date;
    sessionId: string;
  } | null;
};

/** Tenant id for list/detail queries in Admin and tenant-scoped apps. */
export function tenantScopeId(ctx: TenantScopedContext): string {
  return ctx.activeTenantId;
}
