import { test, expect } from '@playwright/test';
import { signInAsStudioOwner } from '../helpers/mock-auth';

const bookingBase = process.env.E2E_NOVA_CARE_URL ?? 'http://localhost:4015';

test.describe('Nova Care — Tier 1 booking golden path', () => {
  test('services and book flow render for prospects', async ({ page }) => {
    await page.goto(`${bookingBase}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });

    await page.goto(`${bookingBase}/services`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /services/i })).toBeVisible({ timeout: 15_000 });

    await page.goto(`${bookingBase}/book`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/book|appointment|visit/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('factory lists booking Tier 1 preset', async ({ page }) => {
    await signInAsStudioOwner(page);
    const consoleBase = process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';
    await page.goto(`${consoleBase}/factory`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/clinic|booking|nova/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
