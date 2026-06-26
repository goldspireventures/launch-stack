import { TRPCError } from '@trpc/server';
import { env } from '@goldspire/config/env';
import { assertRateLimit } from '@goldspire/platform/rate-limit';
import { RateLimitError } from '@goldspire/platform/errors';
import { middleware } from './trpc';

export function publicRateLimitMiddleware(opts: {
  keyPrefix: string;
  limit: number;
  windowMs: number;
}) {
  return middleware(async ({ ctx, next, path }) => {
    if (env.NODE_ENV !== 'production' || process.env.E2E_DISABLE_RATE_LIMIT === '1') {
      return next();
    }
    const ip = ctx.ipAddress?.split(',')[0]?.trim() ?? 'anonymous';
    const key = `${opts.keyPrefix}:${path}:${ip}`;
    try {
      await assertRateLimit({ key, limit: opts.limit, windowMs: opts.windowMs });
    } catch (err) {
      if (err instanceof RateLimitError) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: err.message,
        });
      }
      throw err;
    }
    return next();
  });
}
