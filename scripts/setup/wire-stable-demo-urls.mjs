#!/usr/bin/env node
/** Set stable demo URLs on goldspire-web via Vercel API and trigger redeploy. */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const TEAM_ID = 'team_TiPgKb4gAAuLEVcVq9TcIZL0';
const WEB_PROJECT_ID = 'prj_ZUoMYTmu3Z5Vg35bRq34ID9VZDmy';

const URLS = {
  NEXT_PUBLIC_HEARTLINE_DEMO_URL: 'https://goldspire-heartline-livia-hq.vercel.app',
  NEXT_PUBLIC_NOVA_CARE_DEMO_URL: 'https://goldspire-nova-care-livia-hq.vercel.app',
  NEXT_PUBLIC_BAZAAR_DEMO_URL: 'https://goldspire-bazaar-livia-hq.vercel.app',
  NEXT_PUBLIC_SIGNAL_DEMO_URL: 'https://goldspire-signal-livia-hq.vercel.app',
  NEXT_PUBLIC_LUMEN_DEMO_URL: 'https://goldspire-lumen-livia-hq.vercel.app',
  NEXT_PUBLIC_ACME_DEMO_URL: 'https://goldspire-acme-livia-hq.vercel.app',
};

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

async function upsertEnv(key, value) {
  const { envs } = await api('GET', `/v9/projects/${WEB_PROJECT_ID}/env?teamId=${TEAM_ID}`);
  const existing = envs?.find((e) => e.key === key && e.target?.includes('production'));
  if (existing) {
    await api('DELETE', `/v9/projects/${WEB_PROJECT_ID}/env/${existing.id}?teamId=${TEAM_ID}`);
  }
  await api('POST', `/v10/projects/${WEB_PROJECT_ID}/env?teamId=${TEAM_ID}`, {
    key,
    value,
    type: 'plain',
    target: ['production'],
  });
  console.log(`  ✓ ${key}`);
}

console.log('\nWiring stable demo URLs on goldspire-web…\n');
for (const [key, value] of Object.entries(URLS)) {
  await upsertEnv(key, value);
}

execFileSync(
  'vercel',
  ['deploy', '--prod', '--yes', '--scope', 'livia-hq'],
  {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, VERCEL_ORG_ID: TEAM_ID, VERCEL_PROJECT_ID: WEB_PROJECT_ID },
  },
);

console.log('\nDone.\n');
