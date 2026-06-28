import { cookies } from 'next/headers';
import { PERSONA_COOKIE } from '@goldspire/config';
import { TenantOverviewClient } from './tenant-overview-client';

export default async function TenantOverviewPage() {
  const cookieStore = await cookies();
  const personaId = cookieStore.get(PERSONA_COOKIE)?.value ?? null;
  return <TenantOverviewClient personaId={personaId} />;
}
