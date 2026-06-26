import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import type { PersonaId } from '@goldspire/config';

const REPO_ROOT = path.resolve(__dirname, '../../..');
export const SCREENSHOT_ROOT = path.join(REPO_ROOT, 'docs/heartline/screenshots');

export function personaStorageState(personaId: PersonaId) {
  return {
    cookies: [
      {
        name: 'goldspire_persona',
        value: personaId,
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
      {
        name: 'goldspire_active_tenant',
        value: 'heartline',
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  };
}

export async function setMobilePersona(page: Page, personaId: PersonaId) {
  await page.addInitScript((id) => {
    localStorage.setItem('goldspire_persona', id);
    document.cookie = `goldspire_persona=${id}; path=/`;
    document.cookie = `goldspire_active_tenant=heartline; path=/`;
  }, personaId);
}

export async function capture(
  page: Page,
  channel: 'web' | 'mobile',
  persona: 'sarah' | 'jamie',
  slug: string,
) {
  const dir = path.join(SCREENSHOT_ROOT, channel, persona);
  fs.mkdirSync(dir, { recursive: true });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1_200);
  await page.screenshot({
    path: path.join(dir, `${slug}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

export async function waitForHeartlineShell(page: Page) {
  await page.waitForSelector('body', { state: 'visible', timeout: 20_000 });
  const spinners = page.locator('[role="progressbar"], .animate-spin');
  await spinners.first().waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => undefined);
}
