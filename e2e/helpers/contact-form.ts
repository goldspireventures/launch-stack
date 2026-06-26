import { expect, type Page } from '@playwright/test';
import { fillControlled } from './mock-auth';

export async function fillContactBrief(
  page: Page,
  fields: { name: string; email: string; message: string },
) {
  await page.goto('/contact', { waitUntil: 'load' });
  await expect(page.getByRole('textbox', { name: /your name/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /send brief/i })).toBeVisible();
  const nameInput = page.getByRole('textbox', { name: /your name/i });
  const emailInput = page.getByRole('textbox', { name: /^email/i });
  const messageInput = page.getByRole('textbox', { name: /product in plain language/i });
  await fillControlled(nameInput, fields.name);
  await fillControlled(emailInput, fields.email);
  await fillControlled(messageInput, fields.message);
  await page.locator('label').filter({ hasText: /budget/i }).locator('select').selectOption('25k_60k');
  await page.locator('label').filter({ hasText: /when do you need/i }).locator('select').selectOption('within_3m');
  await expect(nameInput).toHaveValue(fields.name);
  await expect(emailInput).toHaveValue(fields.email);
  await expect(messageInput).toHaveValue(fields.message);
  await expect(page.getByRole('button', { name: /send brief/i })).toBeEnabled({ timeout: 20_000 });
}

export async function submitContactBrief(
  page: Page,
  fields: { name: string; email: string; message: string },
) {
  await fillContactBrief(page, fields);
  await page.getByRole('button', { name: /send brief/i }).click();
  await expect(page.getByRole('heading', { name: /thank you/i })).toBeVisible({ timeout: 60_000 });
}
