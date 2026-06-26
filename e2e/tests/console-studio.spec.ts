import { test, expect } from '@playwright/test';
import { signInAsStudioOwner } from '../helpers/mock-auth';

const consoleBase = process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';
/** Seeded sales demo deal — see `@goldspire/config/studio-sales-demo`. */
const SALES_DEMO_DEAL_ID = '01HNM9S49HY6CC31P21S4Y6K9M';

test.describe('Studio Console (mock auth)', () => {
  test.describe.configure({ mode: 'serial' });

  test('desk loads with studio shell', async ({ page }) => {
    await signInAsStudioOwner(page);
    await expect(page.getByText(/goldspire studio/i).first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: /studio navigation/i })).toBeVisible();
  });

  test('delivery guide and factory surfaces load', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/delivery`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /delivery guide/i })).toBeVisible({ timeout: 20_000 });

    await page.goto(`${consoleBase}/factory`, { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: /^factory$/i })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /delivery presets in flight/i }),
    ).toBeVisible();
  });

  test('deals list and settings load', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/deals`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/deal desk/i).first()).toBeVisible({ timeout: 30_000 });

    await page.goto(`${consoleBase}/settings`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /studio settings/i })).toBeVisible();
    await expect(page.getByText(/primary contact email/i)).toBeVisible();
  });

  test('deal desk phase rail jumps to matching cockpit tab', async ({ page }) => {
    await signInAsStudioOwner(page);
    await page.goto(`${consoleBase}/deals/${SALES_DEMO_DEAL_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('navigation', { name: /delivery phases/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/how to work this deal/i)).toBeVisible();

    const handoverPhase = page.getByRole('link', { name: /handover/i }).first();
    await expect(handoverPhase).toBeVisible();
    await handoverPhase.click();
    await expect(page).toHaveURL(new RegExp(`module=handover`));
    await expect(page.getByRole('heading', { name: /handover checklist/i })).toBeVisible({
      timeout: 15_000,
    });

    const kickoffPhase = page.getByRole('link', { name: /kickoff/i }).first();
    await kickoffPhase.click();
    await expect(page).toHaveURL(new RegExp(`module=kickoff`));
    await expect(page.getByText(/kickoff checklist/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
