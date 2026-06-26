import { test, expect } from '@playwright/test';
import { capture, personaStorageState, waitForHeartlineShell } from './helpers/heartline-screenshots';

test.describe('Heartline web showcase', () => {
  test.describe('Sarah (free tier)', () => {
    test.use({ storageState: personaStorageState('heartline.customer.sarah') });

    test('capture free-tier story', async ({ page }) => {
      await page.goto('/discover');
      await waitForHeartlineShell(page);
      await expect(page.getByRole('link', { name: /discover|likes|matches/i }).first()).toBeVisible({
        timeout: 20_000,
      });
      await capture(page, 'web', 'sarah', '01-discover');

      await page.goto('/likes');
      await waitForHeartlineShell(page);
      await expect(page.getByText(/people like you|person likes you/i)).toBeVisible({ timeout: 20_000 });
      await capture(page, 'web', 'sarah', '02-likes-gated');

      await page.goto('/profile');
      await waitForHeartlineShell(page);
      await capture(page, 'web', 'sarah', '03-profile');

      await page.goto('/premium');
      await waitForHeartlineShell(page);
      await capture(page, 'web', 'sarah', '04-premium');

      await page.goto('/safety');
      await waitForHeartlineShell(page);
      await expect(page.getByRole('heading', { name: /safety/i })).toBeVisible();
      await capture(page, 'web', 'sarah', '05-safety');
    });
  });

  test.describe('Jamie (Plus)', () => {
    test.use({ storageState: personaStorageState('heartline.customer.jamie') });

    test('capture full member story', async ({ page }) => {
      await page.goto('/discover');
      await waitForHeartlineShell(page);
      await capture(page, 'web', 'jamie', '01-discover');

      await page.goto('/likes');
      await waitForHeartlineShell(page);
      await expect(page.getByRole('tab', { name: /liked you/i })).toBeVisible();
      await capture(page, 'web', 'jamie', '02-likes');

      await page.goto('/matches');
      await waitForHeartlineShell(page);
      await expect(page.getByText(/Sarah/i).first()).toBeVisible({ timeout: 20_000 });
      await capture(page, 'web', 'jamie', '03-matches');

      await page.goto('/messages');
      await waitForHeartlineShell(page);
      await capture(page, 'web', 'jamie', '04-messages-inbox');

      const inboxThread = page.getByRole('link', { name: /Sarah/i }).first();
      if (await inboxThread.isVisible().catch(() => false)) {
        await inboxThread.click();
      } else {
        await page.goto('/matches');
        await waitForHeartlineShell(page);
        await page.getByRole('link', { name: /Sarah/i }).first().click();
      }
      await waitForHeartlineShell(page);
      await expect(page.getByText(/coffee|WhatsApp|profile/i).first()).toBeVisible({ timeout: 15_000 });
      await capture(page, 'web', 'jamie', '05-messages-thread');

      await page.goto('/profile');
      await waitForHeartlineShell(page);
      await capture(page, 'web', 'jamie', '06-profile');
    });
  });
});
