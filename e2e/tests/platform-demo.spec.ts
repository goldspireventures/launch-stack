/**
 * End-to-end “studio demo” funnel — safe to run before a live walkthrough.
 * Serial: marketing → console enquiry → commercial → portal sample deal.
 */
import { test, expect } from '@playwright/test';
import { submitContactBrief } from '../helpers/contact-form';
import { signInAsStudioOwner } from '../helpers/mock-auth';

const consoleBase = process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';
const marketingBase = process.env.E2E_MARKETING_URL ?? 'http://localhost:4010';
const portalBase = process.env.E2E_PORTAL_URL ?? 'http://localhost:4005';
const portalPath =
  process.env.E2E_PORTAL_DEMO_PATH ??
  '/deal/01HNM9S49HY6CC31P21S4Y6K9M?token=gspl_goldspire_sales_demo_26';

test.describe('Platform demo funnel', () => {
  test.describe.configure({ mode: 'serial' });

  test('marketing site core routes respond', async ({ request }) => {
    for (const route of ['/', '/templates', '/pricing', '/contact']) {
      const res = await request.get(`${marketingBase.replace(/\/$/, '')}${route}`);
      expect(res.ok(), `${route} ${res.status()}`).toBeTruthy();
    }
    const health = await request.get(`${marketingBase.replace(/\/$/, '')}/api/health`);
    expect(health.ok()).toBeTruthy();
  });

  test('contact brief lands in console enquiries', async ({ page }) => {
    const stamp = Date.now();
    const email = `demo-funnel-${stamp}@goldspire.test`;
    const name = `Demo Visitor ${stamp}`;
    const message =
      'Full platform demo enquiry — automated funnel check with enough characters for validation.';

    await submitContactBrief(page, { name, email, message });

    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/leads`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /enquiries/i })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /^all$/i }).click();
    await page.getByPlaceholder(/search name, email/i).fill(email);
    await expect(page.getByRole('cell', { name: email })).toBeVisible({ timeout: 30_000 });
  });

  test('studio surfaces for live demo', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /morning/i })).toBeVisible({ timeout: 20_000 });

    await page.goto(`${consoleBase}/commercial`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /commercial hub/i })).toBeVisible({ timeout: 20_000 });

    await page.goto(`${consoleBase}/deals`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/deal desk/i).first()).toBeVisible({ timeout: 30_000 });

    await page.goto(`${consoleBase}/factory`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^factory$/i })).toBeVisible({ timeout: 20_000 });
  });

  test('client portal sample deal is client-ready', async ({ page }) => {
    const summaryLoaded = page.waitForResponse(
      (r) => r.url().includes('portalDeals.summary') && r.ok(),
      { timeout: 60_000 },
    );
    await page.goto(`${portalBase.replace(/\/$/, '')}${portalPath}`, { waitUntil: 'domcontentloaded' });
    await summaryLoaded;
    await expect(page.locator('body')).not.toContainText(/invalid or revoked|portal unavailable/i);
    await expect(page.getByRole('tab', { name: /^pulse$/i })).toBeVisible({ timeout: 15_000 });
  });
});
