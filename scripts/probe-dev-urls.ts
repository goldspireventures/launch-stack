#!/usr/bin/env tsx
/** Probe local dev URLs — exits 1 if any required surface fails. */
import { devSurfaceProbeTargets } from '@goldspire/config/dev-surfaces';

const targets = [
  ...devSurfaceProbeTargets({ requiredOnly: false }),
  { label: 'Expo Metro', url: 'http://127.0.0.1:8081/', required: false, kind: 'home' as const },
];

const TIMEOUT_MS = 45_000;

async function probe(target: (typeof targets)[number]) {
  const { label, url, required } = target;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
      headers: { Accept: 'text/html,application/json' },
    });
    const ms = Date.now() - t0;
    const isHealth = url.includes('/api/health');
    const ok = isHealth ? res.status === 200 : res.status >= 200 && res.status < 400;
    const tag = ok ? 'OK' : 'FAIL';
    console.log(
      `${tag.padEnd(4)} ${String(res.status).padStart(3)} ${String(ms).padStart(5)}ms  ${label.padEnd(22)} ${url}`,
    );
    return { label, url, required, ok, status: res.status, ms, error: null };
  } catch (e) {
    const ms = Date.now() - t0;
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`DOWN     —  ${String(ms).padStart(5)}ms  ${label.padEnd(22)} ${url}  (${msg})`);
    return { label, url, required, ok: false, status: null, ms, error: msg };
  }
}

async function main() {
  console.log('\n── Dev URL probe (45s timeout each) ──\n');
  const results = [];
  for (const t of targets) {
    results.push(await probe(t));
  }
  const failedRequired = results.filter((r) => r.required && !r.ok);
  console.log('\n── Summary ──\n');
  console.log(`  OK: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failedRequired.length) {
    console.log(`  Required failures: ${failedRequired.map((r) => r.label).join(', ')}`);
    process.exit(1);
  }
}

void main();
