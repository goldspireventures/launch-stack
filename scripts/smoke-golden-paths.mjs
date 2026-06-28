/**
 * Smoke-test golden paths — marketing, studio surfaces, catalog demos, portal.
 * Run with stack up: pnpm dev (or deployed URLs in .env).
 *
 * Usage: node scripts/smoke-golden-paths.mjs
 * Env:   SMOKE_TIMEOUT_MS=25000  SMOKE_RETRIES=2
 */
import { loadRootEnv } from './setup/load-root-env.mjs';

loadRootEnv();

const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 25_000);
const RETRIES = Number(process.env.SMOKE_RETRIES ?? 2);

const CATALOG_DEMO_APPS = [
  {
    label: 'Heartline',
    envKey: 'NEXT_PUBLIC_HEARTLINE_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4000',
    devFilter: '@goldspire/dating-web',
  },
  {
    label: 'Nova Care',
    envKey: 'NEXT_PUBLIC_NOVA_CARE_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4015',
    devFilter: '@goldspire/booking-web',
  },
  {
    label: 'Bazaar',
    envKey: 'NEXT_PUBLIC_BAZAAR_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4011',
    devFilter: '@goldspire/marketplace-web',
  },
  {
    label: 'Signal',
    envKey: 'NEXT_PUBLIC_SIGNAL_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4012',
    devFilter: '@goldspire/community-web',
  },
  {
    label: 'Lumen',
    envKey: 'NEXT_PUBLIC_LUMEN_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4013',
    devFilter: '@goldspire/ai-agent-web',
  },
  {
    label: 'Relay',
    envKey: 'NEXT_PUBLIC_RELAY_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4014',
    devFilter: '@goldspire/b2b-saas-web',
  },
];

const STUDIO_SURFACES = [
  { label: 'console', envKey: 'NEXT_PUBLIC_CONSOLE_URL', defaultLocalUrl: 'http://localhost:4001' },
  { label: 'admin', envKey: 'NEXT_PUBLIC_ADMIN_URL', defaultLocalUrl: 'http://localhost:4002' },
  { label: 'atlas', envKey: 'NEXT_PUBLIC_ATLAS_URL', defaultLocalUrl: 'http://localhost:4016', devFilter: '@goldspire/atlas' },
];

const MARKETING_BASE =
  process.env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL?.replace(/\/$/, '') ?? 'http://localhost:4010';

const MARKETING_ROUTES = ['/', '/templates', '/pricing', '/how-we-work', '/contact', '/privacy', '/terms'];

function resolveUrl(envKey, defaultLocalUrl) {
  const explicit = process.env[envKey]?.trim();
  return explicit && explicit.length > 0 ? explicit.replace(/\/$/, '') : defaultLocalUrl;
}

function resolveDemoUrl(app) {
  return resolveUrl(app.envKey, app.defaultLocalUrl);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkOnce(label, url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, detail: String(res.status) };
    }
    return { ok: true };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function check(label, url, opts = {}) {
  let lastDetail = '';
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const result = await checkOnce(label, url);
    if (result.ok) {
      console.log(`OK   ${label}: ${url}`);
      return true;
    }
    lastDetail = result.detail ?? 'unknown';
    if (attempt < RETRIES) await sleep(1500 * (attempt + 1));
  }
  console.error(`FAIL ${label}: ${url} → ${lastDetail}`);
  if (opts.devFilter && /fetch failed|ECONNREFUSED|aborted/i.test(lastDetail)) {
    console.error(`      → not listening. Start: pnpm --filter ${opts.devFilter} dev`);
    console.error('        (or wait for Turbo “Ready” on that app after pnpm dev)');
  }
  return false;
}

async function checkHealth(label, base, opts = {}) {
  return check(`${label} /api/health`, `${base.replace(/\/$/, '')}/api/health`, opts);
}

let ok = 0;
let fail = 0;

console.log(`Smoke (timeout ${TIMEOUT_MS}ms, retries ${RETRIES})\n`);

for (const route of MARKETING_ROUTES) {
  if (await check(`marketing${route}`, `${MARKETING_BASE}${route}`)) ok++;
  else fail++;
}

if (await checkHealth('marketing', MARKETING_BASE)) ok++;
else fail++;

const CONSOLE_ROUTES = ['/commercial', '/leads', '/delivery', '/factory', '/settings'];

for (const surface of STUDIO_SURFACES) {
  const base = resolveUrl(surface.envKey, surface.defaultLocalUrl);
  if (await check(surface.label, base)) ok++;
  else fail++;
  if (await checkHealth(surface.label, base)) ok++;
  else fail++;
  if (surface.label === 'console') {
    for (const route of CONSOLE_ROUTES) {
      if (await check(`console${route}`, `${base}${route}`)) ok++;
      else fail++;
    }
  }
}

const smokeOnly = process.env.SMOKE_ONLY?.split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function includeDemoApp(app) {
  if (!smokeOnly?.length) return true;
  return smokeOnly.includes(app.label.toLowerCase());
}

for (const app of CATALOG_DEMO_APPS) {
  if (!includeDemoApp(app)) continue;
  const base = resolveDemoUrl(app);
  if (await check(app.label, base)) ok++;
  else fail++;
  if (await checkHealth(app.label, base)) ok++;
  else fail++;
}

const portal =
  process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL?.replace(/\/$/, '') ?? 'http://localhost:4005';
if (await check('client-portal', portal)) ok++;
else fail++;
if (await checkHealth('client-portal', portal)) ok++;
else fail++;

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
