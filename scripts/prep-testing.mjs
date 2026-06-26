#!/usr/bin/env node
/**
 * Print testing URLs and optionally verify stack readiness.
 *
 * Usage:
 *   pnpm prep:testing              # verify + print playbook
 *   pnpm prep:testing --quick      # URLs + port probe only (no verify)
 */
import { execSync } from 'node:child_process';
import { loadRootEnv, repoRoot } from './setup/load-root-env.mjs';

loadRootEnv();

const quick = process.argv.includes('--quick');

const PORTAL_ORIGIN =
  process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL?.replace(/\/$/, '') ?? 'http://localhost:4005';
const CONSOLE = process.env.NEXT_PUBLIC_CONSOLE_URL?.replace(/\/$/, '') ?? 'http://localhost:4001';
const ATLAS = process.env.NEXT_PUBLIC_ATLAS_URL?.replace(/\/$/, '') ?? 'http://localhost:4016';
const MARKETING = process.env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL?.replace(/\/$/, '') ?? 'http://localhost:4010';

const DEMO_PORTAL_PATH =
  '/deal/01HNM9S49HY6CC31P21S4Y6K9M?token=gspl_goldspire_sales_demo_26';

const HEARTLINE =
  process.env.NEXT_PUBLIC_HEARTLINE_DEMO_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';

function run(cmd) {
  execSync(cmd, { cwd: repoRoot, stdio: 'inherit', env: process.env });
}

async function probe(label, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: 'follow' });
    if (res.ok) {
      console.log(`  ✓ ${label} — up (${res.status})`);
      return true;
    }
    console.log(`  ✗ ${label} — HTTP ${res.status}`);
    return false;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  ✗ ${label} — ${msg}`);
    return false;
  }
}

if (!quick) {
  console.log('\n── Running local verify (DB, RLS, typecheck) ──\n');
  run('node scripts/setup/verify-local.mjs');
} else {
  console.log('\n── Quick prep (skipping verify:local) ──\n');
}

console.log('\n── Bookmark these (local) ──\n');
console.log(`  Console:        ${CONSOLE}`);
console.log(`  Atlas:          ${ATLAS}`);
console.log(`  Heartline:      ${HEARTLINE}`);
console.log(`  Client portal:  ${PORTAL_ORIGIN}`);
console.log(`  Demo portal:    ${PORTAL_ORIGIN}${DEMO_PORTAL_PATH}`);
console.log(`  Marketing:      ${MARKETING}/contact`);
console.log(`  Delivery guide: ${CONSOLE}/delivery`);
console.log(`  Factory:        ${CONSOLE}/factory`);
console.log(`  Desk:           ${CONSOLE}/`);

console.log('\n── Command Bridge UI (manual, ~10 min) ──\n');
console.log('  1. Console — icon rail, editorial headers, deal cockpit phase rail');
console.log('  2. Client portal — open demo link in incognito; Pulse / Plan / Pay tabs');
console.log('  3. Issue a fresh portal link from a deal → confirm host is :3005');

console.log('\n── Automated (Terminal B, after pnpm dev is Ready) ──\n');
console.log('  pnpm test:e2e:install        # once per machine / after @playwright/test bump');
console.log('  pnpm smoke:golden-paths');
console.log('  pnpm test:e2e');
console.log('  pnpm test:e2e:platform      # release / demo gate (health + studio OS + v2 + funnel)');
console.log('  pnpm test:e2e:demos         # catalog app health (needs full pnpm dev)');
console.log('  pnpm test:e2e:integration   # marketing + console + DB');
console.log('  pnpm prep:demo --quick      # migrate/seed/audits without verify:local');
console.log('  pnpm --filter @goldspire/e2e test -- --project=portal');
console.log('  pnpm --filter @goldspire/e2e test -- --project=console');
console.log('  pnpm --filter @goldspire/e2e test -- --project=atlas');
console.log('  pnpm atlas:reindex                 # after doc/code changes');

console.log('\n── Port probe (optional) ──\n');

const up = await Promise.all([
  probe('Console', `${CONSOLE}/api/health`),
  probe('Atlas', `${ATLAS}/api/health`),
  probe('Client portal', `${PORTAL_ORIGIN}/api/health`),
  probe('Marketing', `${MARKETING}/api/health`),
  probe('Heartline', `${HEARTLINE}/api/health`),
  probe('Demo portal page', `${PORTAL_ORIGIN}${DEMO_PORTAL_PATH}`),
]);

if (!up.some(Boolean)) {
  console.log('\n  Tip: start the stack in another terminal: pnpm dev');
  console.log('  Wait until Turbo shows Ready (~1–2 min), then re-run smoke/tests.\n');
} else if (!up.every(Boolean)) {
  console.log('\n  Some surfaces are down — start missing apps or wait for compile.');
  console.log('  Heartline alone: pnpm --filter @goldspire/dating-web dev (first compile can take ~40s).\n');
} else {
  console.log('\n  All probed surfaces responded — good to run smoke + e2e.\n');
}

console.log('Readiness audit (no dev server required): pnpm audit:testing');
console.log('Full walkthrough: TESTING.md (Parts 1–3b, 5)\n');
