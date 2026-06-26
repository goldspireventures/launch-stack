#!/usr/bin/env node
/**
 * Repo testing readiness audit (no HTTP smoke — use prep:testing / smoke:golden-paths when dev is up).
 *
 *   pnpm audit:testing           # static checks + optional port probe
 *   pnpm audit:testing --full    # also runs verify:local (DB, RLS, typecheck)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { loadRootEnv, repoRoot } from './setup/load-root-env.mjs';

loadRootEnv();

const full = process.argv.includes('--full');
const issues = [];
const ok = [];

function pass(msg) {
  ok.push(msg);
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  issues.push(msg);
  console.error(`  ✗ ${msg}`);
}

function warn(msg) {
  console.warn(`  ! ${msg}`);
}

console.log('\n── Goldspire testing audit ──\n');

if (Number(process.versions.node.split('.')[0]) >= 20) pass(`Node ${process.versions.node}`);
else fail(`Node >= 20 required (found ${process.versions.node})`);

try {
  pass(`pnpm ${execSync('pnpm --version', { encoding: 'utf8' }).trim()}`);
} catch {
  fail('pnpm not found');
}

if (fs.existsSync(path.join(repoRoot, '.env'))) pass('.env present');
else fail('.env missing — copy from .env.example');

if (process.env.AUTH_PROVIDER === 'mock') pass('AUTH_PROVIDER=mock');
else warn(`AUTH_PROVIDER=${process.env.AUTH_PROVIDER ?? '(unset)'} — use mock for local E2E`);

const appsDir = path.join(repoRoot, 'apps');
const appDirs = fs.readdirSync(appsDir).filter((d) => fs.existsSync(path.join(appsDir, d, 'next.config.mjs')));
const missingEnvLoad = [];
for (const app of appDirs) {
  const cfg = fs.readFileSync(path.join(appsDir, app, 'next.config.mjs'), 'utf8');
  if (!cfg.includes('loadMonorepoRootEnv') && !cfg.includes('loadEnvFile')) {
    missingEnvLoad.push(app);
  }
}
if (missingEnvLoad.length === 0) pass(`All ${appDirs.length} Next apps load monorepo .env`);
else fail(`Apps missing root .env load: ${missingEnvLoad.join(', ')}`);

const pwCli = path.join(repoRoot, 'e2e', 'node_modules', '.bin', 'playwright');
const pwCliWin = `${pwCli}.CMD`;
if (fs.existsSync(pwCli) || fs.existsSync(pwCliWin)) pass('Playwright installed (e2e/)');
else fail('Playwright missing — run: pnpm test:e2e:install');

const keyScripts = [
  'verify:local',
  'smoke:golden-paths',
  'test:e2e',
  'test:e2e:platform',
  'test:e2e:demos',
  'test:e2e:integration',
  'prep:testing',
  'prep:demo',
  'db:migrate',
  'db:seed',
  'test:rls',
  'audit:studio-business',
];
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
for (const s of keyScripts) {
  if (pkg.scripts?.[s]) pass(`script: ${s}`);
  else fail(`missing script: ${s}`);
}

if (full) {
  console.log('\n── Running verify:local (may take several minutes) ──\n');
  try {
    execSync('node scripts/setup/verify-local.mjs', { cwd: repoRoot, stdio: 'inherit', env: process.env });
    pass('verify:local completed');
  } catch {
    fail('verify:local failed');
  }
}

console.log('\n── Port probe (skipped if stack not running) ──\n');
const surfaces = [
  ['Console', process.env.NEXT_PUBLIC_CONSOLE_URL ?? 'http://localhost:4001'],
  ['Marketing', process.env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL ?? 'http://localhost:4010'],
  ['Client portal', process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL ?? 'http://localhost:4005'],
  ['Heartline', process.env.NEXT_PUBLIC_HEARTLINE_DEMO_URL ?? 'http://localhost:4000'],
];
let anyUp = false;
for (const [label, base] of surfaces) {
  const url = `${base.replace(/\/$/, '')}/api/health`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (res.ok) {
      pass(`${label} health (${url})`);
      anyUp = true;
    } else warn(`${label} HTTP ${res.status}`);
  } catch {
    warn(`${label} not reachable — run pnpm dev`);
  }
}

console.log('\n── Summary ──\n');
console.log(`  Checks passed: ${ok.length}`);
if (issues.length) {
  console.log(`  Blockers:      ${issues.length}`);
  for (const i of issues) console.log(`    - ${i}`);
  process.exit(1);
}
if (!anyUp) {
  console.log('  Stack not running — start: pnpm dev');
  console.log('  Then: pnpm prep:testing:quick && pnpm smoke:golden-paths && pnpm test:e2e\n');
} else {
  console.log('  Stack is up — run: pnpm smoke:golden-paths && pnpm test:e2e\n');
}
