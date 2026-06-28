#!/usr/bin/env node
/**
 * Queue custom domains on Vercel projects and create DNS records when goldspire.dev
 * uses Vercel nameservers.
 *
 * Usage: node scripts/setup/configure-studio-domains.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const TEAM_ID = 'team_TiPgKb4gAAuLEVcVq9TcIZL0';
const APEX = 'goldspire.dev';

/** @type {{ project: string; projectId: string; host: string }[]} */
const BINDINGS = [
  { project: 'goldspire-web', projectId: 'prj_ZUoMYTmu3Z5Vg35bRq34ID9VZDmy', host: APEX },
  { project: 'goldspire-client-portal', projectId: '', host: 'portal.goldspire.dev' },
  { project: 'goldspire-console', projectId: '', host: 'console.goldspire.dev' },
  { project: 'goldspire-heartline', projectId: 'prj_9h6VhZuTgiF2rcTiApNMVfttGvB9', host: 'heartline.goldspire.dev' },
  { project: 'goldspire-nova-care', projectId: 'prj_ERODMtYF8aJMvcI6zKEBWJ7lDlai', host: 'nova.goldspire.dev' },
  { project: 'goldspire-bazaar', projectId: 'prj_QAkJJsSXZ24V0x1nTnh0gyxYP4nb', host: 'bazaar.goldspire.dev' },
  { project: 'goldspire-signal', projectId: 'prj_8HEEWMwStpdqRxBN7Aei6Q5RcqPE', host: 'signal.goldspire.dev' },
  { project: 'goldspire-lumen', projectId: 'prj_MUGYvHpQ3AW6JpqA4v7CXuJPUF95', host: 'lumen.goldspire.dev' },
  { project: 'goldspire-acme', projectId: 'prj_X8BOxRwmIKtisu9yowAffpCesiwa', host: 'relay.goldspire.dev' },
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
  try {
    const p = await api('GET', `/v9/projects/${name}?teamId=${TEAM_ID}`);
    return p.id;
  } catch {
    return null;
  }
}

async function addProjectDomain(projectId, host) {
  try {
    await api('POST', `/v10/projects/${projectId}/domains?teamId=${TEAM_ID}`, { name: host });
    console.log(`  ✓ queued ${host} on project`);
    return true;
  } catch (e) {
    if (String(e.message).includes('already')) {
      console.log(`  · ${host} already on project`);
      return true;
    }
    console.log(`  ✗ ${host}: ${e.message}`);
    return false;
  }
}

async function listDnsRecords() {
  try {
    const data = await api('GET', `/v4/domains/${APEX}/records?teamId=${TEAM_ID}`);
    return data.records ?? [];
  } catch {
    return null;
  }
}

async function ensureCname(subdomain, target = 'cname.vercel-dns.com.') {
  const records = await listDnsRecords();
  const name = subdomain.replace(`.${APEX}`, '');
  if (!records) {
    console.log(`  · Add at Cloudflare (goldspire.dev uses Cloudflare NS):`);
    console.log(`      CNAME ${name} → cname.vercel-dns.com`);
    console.log(`      — or A ${name} → 76.76.21.21 for apex-style Vercel routing`);
    return;
  }
  const exists = records.some(
    (r) => r.type === 'CNAME' && r.name === name && String(r.value).includes('vercel'),
  );
  if (exists) {
    console.log(`  · CNAME ${name}.${APEX} already exists`);
    return;
  }
  try {
    await api('POST', `/v2/domains/${APEX}/records?teamId=${TEAM_ID}`, {
      type: 'CNAME',
      name,
      value: target,
      ttl: 60,
    });
    console.log(`  ✓ CNAME ${name}.${APEX} → ${target}`);
  } catch (e) {
    console.log(`  ✗ CNAME ${name}: ${e.message}`);
  }
}

console.log('\nConfiguring Goldspire Studio domains…\n');

for (const binding of BINDINGS) {
  const projectId = binding.projectId || (await resolveProjectId(binding.project));
  console.log(`▸ ${binding.project} → ${binding.host}`);
  if (!projectId) {
    console.log(`  ✗ project missing — run deploy-console.mjs or deploy-client-portal.mjs first`);
    continue;
  }
  await addProjectDomain(projectId, binding.host);
  if (binding.host !== APEX) {
    await ensureCname(binding.host);
  }
}

console.log('\nVerify propagation:');
for (const b of BINDINGS) {
  console.log(`  https://${b.host === APEX ? APEX : b.host}/api/health`);
}
console.log('\nDone.\n');
