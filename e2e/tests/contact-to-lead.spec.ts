import { test, expect } from '@playwright/test';
import { submitContactBrief } from '../helpers/contact-form';
import { fillControlled, signInAsStudioOwner } from '../helpers/mock-auth';

const consoleBase = process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';

test.describe('Contact → Console enquiry', () => {
  test.describe.configure({ mode: 'serial' });

  test('marketing brief appears in Pipeline', async ({ page, request }) => {
    const stamp = Date.now();
    const email = `e2e-contact-${stamp}@goldspire.test`;
    const name = `E2E Visitor ${stamp}`;
    const message =
      'Automated Playwright enquiry for the studio funnel. Safe to archive after review. Twenty chars minimum.';

    await submitContactBrief(page, { name, email, message });

    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/pipeline`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /client pipeline/i })).toBeVisible({
      timeout: 20_000,
    });

    const input = encodeURIComponent(JSON.stringify({ json: { status: 'all', search: email, limit: 50 } }));
    const res = await request.get(`${consoleBase}/api/trpc/marketing.listLeads?input=${input}`, {
      headers: { 'x-e2e-persona': 'studio.owner' },
    });
    if (!res.ok()) {
      throw new Error(`listLeads failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as { result?: { data?: { json?: { rows?: Array<{ email?: string }> } } } };
    const rows = body.result?.data?.json?.rows ?? [];
    expect(rows.some((r) => r.email === email)).toBeTruthy();

    await page.getByRole('button', { name: /^all$/i }).click();
    await fillControlled(page.getByPlaceholder(/search name, email/i), email);

    await expect(page.getByText(email).first()).toBeVisible({ timeout: 25_000 });

    await page.getByRole('link', { name: 'Triage' }).first().click();
    await expect(page.getByText(/auto-triage|qualification brief/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
