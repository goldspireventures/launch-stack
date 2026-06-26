#!/usr/bin/env node
/**
 * Bootstrap — install, migrate, seed, print demo URLs.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env });
}

console.log('\nGoldspire bootstrap\n');

if (!fs.existsSync(path.join(root, '.env'))) {
  fs.copyFileSync(path.join(root, '.env.example'), path.join(root, '.env'));
  console.log('Created .env from .env.example — edit DATABASE_URL if needed.\n');
}

run('pnpm install --frozen-lockfile');
run('pnpm db:migrate');
run('pnpm db:seed');

console.log('\n── Demo URLs (pnpm dev) ──\n');
console.log('  Marketing     http://localhost:4010');
console.log('  Heartline     http://localhost:4000');
console.log('  Nova Care     http://localhost:4015');
console.log('  Bazaar        http://localhost:4011');
console.log('  Signal        http://localhost:4012');
console.log('  Lumen         http://localhost:4013');
console.log('  Acme          http://localhost:4014');
console.log('  Console       http://localhost:4001');
console.log('  Client portal http://localhost:4005');
console.log('\n  Verify: pnpm verify:local');
console.log('  Dev:    pnpm dev');
console.log('  Smoke:  pnpm smoke:golden-paths  (after dev is warm)');
console.log('  E2E:    pnpm test:e2e');
console.log('  Docs:   docs/deployment/READINESS.md\n');
