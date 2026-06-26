import { test, expect } from '@playwright/test';

/** Apps started by Playwright `webServer` / `e2e-ci-stack` for the platform gate. */
const CORE_SURFACES = [
  { label: 'Console', base: process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001' },
  { label: 'Admin', base: process.env.E2E_ADMIN_URL ?? 'http://localhost:4002' },
  { label: 'Marketing', base: process.env.E2E_MARKETING_URL ?? 'http://localhost:4010' },
  { label: 'Portal', base: process.env.E2E_PORTAL_URL ?? 'http://localhost:4005' },
  { label: 'Heartline', base: process.env.E2E_HEARTLINE_URL ?? 'http://localhost:4000' },
];

test.describe('Platform — core health', () => {
  for (const { label, base } of CORE_SURFACES) {
    test(`${label} health`, async ({ request }) => {
      const origin = base.replace(/\/$/, '');
      const res = await request.get(`${origin}/api/health`, { timeout: 30_000 });
      expect(res.ok(), `${label} ${res.status()}`).toBeTruthy();
      const body = (await res.json()) as { app?: string };
      expect(body.app).toBeTruthy();
    });
  }
});
