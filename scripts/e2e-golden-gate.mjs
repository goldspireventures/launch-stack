#!/usr/bin/env node
/**
 * Full local E2E gate — prep DB, probe stack, clean artifacts, run golden + catalog smoke.
 *
 * Prereq: all dev apps listening (see prep:testing URLs) or CI stack.
 *
 *   node scripts/e2e-golden-gate.mjs
 *   node scripts/e2e-golden-gate.mjs --skip-prep    # stack + DB already warm
 */
import { execSync } from 'node:child_process';
import { loadRootEnv, repoRoot } from './setup/load-root-env.mjs';

loadRootEnv();

const skipPrep = process.argv.includes('--skip-prep');

function run(cmd) {
  execSync(cmd, { cwd: repoRoot, stdio: 'inherit', env: process.env });
}

console.log('\n══ Goldspire E2E golden gate ══\n');

if (!skipPrep) {
  run('pnpm prep:demo');
}

run('pnpm prep:testing --quick');
run('pnpm smoke:golden-paths');
run('pnpm e2e:clean');
run('pnpm test:e2e:golden');
run('pnpm test:e2e:demos');

console.log('\nGolden gate complete. For full regression: pnpm test:e2e:platform\n');
