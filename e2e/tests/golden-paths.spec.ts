import { test, expect } from '@playwright/test';

const DEMOS = [
  { name: 'Heartline', url: process.env.E2E_HEARTLINE_URL ?? 'http://localhost:4000' },
  { name: 'Nova Care', url: process.env.E2E_NOVA_CARE_URL ?? 'http://localhost:4015' },
  { name: 'Bazaar', url: process.env.E2E_BAZAAR_URL ?? 'http://localhost:4011' },
  { name: 'Signal', url: process.env.E2E_SIGNAL_URL ?? 'http://localhost:4012' },
  { name: 'Lumen', url: process.env.E2E_LUMEN_URL ?? 'http://localhost:4013' },
  { name: 'Relay', url: process.env.E2E_RELAY_URL ?? process.env.E2E_ACME_URL ?? 'http://localhost:4014' },
];

for (const demo of DEMOS) {
  test(`${demo.name} loads and health check passes`, async ({ request }) => {
    const home = await request.get(demo.url);
    expect(home.ok(), `${demo.name} home ${home.status()}`).toBeTruthy();
    const health = await request.get(`${demo.url.replace(/\/$/, '')}/api/health`);
    expect(health.ok(), `${demo.name} health ${health.status()}`).toBeTruthy();
    const body = await health.json();
    expect(body.app).toBeTruthy();
  });
}
