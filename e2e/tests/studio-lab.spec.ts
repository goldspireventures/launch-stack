import { test, expect } from '@playwright/test';
import { signInAsStudioOwner, signInAsStudioStaff } from '../helpers/mock-auth';

const consoleBase = process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';

test.describe('Studio Lab — owner portfolio', () => {
  test('lab page loads with venture board and metrics', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/lab`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^lab$/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /venture board/i })).toBeVisible();
    await page.waitForResponse(
      (r) => r.url().includes('studioLab.summary') && r.ok(),
      { timeout: 25_000 },
    ).catch(() => undefined);
    await expect(page.getByText(/^total$/i)).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: '.screenshots/lab-board.png', fullPage: true });
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.count()) {
      await firstRow.click();
      await expect(page).toHaveURL(/venture=/);
      await page.screenshot({ path: '.screenshots/lab-detail.png', fullPage: true });
    }
  });

  test('desk shows lab snapshot for owner', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForResponse(
      (r) => r.url().includes('studio.deskPulse') && r.ok(),
      { timeout: 25_000 },
    ).catch(() => undefined);
    await expect(page.getByRole('heading', { name: /lab snapshot/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /open lab/i })).toBeVisible();
    await page.screenshot({ path: '.screenshots/desk-lab-snapshot.png', fullPage: true });
  });

  test('lab nav appears under More for owner', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.getByRole('button', { name: /more navigation/i }).click();
    await expect(page.getByRole('menuitem', { name: /^lab$/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('Studio Lab — RBAC', () => {
  test('staff cannot see Lab in nav', async ({ page }) => {
    await signInAsStudioStaff(page);
    await page.getByTitle('More').click();
    await expect(page.getByRole('menuitem', { name: /^lab$/i })).toHaveCount(0);
  });

  test('staff direct URL shows access message', async ({ page }) => {
    await signInAsStudioStaff(page);
    await page.goto(`${consoleBase}/lab`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/owner-only|limited to studio owners/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({ path: '.screenshots/lab-staff-denied.png', fullPage: true });
  });
});
