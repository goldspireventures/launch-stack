import { test, expect } from '@playwright/test';
import { signInAsStudioOwner } from '../helpers/mock-auth';

const consoleBase = process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';
const marketingBase = process.env.E2E_MARKETING_URL ?? 'http://localhost:4010';
const portalBase = process.env.E2E_CLIENT_PORTAL_URL ?? 'http://localhost:4005';

/**
 * Visual / UX smoke for build-plan waves — layout order, headings, primary actions visible.
 */
test.describe('Build plan — operator & client UX', () => {
  test.describe.configure({ mode: 'serial' });

  test('Desk: action queue and KPI strip are scannable', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /action queue/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/open enquiries/i).first()).toBeVisible({ timeout: 20_000 });
    const main = page.locator('main');
    await expect(main).toBeVisible();
    await expect(main.getByRole('heading').first()).toBeVisible();
  });

  test('Enquiries: lead drawer shows qualification before convert', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/leads`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /enquiries/i })).toBeVisible({ timeout: 20_000 });
    const firstRow = page.locator('table tbody tr').first();
    if ((await firstRow.count()) > 0) {
      await firstRow.click();
      await expect(page.getByText(/budget|timeline|qualification/i).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('Deals: health badge and module flow on sample deal', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/deals`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^deals$/i })).toBeVisible({ timeout: 20_000 });
    const link = page.locator('a[href^="/deals/"]:not([href="/deals/new"])').first();
    if ((await link.count()) === 0) return;
    await link.click();
    await expect(page.getByText(/^Health \d+/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/kickoff|runbook|milestone/i).first()).toBeVisible();
  });

  test('Settings: clone capacity toggles visible for owner', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/settings`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/clone capacity/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/social_matching\/dating/).first()).toBeVisible();
  });

  test('Marketing contact → discovery intent path', async ({ page }) => {
    await page.goto(`${marketingBase}/contact?intent=discovery`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/discovery|alignment sprint/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('textbox', { name: /your name/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^email/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /product in plain language/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /send brief/i })).toBeVisible();
    const main = page.locator('main');
    await expect(main.getByText(/budget/i).first()).toBeVisible();
    await expect(main.getByText(/when do you need/i).first()).toBeVisible();
  });

  test('Client portal: pulse tab shows milestones progress', async ({ page }) => {
    const path = '/deal/01HNM9S49HY6CC31P21S4Y6K9M?token=gspl_goldspire_sales_demo_26';
    const summaryLoaded = page.waitForResponse(
      (r) => r.url().includes('portalDeals.summary') && r.ok(),
      { timeout: 60_000 },
    );
    await page.goto(`${portalBase}${path}`, { waitUntil: 'domcontentloaded' });
    await summaryLoaded;
    await expect(page.locator('body')).not.toContainText(/invalid or revoked|portal unavailable/i);
    await expect(page.getByRole('tab', { name: /^pulse$/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/milestone/i).first()).toBeVisible();
  });
});
