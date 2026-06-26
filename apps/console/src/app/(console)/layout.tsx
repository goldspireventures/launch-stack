import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getCurrentUser } from '@goldspire/auth';
import { env } from '@goldspire/config/env';
import { allowMockE2ePersona } from '@goldspire/config/mock-e2e';
import {
  PERSONA_COOKIE,
  getPersonaById,
  inRoles,
  STUDIO_CONSOLE_ROLES,
  TENANT_ADMIN_ROLES,
} from '@goldspire/config';
import { ConsoleShell } from '@/components/console-shell';

const STUDIO_TENANT_SLUG = 'goldspire';

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  // Playwright can inject this header when HttpOnly persona cookies do not stick on localhost.
  const e2ePersona = allowMockE2ePersona() ? (await headers()).get('x-e2e-persona') : null;
  if (e2ePersona) {
    const persona = getPersonaById(e2ePersona);
    if (persona && inRoles(persona.role, STUDIO_CONSOLE_ROLES)) {
      return (
        <ConsoleShell persona={persona} personaId={e2ePersona}>
          {children}
        </ConsoleShell>
      );
    }
  }
  const personaId = cookieStore.get(PERSONA_COOKIE)?.value;
  const persona = getPersonaById(personaId);
  const user = await getCurrentUser({
    accessToken,
    personaId,
    tenantHint: persona?.tenantSlug ?? STUDIO_TENANT_SLUG,
  });

  if (!user) {
    redirect(`${env.NEXT_PUBLIC_ADMIN_URL}/?notice=access-denied`);
  }

  if (!inRoles(user.role, STUDIO_CONSOLE_ROLES)) {
    const dest = inRoles(user.role, TENANT_ADMIN_ROLES)
      ? `${env.NEXT_PUBLIC_ADMIN_URL}/dashboard?notice=studio-only-area`
      : `${env.NEXT_PUBLIC_ADMIN_URL}/?notice=access-denied`;
    redirect(dest);
  }

  return (
    <ConsoleShell persona={persona} personaId={personaId ?? null}>
      {children}
    </ConsoleShell>
  );
}
