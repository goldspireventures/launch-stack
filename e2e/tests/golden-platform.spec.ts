/**
 * Production-shaped golden path — one serial narrative across studio + client arms.
 * Run after `pnpm prep:demo` and full stack is Ready (`pnpm dev` or filtered dev).
 *
 *   pnpm test:e2e:golden
 */
import { test, expect } from '@playwright/test';
import { submitContactBrief } from '../helpers/contact-form';
import { signInAsStudioOwner } from '../helpers/mock-auth';

const marketing = () => process.env.E2E_MARKETING_URL?.replace(/\/$/, '') ?? 'http://localhost:4010';
const consoleBase = () => process.env.E2E_CONSOLE_URL?.replace(/\/$/, '') ?? 'http://localhost:4001';
const adminBase = () => process.env.E2E_ADMIN_URL?.replace(/\/$/, '') ?? 'http://localhost:4002';
const portalBase = () => process.env.E2E_PORTAL_URL?.replace(/\/$/, '') ?? 'http://localhost:4005';
const heartlineBase = () => process.env.E2E_HEARTLINE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';
const portalPath =
  process.env.E2E_PORTAL_DEMO_PATH ??
  '/deal/01HNM9S49HY6CC31P21S4Y6K9M?token=gspl_goldspire_sales_demo_26';

const ALL_SURFACES = [
  { label: 'Marketing', origin: marketing },
  { label: 'Console', origin: consoleBase },
  { label: 'Admin', origin: adminBase },
  { label: 'Portal', origin: portalBase },
  { label: 'Heartline', origin: heartlineBase },
  { label: 'Nova Care', origin: () => process.env.E2E_NOVA_CARE_URL?.replace(/\/$/, '') ?? 'http://localhost:4015' },
  { label: 'Bazaar', origin: () => process.env.E2E_BAZAAR_URL?.replace(/\/$/, '') ?? 'http://localhost:4011' },
  { label: 'Signal', origin: () => process.env.E2E_SIGNAL_URL?.replace(/\/$/, '') ?? 'http://localhost:4012' },
  { label: 'Lumen', origin: () => process.env.E2E_LUMEN_URL?.replace(/\/$/, '') ?? 'http://localhost:4013' },
  { label: 'Acme', origin: () => process.env.E2E_ACME_URL?.replace(/\/$/, '') ?? 'http://localhost:4014' },
];

test.describe('Golden platform — prod-shaped funnel', () => {
  test.describe.configure({ mode: 'serial' });

  test('all surfaces respond on /api/health', async ({ request }) => {
    for (const { label, origin } of ALL_SURFACES) {
      const base = typeof origin === 'function' ? origin() : origin();
      const res = await request.get(`${base}/api/health`, { timeout: 45_000 });
      expect(res.ok(), `${label} health ${res.status()}`).toBeTruthy();
    }
  });

  test('public marketing tells the studio story', async ({ page, request }) => {
    for (const route of ['/', '/templates', '/pricing', '/how-we-work', '/contact', '/status']) {
      const res = await request.get(`${marketing()}${route}`);
      expect(res.ok(), route).toBeTruthy();
    }
    await page.goto(`${marketing()}/pricing`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/clone a template|tier 1/i).first()).toBeVisible({ timeout: 20_000 });
    await page.goto(`${marketing()}/templates`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /templates|catalog/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('inbound brief appears in console enquiries', async ({ page }) => {
    const stamp = Date.now();
    const email = `golden-${stamp}@goldspire.test`;
    await submitContactBrief(page, {
      name: `Golden Visitor ${stamp}`,
      email,
      message:
        'Golden platform E2E — full inbound path with budget and timeline for studio triage validation.',
    });

    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase()}/leads`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /enquiries/i })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /^all$/i }).click();
    await page.getByPlaceholder(/search name, email/i).fill(email);
    await expect(page.getByRole('cell', { name: email })).toBeVisible({ timeout: 45_000 });
  });

  test('studio operator surfaces are demo-ready', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase()}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /morning/i })).toBeVisible({ timeout: 20_000 });

    await page.goto(`${consoleBase()}/commercial`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /commercial hub/i })).toBeVisible({ timeout: 20_000 });

    await page.goto(`${consoleBase()}/deals`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/deal desk/i).first()).toBeVisible({ timeout: 30_000 });

    await page.goto(`${consoleBase()}/factory`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^factory$/i })).toBeVisible({ timeout: 20_000 });

    await page.goto(`${consoleBase()}/settings`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible({ timeout: 20_000 });
  });

  test('tenant admin dashboard loads for Heartline owner', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'goldspire_persona',
        value: 'heartline.owner',
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
    await page.goto(`${adminBase()}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText(/not authenticated/i);
    await expect(page.getByRole('heading', { name: /dashboard|heartline/i }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('client portal sample deal is live', async ({ page }) => {
    const summaryLoaded = page.waitForResponse(
      (r) => r.url().includes('portalDeals.summary') && r.ok(),
      { timeout: 90_000 },
    );
    await page.goto(`${portalBase()}${portalPath}`, { waitUntil: 'domcontentloaded' });
    await summaryLoaded;
    await expect(page.locator('body')).not.toContainText(/invalid or revoked|portal unavailable/i);
    await expect(page.getByRole('tab', { name: /^pulse$/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('tab', { name: /^plan$/i })).toBeVisible();
  });

  test('Heartline customer discover is reachable', async ({ page }) => {
    await page.context().addCookies([
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
    ]);
    await page.goto(`${heartlineBase()}/discover`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText(/not authenticated/i);
    await expect(page.getByRole('link', { name: /messages|matches|profile/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
