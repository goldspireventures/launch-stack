import { initTRPC, TRPCError, type AnyTRPCMiddlewareFunction } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { type Role, inRoles, STUDIO_CONSOLE_ROLES } from '@goldspire/config';
import { GoldspireError } from '@goldspire/platform';
import { isEnabled, type ModuleFlagKey } from '@goldspire/feature-flags';
import { withStudioContext, withTenantContext } from '@goldspire/db';
import { loggingMiddleware } from '@goldspire/logger/trpc';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        code:
          error.cause instanceof GoldspireError ? error.cause.code : shape.data.code,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure
  .use(loggingMiddleware as unknown as AnyTRPCMiddlewareFunction)
  .use(async ({ next, ctx, path }) => {
    try {
      return await next({ ctx });
    } catch (err) {
      if (err instanceof GoldspireError) {
        throw new TRPCError({
          code: mapHttpToTrpc(err.status),
          message: err.message,
          cause: err,
        });
      }
      throw err;
    }
  });

/**
 * Combined auth + RLS guard for every protected procedure.
 *
 *  1. Refuses unauthenticated calls (narrows `ctx.user` to non-null).
 *  2. Wraps the resolver in a tenant-scoped tx (or studio bypass for
 *     STUDIO_OWNER / STUDIO_STAFF) so RLS policies match every query.
 *
 * Kept as one middleware so TypeScript can narrow `ctx.user` in a single
 * step and downstream resolvers see `ctx.user: AuthedUser` (not nullable).
 */
const authedTenantMiddleware = middleware(async ({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  const user = ctx.user;
  if (inRoles(user.role, STUDIO_CONSOLE_ROLES)) {
    return withStudioContext(ctx.db, user.id, async (tx) =>
      next({ ctx: { ...ctx, db: tx, user } }),
    );
  }
  return withTenantContext(ctx.db, user.tenantId, user.id, async (tx) =>
    next({ ctx: { ...ctx, db: tx, user } }),
  );
});

export const protectedProcedure = publicProcedure.use(authedTenantMiddleware);

export function roleProcedure(allowed: readonly Role[]) {
  return protectedProcedure.use(async ({ next, ctx }) => {
    const user = ctx.user;
    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    if (!inRoles(user.role, allowed)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Requires one of: ${allowed.join(', ')}`,
      });
    }
    return next({ ctx });
  });
}

export const tenantAdminProcedure = roleProcedure([
  'STUDIO_OWNER',
  'STUDIO_STAFF',
  'TENANT_OWNER',
  'TENANT_ADMIN',
]);

export const studioProcedure = roleProcedure(STUDIO_CONSOLE_ROLES);

/**
 * Strict module gate for capability flags. Studio console roles bypass so
 * internal tools stay reachable regardless of per-tenant module toggles.
 */
export const requireModule = (moduleKey: ModuleFlagKey) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    if (inRoles(ctx.user.role, STUDIO_CONSOLE_ROLES)) {
      return next();
    }
    const enabled = await isEnabled(moduleKey, {
      tenantId: ctx.user.tenantId,
      userId: ctx.user.id,
      role: ctx.user.role,
      db: ctx.db,
    });
    if (!enabled) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Module disabled for tenant: ${moduleKey}`,
      });
    }
    return next();
  });

function mapHttpToTrpc(status: number): TRPCError['code'] {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}
