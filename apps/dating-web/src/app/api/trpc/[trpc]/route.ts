import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createTRPCContext } from '@goldspire/api';
import { logger, withRequestLogging } from '@goldspire/logger/next';

const innerHandler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        headers: req.headers,
        ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      }),
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

export const GET = withRequestLogging(innerHandler, { service: 'dating-web' });
export const POST = withRequestLogging(innerHandler, { service: 'dating-web' });
