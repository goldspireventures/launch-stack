import { cookies } from 'next/headers';
import { PERSONA_COOKIE } from '@goldspire/config';
import { TenantOverviewClient } from './tenant-overview-client';

export default function TenantOverviewPage() {
  const personaId = cookies().get(PERSONA_COOKIE)?.value ?? null;
  return <TenantOverviewClient personaId={personaId} />;
}
