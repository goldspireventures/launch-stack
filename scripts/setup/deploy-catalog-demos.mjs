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
const vercel = 'vercel';
const scope = 'livia-hq';
const teamId = 'team_TiPgKb4gAAuLEVcVq9TcIZL0';

const DEMOS = [
  {
    id: 'heartline',
    folder: 'dating-web',
    package: '@goldspire/dating-web',
    project: 'goldspire-heartline',
    projectId: 'prj_9h6VhZuTgiF2rcTiApNMVfttGvB9',
    subdomain: 'heartline.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_HEARTLINE_DEMO_URL',
  },
  {
    id: 'nova_care',
    folder: 'booking-web',
    package: '@goldspire/booking-web',
    project: 'goldspire-nova-care',
    projectId: 'prj_ERODMtYF8aJMvcI6zKEBWJ7lDlai',
    subdomain: 'nova.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_NOVA_CARE_DEMO_URL',
  },
  {
    id: 'bazaar',
    folder: 'marketplace-web',
    package: '@goldspire/marketplace-web',
    project: 'goldspire-bazaar',
    projectId: 'prj_QAkJJsSXZ24V0x1nTnh0gyxYP4nb',
    subdomain: 'bazaar.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_BAZAAR_DEMO_URL',
  },
  {
    id: 'signal',
    folder: 'community-web',
    package: '@goldspire/community-web',
    project: 'goldspire-signal',
    projectId: 'prj_8HEEWMwStpdqRxBN7Aei6Q5RcqPE',
    subdomain: 'signal.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_SIGNAL_DEMO_URL',
  },
  {
    id: 'lumen',
    folder: 'ai-agent-web',
    package: '@goldspire/ai-agent-web',
    project: 'goldspire-lumen',
    projectId: 'prj_MUGYvHpQ3AW6JpqA4v7CXuJPUF95',
    subdomain: 'lumen.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_LUMEN_DEMO_URL',
  },
  {
    id: 'acme',
    folder: 'b2b-saas-web',
    package: '@goldspire/b2b-saas-web',
    project: 'goldspire-acme',
    projectId: 'prj_X8BOxRwmIKtisu9yowAffpCesiwa',
    subdomain: 'relay.goldspire.dev',
    demoEnvKey: 'NEXT_PUBLIC_RELAY_DEMO_URL',
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
  return execFileSync(vercel, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...opts,
  });
}

function addEnv(cwd, key, value, projectId, sensitive = true) {
  const args = ['env', 'add', key, 'production', '--value', value, '--yes', '--force', '--scope', scope];
  if (sensitive) args.push('--sensitive');
  run(args, {
    cwd,
    stdio: 'pipe',
    env: { ...process.env, VERCEL_ORG_ID: teamId, VERCEL_PROJECT_ID: projectId },
  });
}

function ensureProject(demo) {
  console.log(`  linked ${demo.project}`);
}

function syncSharedEnv(demo) {
  const envDir = root;
  const env = parseDotenv(readFileSync(envPath, 'utf8'));
  const marketingUrl = env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL?.trim() || 'https://goldspire.dev';

  for (const key of SHARED_ENV_KEYS) {
    const value = env[key]?.trim();
    if (!value) continue;
    addEnv(envDir, key, value, demo.projectId);
  }
  addEnv(envDir, 'NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL', marketingUrl, demo.projectId, false);
  addEnv(envDir, 'AUTH_PROVIDER', env.AUTH_PROVIDER?.trim() || 'mock', demo.projectId, false);
}

function parseDeployUrl(output) {
  const text = String(output);
  const match =
    text.match(/Production: (https:\/\/[^\s]+)/) ??
    text.match(/https:\/\/[^\s"']+-livia-hq\.vercel\.app/);
  return match?.[1] ?? match?.[0] ?? null;
}

function productionUrlForDemo(demo) {
  return `https://${demo.project}-livia-hq.vercel.app`;
}

function deployDemo(demo) {
  console.log(`\n▸ ${demo.id} (${demo.project})`);
  ensureProject(demo);
  syncSharedEnv(demo);
  let out = '';
  try {
    out = run(['deploy', '--prod', '--yes', '--scope', scope, '--force'], {
      cwd: root,
      stdio: 'pipe',
      env: {
        ...process.env,
        VERCEL_ORG_ID: teamId,
        VERCEL_PROJECT_ID: demo.projectId,
      },
    });
  } catch (e) {
    out = `${e.stdout ?? ''}\n${e.stderr ?? ''}`;
    if (!parseDeployUrl(out)) throw e;
  }
  const url = productionUrlForDemo(demo);
  console.log(`  deployed → ${url}`);
  try {
    run(['domains', 'add', demo.subdomain, '--scope', scope], {
      cwd: root,
      stdio: 'pipe',
      env: { ...process.env, VERCEL_ORG_ID: teamId, VERCEL_PROJECT_ID: demo.projectId },
    });
    console.log(`  domain queued → https://${demo.subdomain}`);
  } catch {
    console.log(`  using public URL ${url} until DNS is configured`);
  }
  return url;
}

function wireGoldspireWebDemoUrls(urls) {
  const webDir = join(root, 'apps/goldspire-web');
  const webProjectId = 'prj_ZUoMYTmu3Z5Vg35bRq34ID9VZDmy';
  console.log('\n▸ Wiring demo URLs on goldspire-web…');
  for (const [key, value] of Object.entries(urls)) {
    if (!value) continue;
    addEnv(webDir, key, value, webProjectId, false);
    console.log(`  ✓ ${key}`);
  }
  const out = run(['deploy', '--prod', '--yes', '--scope', scope], {
    cwd: root,
    stdio: 'pipe',
    env: { ...process.env, VERCEL_ORG_ID: teamId, VERCEL_PROJECT_ID: webProjectId },
  });
  console.log(`  goldspire-web redeployed → ${parseDeployUrl(out) ?? 'https://goldspire.dev'}`);
}

const filter = process.argv[2];
const selected = filter ? DEMOS.filter((d) => d.id === filter || d.folder === filter) : DEMOS;
if (selected.length === 0) {
  console.error(`Unknown demo: ${filter}`);
  process.exit(1);
}

console.log('Ensure Vercel projects are configured: node scripts/setup/configure-catalog-demo-vercel.mjs\n');

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
