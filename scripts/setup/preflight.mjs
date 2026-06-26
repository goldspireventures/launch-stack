#!/usr/bin/env node
/**
 * Preflight — verify local machine can run the Goldspire stack.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadRootEnv, repoRoot as root } from './load-root-env.mjs';

loadRootEnv();
const errors = [];
const warnings = [];

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  errors.push(msg);
  console.error(`  ✗ ${msg}`);
}

function warn(msg) {
  warnings.push(msg);
  console.warn(`  ! ${msg}`);
}

console.log('\nGoldspire preflight\n');

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= 20) ok(`Node ${process.versions.node}`);
else fail(`Node >= 20 required (found ${process.versions.node})`);

try {
  const { execSync } = await import('node:child_process');
  const pnpmV = execSync('pnpm --version', { encoding: 'utf8' }).trim();
  ok(`pnpm ${pnpmV}`);
} catch {
  fail('pnpm not found');
}

const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) ok('.env present');
else warn('.env missing — copy from .env.example');

if (process.env.DATABASE_URL) {
  try {
    const { execSync } = await import('node:child_process');
    execSync('pnpm test:rls', { cwd: root, stdio: 'pipe', env: process.env });
    ok('DATABASE_URL reachable (RLS probe passed)');
  } catch (e) {
    fail(
      `DATABASE_URL / RLS check failed — set DATABASE_URL in .env (Supabase pooler OK), then pnpm db:migrate && pnpm db:seed`,
    );
  }
} else {
  warn('DATABASE_URL unset — DB checks skipped');
}

const goldenPathsDoc = path.join(root, 'docs/deployment/golden-paths.md');
if (fs.existsSync(goldenPathsDoc)) ok('golden-paths.md present');

console.log('');
if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  - ${w}`));
}
if (errors.length) {
  console.error(`\nPreflight failed (${errors.length} issue(s)).\n`);
  process.exit(1);
}
console.log('\nPreflight passed.\n');
