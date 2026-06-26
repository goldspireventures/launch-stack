#!/usr/bin/env node
/**
 * Tier 1 factory certification gate — dating + booking.
 *
 * Maps automated steps to docs/studio/tier1-*-factory-certification.md rows.
 * CEO sign-off on those docs is still required for public sales.
 *
 *   pnpm certify:tier1              # static + audits + smoke (T1 apps) + E2E
 *   pnpm certify:tier1 --offline    # static + commercial-sync audit only
 *   pnpm certify:tier1 --skip-prep  # stack warm; skip verify:local
 *   pnpm certify:tier1 --no-e2e     # smoke + static only
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRootEnv, repoRoot } from './setup/load-root-env.mjs';

loadRootEnv();

const offline = process.argv.includes('--offline');
const skipPrep = process.argv.includes('--skip-prep');
const noE2e = process.argv.includes('--no-e2e');

const startedAt = new Date().toISOString();
const criteria = [];
const steps = [];

function record(id, ok, detail, automated = true) {
  criteria.push({ id, ok, detail, automated });
}

function run(cmd, label, criterionIds = []) {
  console.log(`\n── ${label} ──\n> ${cmd}\n`);
  const t0 = Date.now();
  try {
    execSync(cmd, { cwd: repoRoot, stdio: 'inherit', env: process.env });
    steps.push({ label, cmd, ok: true, ms: Date.now() - t0 });
    for (const id of criterionIds) record(id, true, label);
    return true;
  } catch {
    steps.push({ label, cmd, ok: false, ms: Date.now() - t0 });
    for (const id of criterionIds) record(id, false, `${label} failed`);
    return false;
  }
}

function runStatic() {
  const out = execSync('pnpm exec tsx scripts/certify-tier1-static.ts', {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
  });
  console.log(out);
  record('1.1.3', true, 'Four dating SKUs + factory presets (static)');
  record('1.2.3', true, 'Booking preset matches pricing floor (static)');
}

try {
  console.log('\n══ Tier 1 factory certification gate ══\n');

  try {
    runStatic();
  } catch {
    record('1.1.3', false, 'Static preset/SKU checks failed');
    record('1.2.3', false, 'Static booking floor check failed');
    throw new Error('Static checks failed');
  }

  run('pnpm audit:commercial-sync', 'Commercial sync audit', ['1.2.6']);

  if (!offline) {
    if (!skipPrep) {
      run('pnpm verify:local', 'verify:local', []);
    }

    process.env.SMOKE_ONLY = 'Heartline,Nova Care';
    const smokeOk = run(
      'node scripts/smoke-golden-paths.mjs',
      'HTTP smoke (Heartline + Nova Care)',
      ['1.1.1', '1.2.1'],
    );
    delete process.env.SMOKE_ONLY;

    if (!smokeOk) {
      console.error('\nTip: pnpm dev:studio then retry, or set NEXT_PUBLIC_HEARTLINE_DEMO_URL / NOVA_CARE URLs.\n');
    }

    if (!noE2e) {
      run('pnpm e2e:clean', 'E2E clean', []);
      run(
        'pnpm --filter @goldspire/e2e exec playwright test --workers=1 --project=heartline --project=build-plan',
        'Playwright heartline + build-plan (incl. nova-care-golden)',
        ['1.1.2', '1.2.2'],
      );
      run(
        'pnpm --filter @goldspire/e2e exec playwright test --workers=1 --project=portal',
        'Playwright portal (sales + tier2 sign-offs)',
        [],
      );
    }
  } else {
    run('pnpm --filter @goldspire/commercial test', 'Commercial unit tests', []);
  }

  const failed = criteria.filter((c) => !c.ok);
  const result = {
    version: 'tier1-factory-1.0.0',
    certifiedAt: new Date().toISOString(),
    startedAt,
    offline,
    skipPrep,
    noE2e,
    status: failed.length === 0 ? 'passed' : 'failed',
    criteria,
    steps,
    manualStillRequired: [
      'docs/studio/tier1-dating-factory-certification.md — rows 1.1.4–1.1.9 + CEO sign-off',
      'docs/studio/tier1-booking-factory-certification.md — rows 1.2.4–1.2.7 + CEO sign-off',
      'docs/deployment/phase-0-revenue-ready.md — Wave 0 production',
    ],
  };

  const outPath = join(repoRoot, 'certify-tier1-factory.result.json');
  writeFileSync(outPath, JSON.stringify(result, null, 2));

  if (failed.length > 0) {
    console.error(`\n✗ Tier 1 factory gate failed (${failed.length} criteria). See ${outPath}\n`);
    process.exit(1);
  }

  console.log(`\n✓ Tier 1 automated gate passed. Record: certify-tier1-factory.result.json`);
  console.log('Sign factory certs + phase-0 when manual rows are true.\n');
} catch (e) {
  const result = {
    version: 'tier1-factory-1.0.0',
    certifiedAt: new Date().toISOString(),
    startedAt,
    offline,
    skipPrep,
    noE2e,
    status: 'failed',
    criteria,
    steps,
    error: e instanceof Error ? e.message : String(e),
  };
  writeFileSync(join(repoRoot, 'certify-tier1-factory.result.json'), JSON.stringify(result, null, 2));
  process.exit(1);
}
