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
import { evaluateAccess, type AccessActor } from '@goldspire/access';
import { AtlasChrome } from '@/components/atlas-chrome';

const STUDIO_TENANT_SLUG = 'goldspire';

function canEnterAtlas(role: string): boolean {
  const actor: AccessActor = {
    userId: 'layout-check',
    role: role as AccessActor['role'],
    tenantId: 'layout',
  };
  return evaluateAccess(actor, {
    action: 'atlas:app.enter',
    resource: { type: 'atlas.app' },
  }).allowed;
}

export default async function AtlasLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const e2ePersona = allowMockE2ePersona() ? (await headers()).get('x-e2e-persona') : null;
  if (e2ePersona) {
    const persona = getPersonaById(e2ePersona);
    if (persona && canEnterAtlas(persona.role)) {
      return <AtlasChrome persona={persona}>{children}</AtlasChrome>;
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

  if (!canEnterAtlas(user.role)) {
    const dest = inRoles(user.role, STUDIO_CONSOLE_ROLES)
      ? `${env.NEXT_PUBLIC_CONSOLE_URL}/?notice=atlas-denied`
      : inRoles(user.role, TENANT_ADMIN_ROLES)
        ? `${env.NEXT_PUBLIC_ADMIN_URL}/dashboard?notice=atlas-denied`
        : `${env.NEXT_PUBLIC_ADMIN_URL}/?notice=access-denied`;
    redirect(dest);
  }

  return <AtlasChrome persona={persona}>{children}</AtlasChrome>;
}
