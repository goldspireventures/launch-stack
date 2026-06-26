/**
 * HTTP smoke: POST /api/webhooks/studio-deal-deploy (same contract as production).
 *
 * Usage (repo root):
 *   1. Start console: pnpm --filter @goldspire/console dev
 *   2. Copy scripts/env.smoke.example → .env.smoke and fill values (gitignored), or export vars.
 *   3. pnpm smoke:deploy-webhook
 *
 * Needs you: deal id + raw secret from Deal desk → Rotate staging CI hook.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvSmokeFileSync(): void {
  const path = resolve(process.cwd(), '.env.smoke');
  if (!existsSync(path)) return;

  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

async function main(): Promise<void> {
  loadEnvSmokeFileSync();

  const base = (
    process.env.STUDIO_DEPLOY_SMOKE_URL ??
    process.env.NEXT_PUBLIC_CONSOLE_URL ??
    'http://localhost:4001'
  ).replace(/\/$/, '');

  const dealId =
    process.env.STUDIO_DEPLOY_SMOKE_DEAL_ID ?? process.env.DEAL_ID ?? process.env.STUDIO_DEPLOY_DEAL_ID;
  const secret =
    process.env.STUDIO_DEPLOY_SMOKE_SECRET ?? process.env.STUDIO_DEPLOY_SECRET ?? process.env.X_STUDIO_DEPLOY_SECRET;

  if (!dealId?.trim()) {
    console.error('Missing deal id. Set STUDIO_DEPLOY_SMOKE_DEAL_ID (26-char ULID).');
    process.exit(1);
  }
  if (dealId.length !== 26) {
    console.error(`deal id must be 26 chars, got ${dealId.length}.`);
    process.exit(1);
  }
  if (!secret?.trim()) {
    console.error('Missing secret. Set STUDIO_DEPLOY_SMOKE_SECRET (raw gsdp_… from rotate).');
    process.exit(1);
  }

  const urlParam = new URL(process.env.STUDIO_DEPLOY_SMOKE_STAGING_URL ?? 'https://smoke-test.example').href;
  const commitSha = process.env.STUDIO_DEPLOY_SMOKE_COMMIT_SHA?.trim() || undefined;

  const url = `${base}/api/webhooks/studio-deal-deploy?dealId=${encodeURIComponent(dealId)}`;
  console.log('POST', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Studio-Deploy-Secret': secret,
    },
    body: JSON.stringify({ url: urlParam, ...(commitSha ? { commitSha } : {}) }),
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    body = text;
  }

  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(body, null, 2));

  if (!res.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
