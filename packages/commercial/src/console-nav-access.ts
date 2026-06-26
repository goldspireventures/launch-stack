import type { StudioConsoleCapability } from './lead-lifecycle';
import { studioHasCapability } from './lead-lifecycle';

/** Console routes gated by studio capability (href → required cap). */
export const CONSOLE_ROUTE_CAPABILITY: Readonly<Record<string, StudioConsoleCapability>> = {
  '/reports': 'billing.read',
  '/commercial': 'commercial.edit',
  '/playbooks': 'commercial.edit',
  '/lab': 'lab.manage',
  '/onboard': 'tenants.manage',
  '/catalog/feature-flags': 'tenants.manage',
};

export function consoleRouteAllowed(role: string, href: string): boolean {
  const cap = CONSOLE_ROUTE_CAPABILITY[href];
  if (!cap) return true;
  return studioHasCapability(role, cap);
}

export function filterConsoleNavItems<T extends { href: string }>(
  role: string,
  items: ReadonlyArray<T>,
): T[] {
  return items.filter((item) => consoleRouteAllowed(role, item.href));
}
