import { TRPCError } from '@trpc/server';
import { inRoles, STUDIO_CONSOLE_ROLES } from '@goldspire/config';
import {
  supportScopeAllowsBilling,
  supportScopeAllowsMutations,
  type SupportAccessScope,
} from '@goldspire/commercial';
import type { AuthedUser } from '@goldspire/auth';
import { tenantScopeId, type TenantScopedContext } from './tenant-scope';

export type SupportSessionContext = {
  scope: SupportAccessScope;
  expiresAt: Date;
  sessionId: string;
} | null;

/** Studio acting on a client tenant via JIT session — block disallowed mutations. */
export function assertSupportMutationAllowed(opts: {
  user: AuthedUser;
  homeTenantId: string;
  activeTenantId: string;
  supportSession: SupportSessionContext;
  needsBilling?: boolean;
}) {
  if (!inRoles(opts.user.role, STUDIO_CONSOLE_ROLES)) return;
  if (opts.homeTenantId === opts.activeTenantId) return;
  if (!opts.supportSession) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Studio support session required for this tenant.',
    });
  }
  if (opts.needsBilling && !supportScopeAllowsBilling(opts.supportSession.scope)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This action requires billing scope on the support session.',
    });
  }
  if (!supportScopeAllowsMutations(opts.supportSession.scope)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Support session is read-only.',
    });
  }
}

/** Shorthand for tenant-admin mutations under a client lens. */
export function assertCtxSupportMutation(
  ctx: TenantScopedContext & { supportSession?: SupportSessionContext | null },
  needsBilling?: boolean,
) {
  assertSupportMutationAllowed({
    user: ctx.user,
    homeTenantId: ctx.user.tenantId,
    activeTenantId: tenantScopeId(ctx),
    supportSession: ctx.supportSession ?? null,
    needsBilling,
  });
}
