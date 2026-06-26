#!/usr/bin/env node
/**
 * Local readiness gate (tiers 1–2): env, DB, RLS, typecheck, runbook scan.
 * HTTP smoke is separate — run after `pnpm dev` is warm: pnpm smoke:golden-paths
 *
 * Usage: pnpm verify:local
 */
import { execSync } from 'node:child_process';
import { loadRootEnv, repoRoot } from './load-root-env.mjs';

loadRootEnv();

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { cwd: repoRoot, stdio: 'inherit', env: process.env, ...opts });
}

console.log('\n── Goldspire local verify ──\n');

run('node scripts/setup/preflight.mjs');
run('pnpm db:migrate');
run('pnpm --filter @goldspire/db test:rls');
run(
  'pnpm --filter @goldspire/commercial --filter @goldspire/api --filter @goldspire/console --filter @goldspire/client-portal typecheck',
);
run('pnpm studio:runbook-alerts');

console.log('\n── Next (with stack running) ──\n');
console.log('  1. pnpm dev   → wait until catalog apps show Ready (~1–2 min cold start)');
console.log('  2. pnpm smoke:golden-paths');
console.log('  3. pnpm test:e2e');
console.log('  4. Walk TESTING.md Parts 1–3 (contact → lead → portal)\n');
console.log('Local verify complete.\n');
