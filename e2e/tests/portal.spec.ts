import { test, expect } from '@playwright/test';

const PORTAL_PATH =
  process.env.E2E_PORTAL_DEMO_PATH ??
  '/deal/01HNM9S49HY6CC31P21S4Y6K9M?token=gspl_goldspire_sales_demo_26';

const TIER2_PORTAL_PATH =
  process.env.E2E_PORTAL_TIER2_DEMO_PATH ??
  '/deal/01HNM9S49HY6CC31P21S4Y6K9P?token=gspl_goldspire_tier2_demo_26';

test.describe('Client portal sample deal', () => {
  test('sales demo deal portal loads', async ({ page }) => {
    const summaryLoaded = page.waitForResponse(
      (r) => r.url().includes('portalDeals.summary') && r.ok(),
      { timeout: 60_000 },
    );
    await page.goto(PORTAL_PATH, { waitUntil: 'domcontentloaded' });
    await summaryLoaded;
    await expect(page.locator('body')).not.toContainText(/invalid or revoked|portal unavailable/i);
    await expect(page.getByRole('tab', { name: /^pulse$/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('tab', { name: /^plan$/i })).toBeVisible();
  });

  test('tier 2 demo shows delivery sign-offs and client can confirm', async ({ page }) => {
    const summaryLoaded = page.waitForResponse(
      (r) => r.url().includes('portalDeals.summary') && r.ok(),
      { timeout: 60_000 },
    );
    await page.goto(TIER2_PORTAL_PATH, { waitUntil: 'domcontentloaded' });
    await summaryLoaded;
    await expect(page.locator('body')).not.toContainText(/invalid or revoked|portal unavailable/i);
    await expect(page.getByText('Delivery sign-offs')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Template specification')).toBeVisible();
    const confirm = page.getByRole('button', { name: /^I confirm$/i });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(page.getByText(/You: Signed/i)).toBeVisible({ timeout: 10_000 });
  });
});
