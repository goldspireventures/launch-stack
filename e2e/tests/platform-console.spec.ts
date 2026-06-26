import { test, expect } from '@playwright/test';
import { signInAsStudioOwner } from '../helpers/mock-auth';

const consoleBase = process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';

test.describe('Studio Console — IA & flows', () => {
  test('desk is action-first with telemetry strip', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /morning/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /action queue/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /pipeline snapshot/i })).toBeVisible();
    await page
      .waitForResponse(
        (r) => r.url().includes('studio.deskPulse') && r.ok(),
        { timeout: 25_000 },
      )
      .catch(() => undefined);
    await expect(page.getByText(/Open enquiries/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/business pulse breakdown/i)).toBeVisible();
  });

  test('reports holds full business pulse grid', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/reports`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /operational reports/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/^business pulse$/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Open enquiries/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('settings team tab and invite form for owner', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/settings`, { waitUntil: 'domcontentloaded' });
    const teamTab = page.getByRole('tab', { name: 'Team & access' });
    await teamTab.click();
    await expect(teamTab).toHaveAttribute('data-state', 'active');
    await expect(page.getByText('Invite operator')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#invite-email')).toBeVisible();
  });

  test('leads list supports deep link param', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/leads`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /enquiries/i })).toBeVisible({ timeout: 20_000 });
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await expect(page).toHaveURL(/lead=/);
  });
});
