import { cookies } from 'next/headers';
import { PERSONA_COOKIE, getPersonaById } from '@goldspire/config';
import { HeartlineAppShell } from '@/components/heartline-app-shell';
import { DatingProfileGate } from '@/components/dating-profile-gate';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const personaId = cookieStore.get(PERSONA_COOKIE)?.value ?? null;
  const persona = getPersonaById(personaId);
  return (
    <HeartlineAppShell persona={persona}>
      <DatingProfileGate>{children}</DatingProfileGate>
    </HeartlineAppShell>
  );
}
