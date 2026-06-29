#!/usr/bin/env node
/**
 * Enable Supabase auth on production Console + sync public Supabase keys across stack.
 * Usage: node scripts/setup/sync-production-auth.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const TEAM_ID = 'team_TiPgKb4gAAuLEVcVq9TcIZL0';

const PROJECTS = [
  { name: 'goldspire-console', id: '' },
  { name: 'goldspire-client-portal', id: '' },
  { name: 'goldspire-web', id: 'prj_ZUoMYTmu3Z5Vg35bRq34ID9VZDmy' },
];

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

async function resolveProjectId(name) {
  const p = await api('GET', `/v9/projects/${name}?teamId=${TEAM_ID}`);
  return p.id;
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

function parseDotenv(raw) {
  const out = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

function runDeploy(projectId) {
  execFileSync('vercel', ['deploy', '--prod', '--yes', '--scope', 'livia-hq'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, VERCEL_ORG_ID: TEAM_ID, VERCEL_PROJECT_ID: projectId },
  });
}

const env = parseDotenv(readFileSync(join(root, '.env'), 'utf8'));
const supabaseUrl = env.SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = env.SUPABASE_ANON_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !anonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const syncKeys = [
  ['AUTH_PROVIDER', 'supabase', false],
  ['SUPABASE_URL', supabaseUrl, false],
  ['SUPABASE_ANON_KEY', anonKey, true],
  ['NEXT_PUBLIC_SUPABASE_URL', supabaseUrl, false],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey, false],
];

if (env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
  syncKeys.push(['SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY.trim(), true]);
}

console.log('\nSyncing Supabase auth to production…\n');

for (const project of PROJECTS) {
  project.id = project.id || (await resolveProjectId(project.name));
  console.log(`▸ ${project.name}`);
  for (const [key, value, sensitive] of syncKeys) {
    await upsertEnv(project.id, key, value, sensitive);
    console.log(`  ✓ ${key}`);
  }
}

console.log('\nInviting studio owner via Supabase (if service role available)…\n');
try {
  const { createClient } = await import(join(root, 'node_modules/@supabase/supabase-js/dist/module/index.js'));
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceKey) {
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const consoleUrl = 'https://console.goldspire.dev';
    const { error } = await sb.auth.admin.inviteUserByEmail('eamon@goldspire.dev', {
      redirectTo: `${consoleUrl}/auth/callback`,
    });
    if (error && !String(error.message).includes('already')) {
      console.log(`  · invite: ${error.message}`);
    } else {
      console.log('  ✓ eamon@goldspire.dev invited (or already registered)');
    }
  } else {
    console.log('  · skip invite — no SUPABASE_SERVICE_ROLE_KEY');
  }
} catch (e) {
  console.log(`  · invite skipped: ${e.message}`);
}

console.log('\nRedeploying Console…\n');
const consoleId = await resolveProjectId('goldspire-console');
runDeploy(consoleId);

console.log('\nDone. Sign in at https://console.goldspire.dev/login\n');
