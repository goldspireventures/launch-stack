#!/usr/bin/env node
/**
 * One-shot prep before a full platform demo or `pnpm test:e2e:platform`.
 *
 *   pnpm prep:demo              # migrate + seed + verify + audits + URL playbook
 *   pnpm prep:demo --quick      # skip verify:local (faster repeat)
 *   pnpm prep:demo --no-seed    # skip db:seed
 *   pnpm prep:demo --e2e        # run platform Playwright gate after prep
 */
import { execSync } from 'node:child_process';
import { loadRootEnv, repoRoot } from './setup/load-root-env.mjs';

loadRootEnv();

const quick = process.argv.includes('--quick');
const noSeed = process.argv.includes('--no-seed');
const runE2e = process.argv.includes('--e2e');

const CONSOLE = process.env.NEXT_PUBLIC_CONSOLE_URL?.replace(/\/$/, '') ?? 'http://localhost:4001';
const ATLAS = process.env.NEXT_PUBLIC_ATLAS_URL?.replace(/\/$/, '') ?? 'http://localhost:4016';
const MARKETING = process.env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL?.replace(/\/$/, '') ?? 'http://localhost:4010';
const PORTAL = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL?.replace(/\/$/, '') ?? 'http://localhost:4005';
const HEARTLINE = process.env.NEXT_PUBLIC_HEARTLINE_DEMO_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';
const DEMO_PORTAL =
  '/deal/01HNM9S49HY6CC31P21S4Y6K9M?token=gspl_goldspire_sales_demo_26';

function run(cmd) {
  execSync(cmd, { cwd: repoRoot, stdio: 'inherit', env: process.env });
}

console.log('\n══ Goldspire — full platform demo prep ══\n');

run('pnpm db:migrate');
if (!noSeed) {
  run('pnpm db:seed');
  run('pnpm --filter @goldspire/db fixup:heartline');
  run('pnpm --filter @goldspire/db fixup:heartline-walkthrough');
  run('pnpm --filter @goldspire/db fixup:moderation-demo');
  run('pnpm atlas:reindex');
}

if (!quick) {
  console.log('\n── verify:local ──\n');
  run('node scripts/setup/verify-local.mjs');
}

console.log('\n── studio audits ──\n');
run('pnpm audit:studio-business');
run('pnpm audit:commercial-sync');
run('pnpm --filter @goldspire/commercial test');

console.log('\n── Live demo script (~15 min, two terminals) ──\n');
console.log('  Terminal A:  pnpm dev');
console.log('  Terminal B:  pnpm prep:testing --quick   # port probe after Turbo Ready\n');
console.log('  1. Marketing     ' + MARKETING + '/contact → submit brief');
console.log('  2. Console Desk  ' + CONSOLE + '/ → action queue + telemetry strip');
console.log('  3. Enquiries     ' + CONSOLE + '/leads → triage / convert');
console.log('  4. Commercial    ' + CONSOLE + '/commercial → three pricing layers');
console.log('  5. Deal desk     ' + CONSOLE + '/deals → issue portal link');
console.log('  6. Portal (incog) ' + PORTAL + DEMO_PORTAL);
console.log('  7. Settings v2   ' + CONSOLE + '/settings → enquiry routing + billing');
console.log('  8. Heartline     ' + HEARTLINE + ' — Sarah (free) / Jamie (Plus) — docs/heartline/SHOWCASE.md');
console.log('  8b. Mobile       pnpm --filter @goldspire/dating-mobile dev:clear (API on :3000)');
console.log('  8c. Screenshots  cd e2e && pnpm run screenshots:heartline (web :3000 + expo web :8081)');
console.log('  9. Atlas         ' + ATLAS + ' → ask a platform question (studio owner)\n');

console.log('── Automated gate (stack must be up) ──\n');
console.log('  pnpm smoke:golden-paths');
console.log('  pnpm test:e2e:platform\n');

if (runE2e) {
  console.log('── Running Playwright platform gate ──\n');
  run('pnpm test:e2e:platform');
}

console.log('Done. See TESTING.md Part 8 and DEMO.md for narrative.\n');
