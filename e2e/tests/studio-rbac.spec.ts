import { test, expect } from '@playwright/test';
import { signInAsStudioOwner, signInAsStudioStaff } from '../helpers/mock-auth';

const consoleOrigin = () => process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';

test.describe('Studio staff RBAC', () => {
  test('owner sees Reports in nav', async ({ page }) => {
    await signInAsStudioOwner(page);
    await expect(page.getByTitle('Reports')).toBeVisible();
  });

  test('staff cannot see owner-only nav items', async ({ page }) => {
    await signInAsStudioStaff(page);
    await expect(page.getByTitle('Reports')).toHaveCount(0);
    await page.getByTitle('More').click();
    await expect(page.getByRole('menuitem', { name: 'Commercial' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Stamp tenant' })).toHaveCount(0);
  });

  test('staff settings hide billing tab', async ({ page }) => {
    await signInAsStudioStaff(page);
    await page.goto(`${consoleOrigin()}/settings`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tab', { name: /billing/i })).toHaveCount(0);
    await expect(page.getByText(/routing and Deal Desk webhooks are limited/i)).toBeVisible();
  });

  test('staff direct URL to reports shows access message or redirect', async ({ page }) => {
    await signInAsStudioStaff(page);
    await page.goto(`${consoleOrigin()}/reports`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(/owner|forbidden|billing|access/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
