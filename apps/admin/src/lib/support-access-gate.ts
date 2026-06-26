import { db, schema } from '@goldspire/db';
import { and, eq, gt, isNull } from 'drizzle-orm';

async function resolveTenantId(hint: string): Promise<string | null> {
  const trimmed = hint.trim();
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

/** Server-side gate: studio user may only enter Admin with an active support session. */
export async function canStudioAccessTenantAdmin(
  studioUserId: string,
  tenantHint: string,
): Promise<boolean> {
  const tenantId = await resolveTenantId(tenantHint);
  if (!tenantId) return false;
  const now = new Date();
  const [session] = await db
    .select({ id: schema.supportAccessSession.id })
    .from(schema.supportAccessSession)
    .where(
      and(
        eq(schema.supportAccessSession.studioUserId, studioUserId),
        eq(schema.supportAccessSession.tenantId, tenantId),
        isNull(schema.supportAccessSession.revokedAt),
        gt(schema.supportAccessSession.expiresAt, now),
      ),
    )
    .limit(1);
  return Boolean(session);
}
