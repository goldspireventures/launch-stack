#!/usr/bin/env node
/**
 * Push selected .env keys to the goldspire-web Vercel project (production).
 * Usage: node scripts/setup/sync-goldspire-web-vercel-env.mjs
 * Never prints secret values.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const envPath = join(root, '.env');
const appDir = join(root, 'apps/goldspire-web');

/** Minimum for goldspire.dev health + contact form persistence. */
const KEYS = [
  'DATABASE_URL',
  'DATABASE_URL_APP',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AUTH_PROVIDER',
  'NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL',
];

function parseDotenv(raw) {
  const out = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = parseDotenv(readFileSync(envPath, 'utf8'));
console.log('\nSyncing goldspire-web production env (livia-hq)…\n');

for (const key of KEYS) {
  const value = env[key]?.trim();
  if (!value) {
    console.log(`  skip ${key} — not in .env`);
    continue;
  }
  try {
    execFileSync(
      'vercel',
      ['env', 'add', key, 'production', '--value', value, '--yes', '--force', '--sensitive', '--scope', 'livia-hq'],
      { cwd: appDir, stdio: 'pipe', shell: process.platform === 'win32' },
    );
    console.log(`  ✓ ${key}`);
  } catch (e) {
    console.error(`  ✗ ${key} — ${e.stderr?.toString?.() || e.message}`);
    process.exitCode = 1;
  }
}

console.log('\nDone. Redeploy goldspire-web for changes to take effect.\n');
