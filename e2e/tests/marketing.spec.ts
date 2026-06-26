import { test, expect } from '@playwright/test';
import { submitContactBrief } from '../helpers/contact-form';

const CONTACT_MESSAGE =
  'Automated smoke from Playwright — please ignore. Enough characters to pass validation.';

test.describe('Marketing site', () => {
  test.describe.configure({ mode: 'serial' });

  test('homepage shows live demos and primary CTAs', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /product design and engineering/i })).toBeVisible();
    await expect(page.getByText(/six product environments/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /heartline/i }).first()).toBeVisible();
  });

  test('pricing and templates load', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/three ways to size/i)).toBeVisible();
    await page.goto('/templates', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { level: 1, name: /recognisable product shapes/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^beta$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^planned$/i })).toHaveCount(0);
  });

  test('contact form submits with honeypot empty', async ({ page }) => {
    await submitContactBrief(page, {
      name: 'E2E Visitor',
      email: `e2e-${Date.now()}@example.com`,
      message: CONTACT_MESSAGE,
    });
  });

  test('legal pages render', async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /privacy/i })).toBeVisible();
    await page.goto('/terms', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /terms/i })).toBeVisible();
  });

  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('ok');
    expect(json).toHaveProperty('checks');
  });
});
