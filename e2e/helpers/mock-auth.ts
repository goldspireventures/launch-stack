import { expect, type Locator, type Page } from '@playwright/test';

export const STUDIO_OWNER_PERSONA = 'studio.owner';
export const STUDIO_STAFF_PERSONA = 'studio.staff';
const PERSONA_COOKIE = 'goldspire_persona';

const consoleOrigin = () => process.env.E2E_CONSOLE_URL ?? 'http://localhost:4001';

function installConsolePersonaHeader(page: Page, personaId: string) {
  const origin = consoleOrigin();
  return page.route(`${origin}/**`, async (route) => {
    const headers = { ...route.request().headers(), 'x-e2e-persona': personaId };
    await route.continue({ headers });
  });
}

async function signInConsolePersona(page: Page, personaId: string) {
  await page.context().addCookies([
    {
      name: PERSONA_COOKIE,
      value: personaId,
      domain: 'localhost',
      path: '/',
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  await installConsolePersonaHeader(page, personaId);
  await page.goto(`${consoleOrigin()}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: /^enquiries$/i }).first()).toBeVisible({ timeout: 30_000 });
}

/** Types into a controlled React field so component state updates. */
export async function fillControlled(locator: Locator, value: string) {
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 5 });
}

/** Opens the Console desk (dev-only `x-e2e-persona` on Console requests). */
export async function signInAsStudioOwner(page: Page) {
  await signInConsolePersona(page, STUDIO_OWNER_PERSONA);
}

/** Studio staff — enquiries/deals/factory; no billing/commercial/tenant stamp. */
export async function signInAsStudioStaff(page: Page) {
  await signInConsolePersona(page, STUDIO_STAFF_PERSONA);
}
