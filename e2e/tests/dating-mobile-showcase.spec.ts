import { test, expect } from '@playwright/test';
import { capture, setMobilePersona, waitForHeartlineShell } from './helpers/heartline-screenshots';

test.describe('Heartline mobile web showcase', () => {
  test.describe('Sarah (free)', () => {
    test.beforeEach(async ({ page }) => {
      await setMobilePersona(page, 'heartline.customer.sarah');
    });

    test('capture mobile free tier', async ({ page }) => {
      await page.goto('/');
      await waitForHeartlineShell(page);
      await expect(page.getByText(/Discover/i).first()).toBeVisible({ timeout: 25_000 });
      await capture(page, 'mobile', 'sarah', '01-discover');

      await page.getByRole('tab', { name: /likes/i }).click();
      await waitForHeartlineShell(page);
      await expect(page.getByText(/people like you|person likes you/i)).toBeVisible({ timeout: 25_000 });
      await capture(page, 'mobile', 'sarah', '02-likes-gated');

      await page.getByRole('tab', { name: /profile/i }).click();
      await waitForHeartlineShell(page);
      await capture(page, 'mobile', 'sarah', '03-profile');
    });
  });

  test.describe('Jamie (Plus)', () => {
    test.beforeEach(async ({ page }) => {
      await setMobilePersona(page, 'heartline.customer.jamie');
    });

    test('capture mobile showroom tabs', async ({ page }) => {
      await page.goto('/');
      await waitForHeartlineShell(page);
      await capture(page, 'mobile', 'jamie', '01-discover');

      await page.getByRole('tab', { name: /likes/i }).click();
      await waitForHeartlineShell(page);
      await capture(page, 'mobile', 'jamie', '02-likes');

      await page.getByRole('tab', { name: /matches/i }).click();
      await waitForHeartlineShell(page);
      await capture(page, 'mobile', 'jamie', '03-matches');
      const sarahRow = page.getByText(/Sarah/i).first();
      if (await sarahRow.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await sarahRow.click();
        await waitForHeartlineShell(page);
        await capture(page, 'mobile', 'jamie', '03b-messages-thread');
      }

      const chatTab = page.getByRole('tab', { name: /chat/i });
      if (await chatTab.isVisible().catch(() => false)) {
        await chatTab.click();
        await waitForHeartlineShell(page);
        await capture(page, 'mobile', 'jamie', '04-messages-inbox');
        const row = page.getByText(/Sarah|Jamie/i).first();
        if (await row.isVisible().catch(() => false)) {
          await row.click();
          await waitForHeartlineShell(page);
          await capture(page, 'mobile', 'jamie', '05-messages-thread');
        }
      }

      await page.getByRole('tab', { name: /profile/i }).click();
      await waitForHeartlineShell(page);
      await capture(page, 'mobile', 'jamie', '06-profile');

      const plusTab = page.getByRole('tab', { name: /plus/i });
      if (await plusTab.isVisible().catch(() => false)) {
        await plusTab.click();
        await waitForHeartlineShell(page);
        await capture(page, 'mobile', 'jamie', '07-premium');
      }
    });
  });
});
