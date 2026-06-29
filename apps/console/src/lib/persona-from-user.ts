import type { PersonaDefinition } from '@goldspire/config';
import type { AuthedUser } from '@goldspire/auth';

/** Display chip for UserMenu when identity comes from Supabase, not the persona cookie. */
export function personaFromUser(user: AuthedUser, tenantSlug: string): PersonaDefinition {
  return {
    id: `user:${user.id}`,
    name: user.name ?? user.email.split('@')[0] ?? 'Studio',
    email: user.email,
    role: user.role,
    tenantSlug,
    bio: 'Goldspire Studio operator',
    surface: { app: 'console', path: '/' },
    group: 'studio',
  };
}
