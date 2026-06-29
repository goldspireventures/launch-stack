import { cookies } from 'next/headers';
import { PERSONA_COOKIE } from '@goldspire/config';
import BuildClient from './ui';

export default async function BuildPage() {
  const store = await cookies();
  const personaId = store.get(PERSONA_COOKIE)?.value ?? null;
  return <BuildClient personaId={personaId} />;
}
