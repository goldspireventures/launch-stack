import { eq } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import { env } from '@goldspire/config/env';
import { generateDeployWebhookSecret, sha256HexUtf8 } from '@goldspire/payments';
import { logAudit } from '@goldspire/audit';
import type { Role } from '@goldspire/config';

export type DealDeployHookBundle = {
  secret: string;
  endpoint: string;
  curl: string;
};

/**
 * Ensures a deal has a deploy webhook secret; returns curl for CI when newly rotated.
 */
export async function ensureDealDeployHook(opts: {
  db: Database;
  dealId: string;
  actor: { id: string; role: Role };
  via: string;
}): Promise<{ created: boolean; hook: DealDeployHookBundle | null }> {
  const [deal] = await opts.db
    .select({
      id: schema.studioDeal.id,
      deployWebhookSecretHash: schema.studioDeal.deployWebhookSecretHash,
    })
    .from(schema.studioDeal)
    .where(eq(schema.studioDeal.id, opts.dealId))
    .limit(1);
  if (!deal) return { created: false, hook: null };
  if (deal.deployWebhookSecretHash) return { created: false, hook: null };

  const raw = generateDeployWebhookSecret();
  const hash = sha256HexUtf8(raw);
  await opts.db
    .update(schema.studioDeal)
    .set({ deployWebhookSecretHash: hash, updatedAt: new Date() })
    .where(eq(schema.studioDeal.id, deal.id));

  const base = env.NEXT_PUBLIC_CONSOLE_URL.replace(/\/$/, '');
  const endpoint = `${base}/api/webhooks/studio-deal-deploy`;
  const curl = [
    `curl -X POST "${endpoint}?dealId=${deal.id}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "X-Studio-Deploy-Secret: ${raw}" \\`,
    `  -d '{"url":"https://staging.example.com","commitSha":"optional-git-sha"}'`,
  ].join('\n');

  await logAudit({
    tenantId: null,
    actorId: opts.actor.id,
    actorRole: opts.actor.role,
    action: 'studio_deal_deploy_hook_rotated',
    entityType: 'studio_deal',
    entityId: deal.id,
    metadata: { via: opts.via },
  });

  return {
    created: true,
    hook: { secret: raw, endpoint, curl },
  };
}
