import { test, expect } from '@playwright/test';
import { signInAsStudioOwner } from '../helpers/mock-auth';

const atlasBase = process.env.E2E_ATLAS_URL ?? 'http://localhost:4016';

test.describe('Goldspire Atlas', () => {
  test('loads knowledge portal for studio owner', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(atlasBase, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /ask the platform/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Goldspire Atlas/i).first()).toBeVisible();
  });

  test('health endpoint responds', async ({ request }) => {
    const res = await request.get(`${atlasBase}/api/health`);
    expect(res.ok()).toBeTruthy();
  });
});
