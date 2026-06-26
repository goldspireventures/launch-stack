import { eq } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import { pickRoundRobinAssignee } from '@goldspire/commercial';
import { getStudioTenantSlug } from '@goldspire/config/studio-tenant';
const CONSOLE_STUDIO_PROFILE_KEY = 'consoleStudioProfile';

export type StudioLeadRoutingProfile = {
  leadAssigneeUserIds?: string[];
  leadAssignRoundRobinIndex?: number;
};

export async function loadStudioLeadRoutingProfile(
  db: Database,
): Promise<{ tenantId: string; routing: StudioLeadRoutingProfile } | null> {
  const [t] = await db
    .select({ id: schema.tenant.id, metadata: schema.tenant.metadata })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, getStudioTenantSlug()))
    .limit(1);
  if (!t) return null;
  const raw = (t.metadata as Record<string, unknown>)[CONSOLE_STUDIO_PROFILE_KEY];
  const routing =
    raw && typeof raw === 'object'
      ? (raw as StudioLeadRoutingProfile)
      : ({} as StudioLeadRoutingProfile);
  return { tenantId: t.id, routing };
}

/**
 * Round-robin assignee for a new enquiry. Updates profile index on the goldspire tenant row.
 */
export async function assignLeadOwnerOnSubmit(
  db: Database,
  leadId: string,
): Promise<string | null> {
  const loaded = await loadStudioLeadRoutingProfile(db);
  if (!loaded) return null;

  const userIds = loaded.routing.leadAssigneeUserIds ?? [];
  const picked = pickRoundRobinAssignee(userIds, loaded.routing.leadAssignRoundRobinIndex ?? 0);
  if (!picked) return null;

  const [t] = await db
    .select({ id: schema.tenant.id, metadata: schema.tenant.metadata })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, getStudioTenantSlug()))
    .limit(1);
  if (!t) return null;

  const meta = { ...(t.metadata as Record<string, unknown>) };
  const profile = {
    ...((meta[CONSOLE_STUDIO_PROFILE_KEY] as Record<string, unknown> | undefined) ?? {}),
    leadAssigneeUserIds: userIds,
    leadAssignRoundRobinIndex: picked.nextIndex,
  };
  meta[CONSOLE_STUDIO_PROFILE_KEY] = profile;

  await db
    .update(schema.marketingLead)
    .set({ assignedToUserId: picked.assigneeId, updatedAt: new Date() })
    .where(eq(schema.marketingLead.id, leadId));

  await db
    .update(schema.tenant)
    .set({ metadata: meta, updatedAt: new Date() })
    .where(eq(schema.tenant.id, t.id));

  return picked.assigneeId;
}
