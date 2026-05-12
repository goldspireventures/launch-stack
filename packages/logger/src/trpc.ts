import { performance } from 'node:perf_hooks';
import { experimental_standaloneMiddleware, TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';
import { logger, requestId as getRequestId } from './index';

/**
 * Logs each procedure with tenant/user/path/duration. Safe when `ctx.user` is missing.
 * Request id is taken from `ctx.requestId` (if ever set), else AsyncLocalStorage (`withRequestLogging`), else a new nanoid.
 * Compose with: `t.procedure.use(loggingMiddleware)` (see `loggedProcedureFactory`).
 *
 * Uses a broad `ctx` generic so this middleware chains on Goldspire `Context` without
 * structural mismatch; fields are narrowed inside the handler.
 */
export const loggingMiddleware = experimental_standaloneMiddleware<{
  ctx: Record<string, unknown>;
}>().create(async ({ ctx: rawCtx, next, path, type }) => {
  const ctx = rawCtx as {
    user?: { id: string; tenantId: string; role: string } | null;
    requestId?: string;
  };
  const fromCtx = ctx.requestId;
  const fromAls = getRequestId();
  const requestId = fromCtx ?? fromAls ?? nanoid(12);

  const user = ctx.user ?? undefined;
  const tenantId = user?.tenantId;
  const userId = user?.id;
  const role = user?.role;

  const started = performance.now();
  try {
    const result = await next();
    const durationMs = Math.round(performance.now() - started);
    logger.info(
      { requestId, tenantId, userId, role, path, type, durationMs },
      'trpc.procedure ok',
    );
    return result;
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - started);
    if (err instanceof TRPCError) {
      const e = err;
      logger.error(
        {
          requestId,
          tenantId,
          userId,
          role,
          path,
          type,
          durationMs,
          code: e.code,
          msg: e.message,
          cause: e.cause,
        },
        'trpc.procedure failed',
      );
    } else if (err instanceof Error) {
      const e = err;
      logger.error(
        {
          requestId,
          tenantId,
          userId,
          role,
          path,
          type,
          durationMs,
          code: 'UNKNOWN',
          msg: e.message,
          cause: e.cause,
        },
        'trpc.procedure failed',
      );
    } else {
      logger.error(
        {
          requestId,
          tenantId,
          userId,
          role,
          path,
          type,
          durationMs,
          code: 'UNKNOWN',
          msg: String(err),
        },
        'trpc.procedure failed',
      );
    }
    throw err;
  }
});

/**
 * Example wiring (equivalent to chaining `.use(loggingMiddleware)` yourself):
 * `const publicProcedure = loggedProcedureFactory(t.procedure);`
 */
export function loggedProcedureFactory<P extends { use: (mw: typeof loggingMiddleware) => unknown }>(
  procedure: P,
) {
  return procedure.use(loggingMiddleware);
}
