import { test, expect } from '@playwright/test';
import { signInAsStudioOwner } from '../helpers/mock-auth';

const consoleBase = process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';

test.describe('Platform v2 — revenue & routing', () => {
  test.describe.configure({ mode: 'serial' });

  test('settings expose enquiry routing and billing signals', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/settings`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /studio settings/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/enquiry routing/i).first()).toBeVisible();
    await page.getByRole('tab', { name: /billing/i }).click();
    await expect(page.getByText(/portfolio mrr/i).first()).toBeVisible();
    await expect(page.getByText(/churn \(rolling\)/i).first()).toBeVisible();
    await page.getByRole('tab', { name: /integrations/i }).click();
    await expect(page.getByText(/inngest \(studio cron\)/i).first()).toBeVisible();
    await expect(page.getByText(/\/api\/inngest/).first()).toBeVisible();
  });

  test('desk pulse loads after cache warm (repeat navigation)', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /morning/i })).toBeVisible({ timeout: 20_000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/open enquiries/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /action queue/i })).toBeVisible();
  });
});
