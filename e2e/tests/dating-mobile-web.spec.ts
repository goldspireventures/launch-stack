import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve(__dirname, '../../apps/dating-mobile/.screenshots');

test.describe('dating-mobile (Expo web)', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      // Jamie = Plus: discover deck + ungated likes + matches (see fixup:heartline-walkthrough).
      localStorage.setItem('goldspire_persona', 'heartline.customer.jamie');
    });
  });

  test('capture tab screenshots', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    fs.mkdirSync(outDir, { recursive: true });

    const tabs = [
      { file: '01-discover.png', path: '/', ready: /Drag the card|like|pass/i },
      { file: '02-likes.png', path: '/likes', ready: /Liked|No likes yet|people like/i },
      { file: '03-matches.png', path: '/matches', ready: /Sarah|Jamie|match|swiping/i },
      { file: '04-profile.png', path: '/profile', ready: /Jamie|Plan:|persona/i },
    ] as const;

    for (const tab of tabs) {
      await page.goto(tab.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expect(page.locator('body')).not.toContainText('Not authenticated', { timeout: 20_000 });
      await page
        .getByText(tab.ready)
        .first()
        .waitFor({ state: 'visible', timeout: 12_000 })
        .catch(() => undefined);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outDir, tab.file), fullPage: true });
    }

    if (consoleErrors.length > 0) {
      fs.writeFileSync(path.join(outDir, 'console-errors.txt'), consoleErrors.join('\n\n'));
    }
  });
});
