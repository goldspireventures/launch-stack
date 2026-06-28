#!/usr/bin/env node
/** Capture full-stack screenshots for UX review. */
import { chromium } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(root, '.audit-screenshots');

const MARKETING = process.env.E2E_MARKETING_URL ?? 'https://goldspire.dev';
const CORPORATE = process.env.E2E_CORPORATE_URL ?? 'https://goldspireventures.com';
const CONSOLE = (process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001').replace(/\/$/, '');
const PORTAL = (process.env.E2E_PORTAL_URL ?? 'https://goldspire-client-portal-livia-hq.vercel.app').replace(/\/$/, '');

const DEMOS = [
  ['heartline', process.env.E2E_HEARTLINE_URL ?? 'https://goldspire-heartline-livia-hq.vercel.app'],
  ['nova', process.env.E2E_NOVA_URL ?? 'https://goldspire-nova-care-livia-hq.vercel.app'],
  ['bazaar', process.env.E2E_BAZAAR_URL ?? 'https://goldspire-bazaar-livia-hq.vercel.app'],
  ['signal', process.env.E2E_SIGNAL_URL ?? 'https://goldspire-signal-livia-hq.vercel.app'],
  ['lumen', process.env.E2E_LUMEN_URL ?? 'https://goldspire-lumen-livia-hq.vercel.app'],
  ['relay', process.env.E2E_RELAY_URL ?? 'https://goldspire-acme-livia-hq.vercel.app'],
];

const MARKETING_PAGES = [
  ['home', '/'],
  ['pricing', '/pricing'],
  ['templates', '/templates'],
  ['how-we-work', '/how-we-work'],
  ['case-studies', '/case-studies'],
  ['contact', '/contact'],
];

const CORPORATE_PAGES = [
  ['home', '/'],
  ['portfolio', '/portfolio'],
  ['partner', '/partner'],
  ['company', '/company'],
];

const CONSOLE_PAGES = [
  ['desk', '/'],
  ['enquiries', '/leads'],
  ['pipeline', '/pipeline'],
  ['build-launch', '/build?tab=launch'],
  ['deals', '/deals'],
  ['deals-new', '/deals/new'],
  ['delivery', '/delivery'],
  ['settings', '/settings'],
];

async function shot(page, subdir, name) {
  const dir = join(outDir, subdir);
  mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(dir, `${name}.png`), fullPage: true });
  console.log(`  ✓ ${subdir}/${name}.png`);
}

async function consoleSignIn(page) {
  await page.context().addCookies([
    {
      name: 'goldspire_persona',
      value: 'studio.owner',
      domain: new URL(CONSOLE).hostname === 'localhost' ? 'localhost' : new URL(CONSOLE).hostname,
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 3600,
      httpOnly: false,
      secure: CONSOLE.startsWith('https'),
      sameSite: 'Lax',
    },
  ]);
  await page.route(`${CONSOLE}/**`, async (route) => {
    const headers = { ...route.request().headers(), 'x-e2e-persona': 'studio.owner' };
    await route.continue({ headers });
  });
  await page.goto(`${CONSOLE}/`, { waitUntil: 'networkidle', timeout: 60_000 });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

console.log('\nCapturing stack screenshots…\n');
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('▸ Marketing (goldspire.dev)');
  for (const [name, path] of MARKETING_PAGES) {
    await page.goto(`${MARKETING}${path}`, { waitUntil: 'networkidle', timeout: 90_000 });
    await shot(page, 'marketing', name);
  }

  console.log('\n▸ Corporate (goldspireventures.com)');
  for (const [name, path] of CORPORATE_PAGES) {
    await page.goto(`${CORPORATE}${path}`, { waitUntil: 'networkidle', timeout: 90_000 });
    await shot(page, 'corporate', name);
  }

  console.log('\n▸ Catalog demos');
  for (const [name, base] of DEMOS) {
    try {
      await page.goto(`${base.replace(/\/$/, '')}/`, { waitUntil: 'networkidle', timeout: 90_000 });
      await shot(page, 'demos', name);
    } catch (e) {
      console.log(`  ✗ demo ${name}: ${e.message}`);
    }
  }

  console.log('\n▸ Client portal');
  try {
    await page.goto(`${PORTAL}/`, { waitUntil: 'networkidle', timeout: 60_000 });
    await shot(page, 'portal', 'landing');
  } catch (e) {
    console.log(`  ✗ portal: ${e.message}`);
  }

  console.log('\n▸ Studio Console');
  try {
    await consoleSignIn(page);
    await shot(page, 'console', 'desk');
    for (const [name, path] of CONSOLE_PAGES.slice(1)) {
      await page.goto(`${CONSOLE}${path}`, { waitUntil: 'networkidle', timeout: 90_000 });
      await shot(page, 'console', name);
    }
  } catch (e) {
    console.log(`  ✗ console: ${e.message}`);
  }

  console.log(`\nScreenshots → ${outDir}\n`);
} finally {
  await browser.close();
}
