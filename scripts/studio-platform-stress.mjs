#!/usr/bin/env node
/**
 * Studio platform stress gate — RBAC matrix, commercial invariants, optional E2E.
 *
 * Usage:
 *   node scripts/studio-platform-stress.mjs
 *   node scripts/studio-platform-stress.mjs --e2e-rbac
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const withE2e = process.argv.includes('--e2e-rbac');

function run(label, cmd, args, opts = {}) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) {
    console.error(`✗ ${label} failed (exit ${r.status ?? 1})`);
    process.exit(r.status ?? 1);
  }
  console.log(`✓ ${label}`);
}

run('Commercial unit tests (RBAC + nav + lifecycle)', 'pnpm', ['--filter', '@goldspire/commercial', 'test']);
run('API typecheck', 'pnpm', ['--filter', '@goldspire/api', 'typecheck']);
run('Console typecheck', 'pnpm', ['--filter', '@goldspire/console', 'typecheck']);

if (withE2e) {
  run('Studio RBAC E2E', 'pnpm', ['exec', 'playwright', 'test', 'e2e/tests/studio-rbac.spec.ts', '--config=e2e/playwright.config.ts']);
}

console.log('\n✓ Studio platform stress gate passed');
