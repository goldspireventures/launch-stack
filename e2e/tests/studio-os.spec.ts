import { test, expect } from '@playwright/test';
import { signInAsStudioOwner } from '../helpers/mock-auth';

const consoleBase = process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';
const marketingBase = process.env.E2E_MARKETING_URL ?? 'http://localhost:4010';

test.describe('Studio OS — G/H/I surfaces', () => {
  test.describe.configure({ mode: 'serial' });

  test('desk exposes business pulse and action queue', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /morning/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Open enquiries/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Pipeline value/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /action queue/i })).toBeVisible();
    await expect(page.getByText(/stale enquiries first/i)).toBeVisible();
  });

  test('commercial hub explains three pricing layers', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/commercial`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /commercial hub/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/layer 1/i).first()).toBeVisible();
    await expect(page.getByText(/deal desk may diverge/i)).toBeVisible();
    await expect(page.getByText(/pnpm audit:commercial-sync/i)).toBeVisible();
  });

  test('playbooks load and show enquiry SLA', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/playbooks`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /playbooks/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/enquiry sla/i).first()).toBeVisible();
    await expect(page.getByText(/pricing layers/i).first()).toBeVisible();
  });

  test('catalog links to commercial and blueprint highlight route', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/catalog/templates`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: /commercial hub/i }).first()).toBeVisible({ timeout: 20_000 });
    const blueprintLink = page.getByRole('link', { name: /^blueprint$/i }).first();
    await expect(blueprintLink).toBeVisible();
    const href = await blueprintLink.getAttribute('href');
    expect(href).toMatch(/\/blueprints\?highlight=/);
  });

  test('delivery guide lists console surfaces including commercial', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/delivery`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /delivery guide/i })).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator('main').getByRole('link', { name: /^commercial$/i }).first(),
    ).toBeVisible();
  });
});

test.describe('Studio OS — public guards', () => {
  test('planned template returns not found on marketing API', async ({ request }) => {
    const res = await request.get(
      `${marketingBase.replace(/\/$/, '')}/api/trpc/marketing.templateById?input=${encodeURIComponent(
        JSON.stringify({ json: { id: 'nonexistent_planned_sku_xyz' } }),
      )}`,
    );
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('contact rejects missing budget via API shape', async ({ request }) => {
    const res = await request.post(`${marketingBase.replace(/\/$/, '')}/api/trpc/marketing.submitDiscovery`, {
      headers: { 'content-type': 'application/json' },
      data: {
        json: {
          name: 'E2E Guard',
          email: 'guard@goldspire.test',
          message: 'Testing validation — at least twenty characters here.',
        },
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Studio OS — contact dedupe stress', () => {
  test('duplicate submit within dedupe window returns same lead id', async ({ request }) => {
    const stamp = Date.now();
    const email = `e2e-dedupe-${stamp}@goldspire.test`;
    const message =
      'Dedupe stress test message for studio OS — identical payload twice within sixty seconds.';

    const payload = {
      json: {
        name: `Dedupe ${stamp}`,
        email,
        company: null,
        message,
        budgetBand: '25k_60k',
        timeline: 'within_3m',
        honeypot: '',
      },
    };

    const url = `${marketingBase.replace(/\/$/, '')}/api/trpc/marketing.submitDiscovery`;
    const first = await request.post(url, {
      headers: { 'content-type': 'application/json' },
      data: payload,
    });
    const second = await request.post(url, {
      headers: { 'content-type': 'application/json' },
      data: payload,
    });
    expect(first.ok()).toBeTruthy();
    expect(second.ok()).toBeTruthy();
    const body1 = (await first.json()) as { result?: { data?: { json?: { id?: string; deduped?: boolean } } } };
    const body2 = (await second.json()) as { result?: { data?: { json?: { id?: string; deduped?: boolean } } } };
    const id1 = body1.result?.data?.json?.id;
    const id2 = body2.result?.data?.json?.id;
    expect(id1).toBeTruthy();
    expect(id2).toBe(id1);
    expect(body2.result?.data?.json?.deduped).toBe(true);
  });
});
