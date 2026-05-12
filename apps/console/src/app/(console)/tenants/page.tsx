import { cookies } from 'next/headers';
import { PERSONA_COOKIE } from '@goldspire/config';
import { TenantsTable } from './table';

/**
 * Console /tenants — cross-tenant directory.
 *
 * Server component so we can read the persona cookie at request time and
 * pass it to the client table. The "Open Admin" deep-link forwards the
 * persona to Admin so the studio operator stays themselves after the cross-
 * origin redirect (cookies are scoped to host:port, so they can't follow
 * automatically).
 */
export default async function TenantsPage() {
  const store = await cookies();
  const personaId = store.get(PERSONA_COOKIE)?.value ?? null;
  return <TenantsTable personaId={personaId} />;
}
