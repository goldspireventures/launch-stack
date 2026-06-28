#!/usr/bin/env node
/**
 * Configure catalog demo Vercel projects (root directory + GitHub link).
 * Uses local Vercel CLI auth token — never prints secrets.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const TEAM_ID = 'team_TiPgKb4gAAuLEVcVq9TcIZL0';
const GITHUB_LINK = {
  type: 'github',
  repo: 'launch-stack',
  org: 'goldspireventures',
  productionBranch: 'main',
};

const DEMOS = [
  { project: 'goldspire-heartline', folder: 'dating-web', id: 'prj_9h6VhZuTgiF2rcTiApNMVfttGvB9' },
  { project: 'goldspire-nova-care', folder: 'booking-web', id: 'prj_ERODMtYF8aJMvcI6zKEBWJ7lDlai' },
  { project: 'goldspire-bazaar', folder: 'marketplace-web', id: 'prj_QAkJJsSXZ24V0x1nTnh0gyxYP4nb' },
  { project: 'goldspire-signal', folder: 'community-web', id: 'prj_8HEEWMwStpdqRxBN7Aei6Q5RcqPE' },
  { project: 'goldspire-lumen', folder: 'ai-agent-web', id: 'prj_MUGYvHpQ3AW6JpqA4v7CXuJPUF95' },
  { project: 'goldspire-acme', folder: 'b2b-saas-web', id: 'prj_X8BOxRwmIKtisu9yowAffpCesiwa' },
];

function token() {
  const paths = [
    join(homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'Data', 'auth.json'),
    join(homedir(), '.vercel', 'auth.json'),
  ];
  for (const p of paths) {
    try {
      return JSON.parse(readFileSync(p, 'utf8')).token;
    } catch {
      /* try next */
    }
  }
  throw new Error('Vercel auth token not found — run vercel login');
}

async function api(method, path, body) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function ensureProject(demo) {
  if (demo.id) return demo.id;
  try {
    const existing = await api('GET', `/v9/projects/${demo.project}?teamId=${TEAM_ID}`);
    return existing.id;
  } catch {
    const created = await api('POST', `/v11/projects?teamId=${TEAM_ID}`, {
      name: demo.project,
      framework: 'nextjs',
    });
    console.log(`  created ${demo.project}`);
    return created.id;
  }
}

async function configure(demo) {
  const id = await ensureProject(demo);
  await api('PATCH', `/v9/projects/${id}?teamId=${TEAM_ID}`, {
    rootDirectory: `apps/${demo.folder}`,
    ssoProtection: null,
  });
  try {
    await api('POST', `/v9/projects/${id}/link?teamId=${TEAM_ID}`, {
      type: 'github',
      repo: `${GITHUB_LINK.org}/${GITHUB_LINK.repo}`,
    });
  } catch (e) {
    if (!String(e.message).includes('already')) console.log(`    git link: ${e.message}`);
  }
  console.log(`  ✓ ${demo.project} → apps/${demo.folder}`);
  return id;
}

console.log('\nConfiguring catalog demo Vercel projects…\n');
for (const demo of DEMOS) {
  try {
    await configure(demo);
  } catch (e) {
    console.error(`  ✗ ${demo.project}: ${e.message}`);
    process.exitCode = 1;
  }
}
console.log('\nDone. Run deploy-catalog-demos.mjs or push to main to build.\n');
