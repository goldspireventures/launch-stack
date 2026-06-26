/**
 * Studio tenant identity — config-driven instead of hardcoded `goldspire` in routers.
 */

import { env } from './env';

/** Slug of the operator tenant row (Console, enquiries, studio profile JSON). */
export function getStudioTenantSlug(): string {
  return env.GOLDSPIRE_STUDIO_TENANT_SLUG;
}
