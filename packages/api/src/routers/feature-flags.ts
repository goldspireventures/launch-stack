import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  clearFlag,
  getFlagDefinition,
  getLimit,
  isEnabled,
  listFlagsForAdmin,
  listPublicBooleanFlagKeys,
  listPublicLimitFlagKeys,
  listPublicModuleFlagKeys,
  setFlag,
  type FlagKey,
} from '@goldspire/feature-flags';
import { logAudit } from '@goldspire/audit';
import { inRoles, STUDIO_CONSOLE_ROLES } from '@goldspire/config';
import { router, tenantAdminProcedure, protectedProcedure } from '../trpc';
import { tenantScopeId } from '../lib/tenant-scope';
import { assertCtxSupportMutation } from '../lib/assert-support-scope';

/**
 * Catalog entries tagged `public` are safe to ship to end-user clients
 * (Heartline web/mobile). They drive visible UX so any role can read them.
 * Everything not tagged `public` stays admin-only — those leak internal
 * implementation hints.
 */
const PUBLIC_BOOLEAN_KEYS = listPublicBooleanFlagKeys();
const PUBLIC_LIMIT_KEYS = listPublicLimitFlagKeys();

const setFlagInput = z
  .object({
    key: z.string(),
    enabled: z.boolean().optional(),
    numericValue: z.number().int().optional(),
  })
  .superRefine((val, ctx) => {
    const def = getFlagDefinition(val.key);
    if (!def) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Unknown flag key', path: ['key'] });
      return;
    }
    if (def.kind === 'limit') {
      if (val.numericValue === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'numericValue required for limit flags', path: ['numericValue'] });
      }
    } else if (val.enabled === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'enabled required for this flag kind', path: ['enabled'] });
    }
  });

function mapFlagError(err: unknown): never {
  if (err instanceof Error) {
    if (err.message === 'STUDIO_ROLE_REQUIRED') {
      throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
    }
    if (err.message === 'TENANT_ID_REQUIRED') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
    }
    if (err.message.startsWith('UNKNOWN_FLAG_KEY')) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
    }
    if (err.message.includes('NUMERIC_VALUE')) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
    }
    if (err.message === 'ENABLED_REQUIRED') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
    }
  }
  throw err;
}

export const featureFlagsRouter = router({
  list: tenantAdminProcedure.query(async ({ ctx }) => {
    return listFlagsForAdmin({
      tenantId: tenantScopeId(ctx),
      db: ctx.db,
      actorRole: ctx.user.role,
    });
  }),

  isEnabled: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(({ ctx, input }) =>
      isEnabled(input.key, {
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        role: ctx.user.role,
        db: ctx.db,
      }),
    ),

  /**
   * Full public tenant surface for end-user apps: every `public`-tagged
   * boolean flag plus every `public`-tagged numeric limit, evaluated for
   * the current user's tenant. One round-trip so web + mobile shells can
   * read flags synchronously after the initial fetch and no studio-only
   * keys ever leak.
   */
  publicSurfaceForCurrentTenant: protectedProcedure.query(async ({ ctx }) => {
    const flagCtx = {
      tenantId: ctx.user.tenantId,
      userId: ctx.user.id,
      role: ctx.user.role,
      db: ctx.db,
    };
    const flags = Object.fromEntries(
      await Promise.all(
        PUBLIC_BOOLEAN_KEYS.map(async (key) => {
          const enabled = await isEnabled(key, flagCtx);
          return [key, enabled] as const;
        }),
      ),
    ) as Record<string, boolean>;
    const limits = Object.fromEntries(
      await Promise.all(
        PUBLIC_LIMIT_KEYS.map(async (key) => {
          const n = await getLimit(key, flagCtx);
          return [key, n] as const;
        }),
      ),
    ) as Record<string, number>;
    const modules = Object.fromEntries(
      await Promise.all(
        listPublicModuleFlagKeys().map(async (key) => {
          const enabled = await isEnabled(key, flagCtx);
          return [key, enabled] as const;
        }),
      ),
    ) as Record<string, boolean>;
    return { flags, limits, modules };
  }),

  set: tenantAdminProcedure.input(setFlagInput).mutation(async ({ ctx, input }) => {
    assertCtxSupportMutation(ctx);
    const def = getFlagDefinition(input.key);
    if (
      def &&
      inRoles(ctx.user.role, STUDIO_CONSOLE_ROLES) &&
      ctx.user.role !== 'STUDIO_OWNER' &&
      (def.scope === 'global' || def.studioOnly)
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only studio owners can change global or studio-only flags.',
      });
    }
    try {
      await setFlag({
        tenantId: tenantScopeId(ctx),
        key: input.key as FlagKey,
        enabled: input.enabled,
        numericValue: input.numericValue,
        db: ctx.db,
        actorRole: ctx.user.role,
      });
    } catch (e) {
      mapFlagError(e);
    }
    await logAudit({
      tenantId: tenantScopeId(ctx),
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'feature_flag_updated',
      entityType: 'feature_flag',
      entityId: input.key,
      metadata: { key: input.key, enabled: input.enabled, numericValue: input.numericValue },
    });
    return { ok: true as const };
  }),

  clear: tenantAdminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCtxSupportMutation(ctx);
      const def = getFlagDefinition(input.key);
      if (!def) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown flag key: ${input.key}` });
      }
      if (
        inRoles(ctx.user.role, STUDIO_CONSOLE_ROLES) &&
        ctx.user.role !== 'STUDIO_OWNER' &&
        (def.scope === 'global' || def.studioOnly)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only studio owners can clear global or studio-only flags.',
        });
      }
      try {
        await clearFlag({
          tenantId: tenantScopeId(ctx),
          key: input.key as FlagKey,
          db: ctx.db,
          actorRole: ctx.user.role,
        });
      } catch (e) {
        mapFlagError(e);
      }
      await logAudit({
        tenantId: tenantScopeId(ctx),
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'feature_flag_cleared',
        entityType: 'feature_flag',
        entityId: input.key,
        metadata: { key: input.key },
      });
      return { ok: true as const };
    }),
});
