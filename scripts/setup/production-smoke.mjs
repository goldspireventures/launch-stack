#!/usr/bin/env node
/** Production smoke test — HTTP health + key pages. */
const CHECKS = [
  { name: 'Marketing', url: 'https://goldspire.dev/api/health', expectJson: true },
  { name: 'Console', url: 'https://console.goldspire.dev/api/health', expectJson: true },
  { name: 'Portal', url: 'https://portal.goldspire.dev/api/health', expectJson: true },
  { name: 'Corporate', url: 'https://goldspireventures.com', expectJson: false },
  { name: 'Console login', url: 'https://console.goldspire.dev/login', expectJson: false },
  { name: 'Marketing contact', url: 'https://goldspire.dev/contact', expectJson: false },
  { name: 'Marketing pricing', url: 'https://goldspire.dev/pricing', expectJson: false },
  { name: 'Portal home', url: 'https://portal.goldspire.dev', expectJson: false },
  { name: 'Heartline demo (Vercel)', url: 'https://goldspire-heartline-livia-hq.vercel.app/api/health', expectJson: true },
  { name: 'Relay demo (Vercel)', url: 'https://goldspire-acme-livia-hq.vercel.app/api/health', expectJson: true },
];

let failed = 0;

console.log('\nGoldspire production smoke test\n');

for (const check of CHECKS) {
  try {
    const res = await fetch(check.url, { redirect: 'follow' });
    if (!res.ok) {
      console.log(`  ✗ ${check.name} — HTTP ${res.status}`);
      failed++;
      continue;
    }
    if (check.expectJson) {
      const json = await res.json();
      if (json.ok !== true) {
        console.log(`  ✗ ${check.name} — health not ok`);
        failed++;
        continue;
      }
      const auth = json.providers?.auth ?? '—';
      const pay = json.providers?.payments ?? '—';
      console.log(`  ✓ ${check.name} — ok (auth:${auth}, pay:${pay})`);
    } else {
      const text = await res.text();
      if (text.length < 200) {
        console.log(`  ✗ ${check.name} — empty response`);
        failed++;
        continue;
      }
      console.log(`  ✓ ${check.name} — HTTP ${res.status}`);
    }
  } catch (e) {
    console.log(`  ✗ ${check.name} — ${e.message}`);
    failed++;
  }
}

// Console should redirect unauthenticated users to login
try {
  const res = await fetch('https://console.goldspire.dev/', { redirect: 'manual' });
  const loc = res.headers.get('location') ?? '';
  if (res.status === 307 || res.status === 308 || res.status === 302) {
    if (loc.includes('/login')) {
      console.log('  ✓ Console auth gate — redirects to /login');
    } else {
      console.log(`  ✗ Console auth gate — redirect to ${loc}`);
      failed++;
    }
  } else if (res.status === 200) {
    console.log('  · Console root returned 200 (may already be sessioned or SSR login)');
  } else {
    console.log(`  ✗ Console auth gate — HTTP ${res.status}`);
    failed++;
  }
} catch (e) {
  console.log(`  ✗ Console auth gate — ${e.message}`);
  failed++;
}

console.log(failed ? `\nFailed: ${failed}\n` : '\nAll checks passed.\n');
process.exit(failed ? 1 : 0);
