import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  clearFlag,
  getFlagDefinition,
  isEnabled,
  listFlagsForAdmin,
  setFlag,
  type FlagKey,
} from '@goldspire/feature-flags';
import { logAudit } from '@goldspire/audit';
import { router, tenantAdminProcedure, protectedProcedure } from '../trpc';

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
      tenantId: ctx.user.tenantId,
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

  set: tenantAdminProcedure.input(setFlagInput).mutation(async ({ ctx, input }) => {
    try {
      await setFlag({
        tenantId: ctx.user.tenantId,
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
      tenantId: ctx.user.tenantId,
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
      const def = getFlagDefinition(input.key);
      if (!def) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown flag key: ${input.key}` });
      }
      try {
        await clearFlag({
          tenantId: ctx.user.tenantId,
          key: input.key as FlagKey,
          db: ctx.db,
          actorRole: ctx.user.role,
        });
      } catch (e) {
        mapFlagError(e);
      }
      await logAudit({
        tenantId: ctx.user.tenantId,
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
