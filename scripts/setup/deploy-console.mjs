#!/usr/bin/env node
/** Configure and deploy Studio Console on livia-hq; wire NEXT_PUBLIC_CONSOLE_URL across stack. */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const TEAM_ID = 'team_TiPgKb4gAAuLEVcVq9TcIZL0';
const WEB_PROJECT_ID = 'prj_ZUoMYTmu3Z5Vg35bRq34ID9VZDmy';
const PORTAL_PROJECT_NAME = 'goldspire-client-portal';
const CONSOLE_DOMAIN = 'console.goldspire.dev';
const CONSOLE_PUBLIC_URL = `https://${CONSOLE_DOMAIN}`;

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

async function ensureConsoleProject() {
  try {
    const existing = await api('GET', `/v9/projects/goldspire-console?teamId=${TEAM_ID}`);
    return existing.id;
  } catch {
    const created = await api('POST', `/v11/projects?teamId=${TEAM_ID}`, {
      name: 'goldspire-console',
      framework: 'nextjs',
    });
    console.log('  created goldspire-console');
    return created.id;
  }
}

async function configureProject(projectId) {
  await api('PATCH', `/v9/projects/${projectId}?teamId=${TEAM_ID}`, {
    rootDirectory: 'apps/console',
    ssoProtection: null,
    installCommand: 'pnpm install --frozen-lockfile',
    buildCommand: 'pnpm --filter @goldspire/console build',
  });
  try {
    await api('POST', `/v9/projects/${projectId}/link?teamId=${TEAM_ID}`, {
      type: 'github',
      repo: 'goldspireventures/launch-stack',
      productionBranch: 'main',
    });
  } catch {
    /* already linked */
  }
}

async function deployFromGit(projectId) {
  const deployment = await api('POST', `/v13/deployments?teamId=${TEAM_ID}`, {
    name: 'goldspire-console',
    project: projectId,
    target: 'production',
    gitSource: {
      type: 'github',
      org: 'goldspireventures',
      repo: 'launch-stack',
      ref: 'main',
    },
  });
  console.log(`  git deploy → ${deployment.url ?? deployment.alias?.[0] ?? 'pending'}`);
  return deployment;
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

async function getProjectIdByName(name) {
  try {
    const p = await api('GET', `/v9/projects/${name}?teamId=${TEAM_ID}`);
    return p.id;
  } catch {
    return null;
  }
}

const SHARED_KEYS = [
  'DATABASE_URL',
  'DATABASE_URL_APP',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'AUTH_PROVIDER',
  'PAYMENT_PROVIDER',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'INNGEST_EVENT_KEY',
  'INNGEST_SIGNING_KEY',
  'NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL',
  'NEXT_PUBLIC_CLIENT_PORTAL_URL',
  'NEXT_PUBLIC_HEARTLINE_DEMO_URL',
  'NEXT_PUBLIC_NOVA_CARE_DEMO_URL',
  'NEXT_PUBLIC_BAZAAR_DEMO_URL',
  'NEXT_PUBLIC_SIGNAL_DEMO_URL',
  'NEXT_PUBLIC_LUMEN_DEMO_URL',
  'NEXT_PUBLIC_RELAY_DEMO_URL',
  'NEXT_PUBLIC_ADMIN_URL',
  'NEXT_PUBLIC_APP_URL',
  'STUDIO_LEAD_INBOUND_WEBHOOK_SECRET',
];

console.log('\nDeploying Studio Console…\n');
const consoleId = await ensureConsoleProject();
await configureProject(consoleId);

const env = parseDotenv(readFileSync(join(root, '.env'), 'utf8'));
for (const key of SHARED_KEYS) {
  const value = env[key]?.trim();
  if (!value) continue;
  await upsertEnv(consoleId, key, value, key.includes('SECRET') || key.includes('DATABASE'));
}

await upsertEnv(consoleId, 'NEXT_PUBLIC_CONSOLE_URL', CONSOLE_PUBLIC_URL);
await upsertEnv(consoleId, 'AUTH_PROVIDER', env.AUTH_PROVIDER?.trim() || 'mock');
try {
  await deployFromGit(consoleId);
} catch (e) {
  console.log(`  git deploy failed (${e.message}) — falling back to CLI`);
  runVercel(['deploy', '--prod', '--yes', '--scope', 'livia-hq', '--force'], consoleId);
}
try {
  runVercel(['domains', 'add', CONSOLE_DOMAIN, '--scope', 'livia-hq'], consoleId);
} catch {
  console.log(`  Add DNS for ${CONSOLE_DOMAIN} — run: node scripts/setup/configure-studio-domains.mjs`);
}

console.log('\nWiring NEXT_PUBLIC_CONSOLE_URL on portal + marketing…\n');
const portalId = await getProjectIdByName(PORTAL_PROJECT_NAME);
if (portalId) {
  await upsertEnv(portalId, 'NEXT_PUBLIC_CONSOLE_URL', CONSOLE_PUBLIC_URL);
}
await upsertEnv(WEB_PROJECT_ID, 'NEXT_PUBLIC_CONSOLE_URL', CONSOLE_PUBLIC_URL);

if (portalId) {
  runVercel(['deploy', '--prod', '--yes', '--scope', 'livia-hq'], portalId);
}
runVercel(['deploy', '--prod', '--yes', '--scope', 'livia-hq'], WEB_PROJECT_ID);

console.log(`\n✓ Console → ${CONSOLE_PUBLIC_URL}\nDone.\n`);
