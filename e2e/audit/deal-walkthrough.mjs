#!/usr/bin/env node
/** Dry-run €20k clone + €60k medium deal via launch wizard. */
import { chromium } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(root, '.audit-screenshots', 'walkthrough');
const CONSOLE = (process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001').replace(/\/$/, '');

const SCENARIOS = [
  {
    id: 'clone-20k',
    presetLabel: /dating · web launch/i,
    title: 'Walkthrough — Heartline clone',
    clientName: 'Walkthrough Clone Co',
    clientEmail: 'walkthrough-clone@goldspire.dev',
  },
  {
    id: 'medium-60k',
    presetLabel: /medium scope/i,
    title: 'Walkthrough — Medium template build',
    clientName: 'Walkthrough Medium Co',
    clientEmail: 'walkthrough-medium@goldspire.dev',
  },
];

async function signIn(page) {
  const host = new URL(CONSOLE).hostname;
  await page.context().addCookies([
    {
      name: 'goldspire_persona',
      value: 'studio.owner',
      domain: host === 'localhost' ? 'localhost' : host,
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 3600,
      httpOnly: false,
      secure: CONSOLE.startsWith('https'),
      sameSite: 'Lax',
    },
  ]);
  await page.route(`${CONSOLE}/**`, async (route) => {
    await route.continue({ headers: { ...route.request().headers(), 'x-e2e-persona': 'studio.owner' } });
  });
}

async function shot(page, scenario, step) {
  const dir = join(outDir, scenario);
  mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(dir, `${step}.png`), fullPage: true });
  console.log(`  ✓ walkthrough/${scenario}/${step}.png`);
}

async function runScenario(page, scenario) {
  console.log(`\n▸ ${scenario.id}`);
  await page.goto(`${CONSOLE}/build?tab=launch`, { waitUntil: 'networkidle', timeout: 90_000 });
  await shot(page, scenario.id, '01-launch-wizard');

  await page.getByRole('button').filter({ hasText: scenario.presetLabel }).first().click();
  await shot(page, scenario.id, '02-deal-form');

  await page.getByPlaceholder('Heartline launch — Q3').fill(scenario.title);
  const inputs = page.locator('input:visible');
  await inputs.nth(1).fill(scenario.clientName);
  await page.locator('input[type="email"]').first().fill(scenario.clientEmail);

  await page.getByRole('button', { name: /launch end-to-end/i }).click();
  await page.waitForTimeout(5000);
  await shot(page, scenario.id, '03-done');
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

console.log('\nDeal walkthrough (dry-run)…\n');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await signIn(page);
  for (const scenario of SCENARIOS) {
    await runScenario(page, scenario);
  }
  console.log(`\nWalkthrough screenshots → ${outDir}\n`);
} finally {
  await browser.close();
}
