import { performance } from 'node:perf_hooks';
import { nanoid } from 'nanoid';
import { logger, requestId, setLoggerServiceName, withRequestId } from './index';

export { logger, requestId };

export type WithRequestLoggingOptions = {
  /** Sets the log file prefix (`<service>-<date>.log`) before the first log line. */
  service?: string;
};

/**
 * Wraps a Next.js App Router handler so each request gets a `requestId` in AsyncLocalStorage
 * (picked up by tRPC middleware and pino `mixin`), logs start/end, and logs + rethrows errors.
 */
export function withRequestLogging<
  H extends (req: Request, ...args: unknown[]) => Promise<Response> | Response,
>(handler: H, options?: WithRequestLoggingOptions): H {
  if (options?.service) {
    setLoggerServiceName(options.service);
  }

  return (async (req: Request, ...args: unknown[]) => {
    const id = nanoid(12);
    const t0 = performance.now();
    const url = new URL(req.url);
    const path = url.pathname;
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? '';

    return withRequestId(id, async () => {
      logger.info({ method: req.method, path, ip }, 'request.start');
      try {
        const res = await Promise.resolve(handler(req, ...args));
        const durationMs = Math.round(performance.now() - t0);
        logger.info({ status: res.status, durationMs }, 'request.end');
        return res;
      } catch (err) {
        const durationMs = Math.round(performance.now() - t0);
        if (err instanceof Error) {
          logger.error(
            { durationMs, stack: err.stack, name: err.name },
            err.message,
          );
        } else {
          logger.error({ durationMs }, String(err));
        }
        throw err;
      }
    });
  }) as H;
}
