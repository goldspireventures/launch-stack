#!/usr/bin/env node
/**
 * Start production Next servers for Playwright CI (after `pnpm build`).
 * Usage: node scripts/e2e-ci-stack.mjs
 */
import { spawn } from 'node:child_process';
import { loadRootEnv, repoRoot } from './setup/load-root-env.mjs';

loadRootEnv();

const APPS = [
  { filter: '@goldspire/goldspire-web', port: 3010 },
  { filter: '@goldspire/console', port: 3001 },
  { filter: '@goldspire/dating-web', port: 3000 },
  { filter: '@goldspire/client-portal', port: 3005 },
  { filter: '@goldspire/booking-web', port: 3015 },
  { filter: '@goldspire/marketplace-web', port: 3011 },
  { filter: '@goldspire/community-web', port: 3012 },
  { filter: '@goldspire/ai-agent-web', port: 3013 },
  { filter: '@goldspire/b2b-saas-web', port: 3014 },
  { filter: '@goldspire/atlas', port: 3016 },
];

const baseEnv = {
  ...process.env,
  AUTH_PROVIDER: 'mock',
  PAYMENT_PROVIDER: 'mock',
  AI_PROVIDER: 'mock',
  E2E_MOCK_STUDIO_AUTH: '1',
  NODE_ENV: 'production',
};

const children = [];

for (const { filter, port } of APPS) {
  const child = spawn('pnpm', ['--filter', filter, 'start'], {
    cwd: repoRoot,
    env: baseEnv,
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
  children.push(child);
  console.log(`started ${filter} :${port}`);
}

const HEALTH = APPS.map(({ port }) => `http://127.0.0.1:${port}/api/health`);

async function waitForHealth(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  return false;
}

console.log('\nWaiting for health endpoints…\n');
let failed = 0;
for (const url of HEALTH) {
  const ok = await waitForHealth(url);
  if (ok) console.log(`  ✓ ${url}`);
  else {
    console.error(`  ✗ ${url}`);
    failed++;
  }
}

if (failed > 0) process.exit(1);
console.log('\nE2E stack ready.\n');
