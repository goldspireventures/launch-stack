#!/usr/bin/env node
/**
 * Goldspire Launch Stack — v1 production certification gate.
 *
 * Runs automated tiers 1–3 from docs/deployment/READINESS.md.
 * HTTP smoke + Playwright require the dev stack to be up (all catalog ports).
 *
 *   pnpm certify:v1              # full (migrate/seed/verify + audits + HTTP + E2E)
 *   pnpm certify:v1 --skip-prep  # stack already warm, DB already seeded
 *   pnpm certify:v1 --offline    # verify:local + unit/commercial tests only
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRootEnv, repoRoot } from './setup/load-root-env.mjs';

loadRootEnv();

const skipPrep = process.argv.includes('--skip-prep');
const offline = process.argv.includes('--offline');

const startedAt = new Date().toISOString();
const steps = [];

function run(cmd, label) {
  console.log(`\n── ${label} ──\n> ${cmd}\n`);
  const t0 = Date.now();
  execSync(cmd, { cwd: repoRoot, stdio: 'inherit', env: process.env });
  steps.push({ label, cmd, ok: true, ms: Date.now() - t0 });
}

try {
  console.log('\n══ Goldspire v1 certification gate ══\n');

  if (!offline) {
    if (!skipPrep) {
      run('pnpm prep:demo', 'Tier 1 — prep:demo (migrate, seed, verify, audits)');
    } else {
      run('pnpm verify:local', 'Tier 1 — verify:local');
    }

    run('pnpm prep:testing --quick', 'Tier 2 — port probe');
    run('pnpm smoke:golden-paths', 'Tier 3 — HTTP smoke (31 routes)');
    run('pnpm e2e:clean', 'E2E — clean artifacts');
    run(
      'pnpm --filter @goldspire/e2e exec playwright test --workers=1 --project=platform-full --project=golden-platform',
      'Tier 3 — Playwright golden platform',
    );
    run('pnpm --filter @goldspire/e2e exec playwright test --project=demos', 'Tier 3 — catalog demos');
  } else {
    run('pnpm verify:local', 'Tier 1 — verify:local (offline)');
    run('pnpm --filter @goldspire/commercial test', 'Commercial unit tests');
  }

  const result = {
    version: 'v1.0.0',
    certifiedAt: new Date().toISOString(),
    startedAt,
    offline,
    skipPrep,
    steps,
    status: 'passed',
  };
  const outPath = join(repoRoot, 'certify-v1.result.json');
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\n✓ v1 certification gate passed. Record written to certify-v1.result.json\n`);
  console.log('Manual sign-off still required: docs/deployment/operator-sign-off.md\n');
} catch (e) {
  const result = {
    version: 'v1.0.0',
    certifiedAt: new Date().toISOString(),
    startedAt,
    offline,
    skipPrep,
    steps,
    status: 'failed',
    error: e instanceof Error ? e.message : String(e),
  };
  writeFileSync(join(repoRoot, 'certify-v1.result.json'), JSON.stringify(result, null, 2));
  process.exit(1);
}
