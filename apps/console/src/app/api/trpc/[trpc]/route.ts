import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createTRPCContext } from '@goldspire/api';
import { logger, withRequestLogging } from '@goldspire/logger/next';

const innerHandler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers, tenantHint: 'goldspire' }),
    onError({ error, path }) {
      logger.error(
        {
          path,
          code: error.code,
          cause: error.cause instanceof Error ? error.cause.message : String(error.cause ?? ''),
        },
        error.message,
      );
    },
  });

export const GET = withRequestLogging(innerHandler, { service: 'console' });
export const POST = withRequestLogging(innerHandler, { service: 'console' });
