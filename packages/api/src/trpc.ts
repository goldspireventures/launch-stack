import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { type Role, inRoles, STUDIO_CONSOLE_ROLES } from '@goldspire/config';
import { GoldspireError } from '@goldspire/platform';
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

export const publicProcedure = t.procedure.use(async ({ next, ctx, path }) => {
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

export const protectedProcedure = publicProcedure.use(async ({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export function roleProcedure(allowed: readonly Role[]) {
  return protectedProcedure.use(async ({ next, ctx }) => {
    if (!inRoles(ctx.user.role, allowed)) {
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
