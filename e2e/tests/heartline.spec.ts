import { test, expect } from '@playwright/test';

test.describe('Heartline (mock auth)', () => {
  test.use({
    storageState: {
      cookies: [
        {
          name: 'goldspire_persona',
          value: 'heartline.customer.sarah',
          domain: 'localhost',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  });

  test('discover loads for seeded persona', async ({ page }) => {
    await page.goto('/discover');
    await expect(page.locator('body')).not.toContainText('Not authenticated');
    await expect(page.getByRole('link', { name: /messages|matches|profile/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('safety page is reachable', async ({ page }) => {
    await page.goto('/safety');
    await expect(page.getByRole('heading', { name: /safety/i })).toBeVisible();
  });
});
