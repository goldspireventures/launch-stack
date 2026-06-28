#!/usr/bin/env node
/** Configure and deploy client-portal on livia-hq; wire NEXT_PUBLIC_CLIENT_PORTAL_URL on goldspire-web. */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const TEAM_ID = 'team_TiPgKb4gAAuLEVcVq9TcIZL0';
const PORTAL_PROJECT_ID = process.env.GOLDSPIRE_PORTAL_PROJECT_ID ?? 'prj_portal_placeholder';
const WEB_PROJECT_ID = 'prj_ZUoMYTmu3Z5Vg35bRq34ID9VZDmy';
const PORTAL_DOMAIN = 'portal.goldspire.dev';
const PORTAL_PUBLIC_URL = `https://${PORTAL_DOMAIN}`;

function token() {
  const p = join(homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'Data', 'auth.json');
  return JSON.parse(readFileSync(p, 'utf8')).token;
}

async function api(method, path, body) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function ensurePortalProject() {
  try {
    const existing = await api('GET', `/v9/projects/goldspire-client-portal?teamId=${TEAM_ID}`);
    return existing.id;
  } catch {
    const created = await api('POST', `/v11/projects?teamId=${TEAM_ID}`, {
      name: 'goldspire-client-portal',
      framework: 'nextjs',
    });
    console.log('  created goldspire-client-portal');
    return created.id;
  }
}

async function configureProject(projectId) {
  await api('PATCH', `/v9/projects/${projectId}?teamId=${TEAM_ID}`, {
    rootDirectory: 'apps/client-portal',
    ssoProtection: null,
  });
  try {
    await api('POST', `/v9/projects/${projectId}/link?teamId=${TEAM_ID}`, {
      type: 'github',
      repo: 'goldspireventures/launch-stack',
    });
  } catch {
    /* already linked */
  }
}

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

function runVercel(args, projectId, cwd = root) {
  execFileSync('vercel', args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, VERCEL_ORG_ID: TEAM_ID, VERCEL_PROJECT_ID: projectId },
  });
}

async function upsertEnv(projectId, key, value, sensitive = false) {
  const { envs } = await api('GET', `/v9/projects/${projectId}/env?teamId=${TEAM_ID}`);
  const existing = envs?.find((e) => e.key === key && e.target?.includes('production'));
  if (existing) {
    await api('DELETE', `/v9/projects/${projectId}/env/${existing.id}?teamId=${TEAM_ID}`);
  }
  await api('POST', `/v10/projects/${projectId}/env?teamId=${TEAM_ID}`, {
    key,
    value,
    type: sensitive ? 'encrypted' : 'plain',
    target: ['production'],
  });
}

console.log('\nDeploying client portal…\n');
const portalId = await ensurePortalProject();
await configureProject(portalId);

const env = parseDotenv(readFileSync(join(root, '.env'), 'utf8'));
const shared = [
  'DATABASE_URL',
  'DATABASE_URL_APP',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AUTH_PROVIDER',
  'PAYMENT_PROVIDER',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
];
for (const key of shared) {
  const value = env[key]?.trim();
  if (!value) continue;
  await upsertEnv(portalId, key, value, key.includes('SECRET') || key.includes('DATABASE'));
}
await upsertEnv(portalId, 'NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL', env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL?.trim() || 'https://goldspire.dev');

runVercel(['deploy', '--prod', '--yes', '--scope', 'livia-hq', '--force'], portalId);
try {
  runVercel(['domains', 'add', PORTAL_DOMAIN, '--scope', 'livia-hq'], portalId);
} catch {
  console.log(`  Add DNS for ${PORTAL_DOMAIN} if not already configured`);
}

await upsertEnv(WEB_PROJECT_ID, 'NEXT_PUBLIC_CLIENT_PORTAL_URL', PORTAL_PUBLIC_URL);
console.log(`\n✓ NEXT_PUBLIC_CLIENT_PORTAL_URL → ${PORTAL_PUBLIC_URL}`);
runVercel(['deploy', '--prod', '--yes', '--scope', 'livia-hq'], WEB_PROJECT_ID);
console.log('\nDone.\n');
