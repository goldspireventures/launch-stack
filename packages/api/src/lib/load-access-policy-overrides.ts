import { eq } from 'drizzle-orm';
import * as schema from '@goldspire/db/schema';
import type { AccessPolicyOverrideRecord, AccessPolicyRule } from '@goldspire/access';
import type { Context } from '../context';

function mapRow(row: typeof schema.accessPolicyOverride.$inferSelect): AccessPolicyOverrideRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    role: row.role,
    grantCapabilities: (row.grantCapabilities ?? []) as string[],
    denyCapabilities: (row.denyCapabilities ?? []) as string[],
    policyRules: (row.policyRules ?? []) as AccessPolicyRule[],
    enabled: row.enabled,
  };
}

export async function loadAccessPolicyOverrides(
  db: Context['db'],
): Promise<AccessPolicyOverrideRecord[]> {
  const rows = await db
    .select()
    .from(schema.accessPolicyOverride)
    .where(eq(schema.accessPolicyOverride.enabled, true));
  return rows.map(mapRow);
}
