import { applyStudioDealStagingDeploy } from '@goldspire/payments';
import { db } from '@goldspire/db';
import { logAudit } from '@goldspire/audit';

/**
 * CI / GitHub Actions / Vercel can POST here after a staging deploy.
 * Rotate the secret from Deal desk → "Rotate staging CI hook" first.
 */
export async function POST(req: Request) {
  const urlObj = new URL(req.url);
  const dealId = urlObj.searchParams.get('dealId');
  const secret = req.headers.get('x-studio-deploy-secret');
  if (!dealId || dealId.length !== 26 || !secret?.trim()) {
    return Response.json(
      { error: 'Query dealId (26-char ULID) and header X-Studio-Deploy-Secret are required.' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON body required' }, { status: 400 });
  }
  const rec = body as { url?: unknown; commitSha?: unknown };
  if (typeof rec.url !== 'string' || !rec.url.trim()) {
    return Response.json({ error: 'Body must include string "url"' }, { status: 400 });
  }
  if (!URL.canParse(rec.url)) {
    return Response.json({ error: 'Invalid url' }, { status: 400 });
  }

  const commitSha = typeof rec.commitSha === 'string' && rec.commitSha.trim() ? rec.commitSha.trim() : undefined;

  const result = await applyStudioDealStagingDeploy({
    db,
    dealId,
    secretHeader: secret,
    url: rec.url.trim(),
    commitSha,
  });

  if (!result.ok) {
    const status = result.reason === 'unauthorized' ? 401 : 404;
    return Response.json({ error: result.reason }, { status });
  }

  await logAudit({
    tenantId: result.linkedTenantId,
    actorId: null,
    actorRole: null,
    action: 'studio_deal_staging_deploy',
    entityType: 'studio_deal',
    entityId: dealId,
    metadata: { url: rec.url.trim(), commitSha, updatedMilestoneKey: result.updatedMilestoneKey },
  });

  return Response.json({ ok: true, updatedMilestoneKey: result.updatedMilestoneKey });
}
