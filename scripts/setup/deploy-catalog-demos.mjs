#!/usr/bin/env node
/**
 * Deploy catalog demo apps to Vercel (livia-hq) and wire demo URLs on goldspire-web.
 *
 * Usage:
 *   node scripts/setup/deploy-catalog-demos.mjs           # deploy all
 *   node scripts/setup/deploy-catalog-demos.mjs heartline  # single app
 *
 * Requires: vercel CLI logged in, .env at repo root with DB + Supabase keys.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const envPath = join(root, '.env');
const vercel = process.platform === 'win32' ? 'vercel.cmd' : 'vercel';
const scope = 'livia-hq';

/** @type {readonly { id: string; folder: string; package: string; project: string; subdomain: string; demoEnvKey: string }[]} */
const DEMOS = [
  {
    id: 'heartline',
    folder: 'dating-web',
    package: '@goldspire/dating-web',
    project: 'goldspire-heartline',
    subdomain: 'heartline.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_HEARTLINE_DEMO_URL',
  },
  {
    id: 'nova_care',
    folder: 'booking-web',
    package: '@goldspire/booking-web',
    project: 'goldspire-nova-care',
    subdomain: 'nova.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_NOVA_CARE_DEMO_URL',
  },
  {
    id: 'bazaar',
    folder: 'marketplace-web',
    package: '@goldspire/marketplace-web',
    project: 'goldspire-bazaar',
    subdomain: 'bazaar.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_BAZAAR_DEMO_URL',
  },
  {
    id: 'signal',
    folder: 'community-web',
    package: '@goldspire/community-web',
    project: 'goldspire-signal',
    subdomain: 'signal.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_SIGNAL_DEMO_URL',
  },
  {
    id: 'lumen',
    folder: 'ai-agent-web',
    package: '@goldspire/ai-agent-web',
    project: 'goldspire-lumen',
    subdomain: 'lumen.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_LUMEN_DEMO_URL',
  },
  {
    id: 'acme',
    folder: 'b2b-saas-web',
    package: '@goldspire/b2b-saas-web',
    project: 'goldspire-acme',
    subdomain: 'acme.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_ACME_DEMO_URL',
  },
];

const SHARED_ENV_KEYS = [
  'DATABASE_URL',
  'DATABASE_URL_APP',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'AUTH_PROVIDER',
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

function run(args, opts = {}) {
  return execFileSync(vercel, args, { encoding: 'utf8', ...opts });
}

function addEnv(cwd, key, value, sensitive = true) {
  const args = ['env', 'add', key, 'production', '--value', value, '--yes', '--force', '--scope', scope];
  if (sensitive) args.push('--sensitive');
  run(args, { cwd, stdio: 'pipe' });
}

function ensureProject(demo) {
  const appDir = join(root, 'apps', demo.folder);
  try {
    run(['link', '--project', demo.project, '--yes', '--scope', scope], { cwd: appDir, stdio: 'pipe' });
    console.log(`  linked ${demo.project}`);
  } catch {
    console.log(`  creating ${demo.project}…`);
    run(['link', '--yes', '--scope', scope], { cwd: appDir, stdio: 'pipe' });
  }
}

function syncSharedEnv(demo) {
  const appDir = join(root, 'apps', demo.folder);
  const env = parseDotenv(readFileSync(envPath, 'utf8'));
  const marketingUrl = env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL?.trim() || 'https://goldspire.dev';

  for (const key of SHARED_ENV_KEYS) {
    const value = env[key]?.trim();
    if (!value) continue;
    addEnv(appDir, key, value);
  }
  addEnv(appDir, 'NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL', marketingUrl, false);
  addEnv(appDir, 'AUTH_PROVIDER', env.AUTH_PROVIDER?.trim() || 'mock', false);
}

function deployDemo(demo) {
  const appDir = join(root, 'apps', demo.folder);
  console.log(`\n▸ ${demo.id} (${demo.project})`);
  ensureProject(demo);
  syncSharedEnv(demo);
  const out = run(['deploy', '--prod', '--yes', '--scope', scope], { cwd: appDir, stdio: 'pipe' });
  const url = out.trim().split('\n').pop()?.trim();
  console.log(`  deployed → ${url}`);
  try {
    run(['domains', 'add', demo.subdomain, '--scope', scope], { cwd: appDir, stdio: 'pipe' });
    console.log(`  domain → https://${demo.subdomain}`);
    return `https://${demo.subdomain}`;
  } catch {
    console.log(`  domain ${demo.subdomain} — assign manually if needed`);
    return url?.startsWith('http') ? url.replace(/\/$/, '') : null;
  }
}

function wireGoldspireWebDemoUrls(urls) {
  const webDir = join(root, 'apps/goldspire-web');
  console.log('\n▸ Wiring demo URLs on goldspire-web…');
  for (const [key, value] of Object.entries(urls)) {
    if (!value) continue;
    addEnv(webDir, key, value, false);
    console.log(`  ✓ ${key}`);
  }
  const out = run(['deploy', '--prod', '--yes', '--scope', scope], { cwd: webDir, stdio: 'pipe' });
  console.log(`  goldspire-web redeployed → ${out.trim().split('\n').pop()?.trim()}`);
}

const filter = process.argv[2];
const selected = filter ? DEMOS.filter((d) => d.id === filter || d.folder === filter) : DEMOS;
if (selected.length === 0) {
  console.error(`Unknown demo: ${filter}`);
  process.exit(1);
}

if (!readFileSync(envPath, 'utf8').includes('DATABASE_URL=')) {
  console.error('Missing .env with DATABASE_URL');
  process.exit(1);
}

/** @type {Record<string, string>} */
const demoUrls = {};
for (const demo of selected) {
  const url = deployDemo(demo);
  if (url) demoUrls[demo.demoEnvKey] = url;
}

if (Object.keys(demoUrls).length > 0) {
  wireGoldspireWebDemoUrls(demoUrls);
}

console.log('\nDone.\n');
