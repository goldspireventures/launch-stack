import { env } from '@goldspire/config/env';
import { supabaseService } from '@goldspire/platform';

export interface StudioTeamInviteDelivery {
  mode: 'mock' | 'supabase';
  message: string;
}

/**
 * Send (or simulate) a studio team invite. Creates the DB row first; this only
 * handles the auth-provider side.
 */
export async function deliverStudioTeamInvite(input: {
  email: string;
  tenantSlug: string;
}): Promise<StudioTeamInviteDelivery> {
  const consoleBase = (process.env.NEXT_PUBLIC_CONSOLE_URL ?? 'http://localhost:4001').replace(
    /\/$/,
    '',
  );

  if (env.AUTH_PROVIDER === 'supabase') {
    const sb = supabaseService();
    if (sb) {
      const redirectTo = `${consoleBase}/auth/callback?tenant=${encodeURIComponent(input.tenantSlug)}`;
      const { error } = await sb.auth.admin.inviteUserByEmail(input.email, { redirectTo });
      if (!error) {
        return {
          mode: 'supabase',
          message: `Invite email sent to ${input.email}. They sign in with that address on the studio tenant.`,
        };
      }
      return {
        mode: 'supabase',
        message: `User row created, but Supabase invite failed: ${error.message}. Share ${consoleBase} and ensure they sign up with ${input.email}.`,
      };
    }
  }

  return {
    mode: 'mock',
    message: `Mock auth: user is invited in the database. Use persona switcher or seed login as ${input.email} on tenant "${input.tenantSlug}". Console: ${consoleBase}`,
  };
}
