import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createTRPCContext } from '@goldspire/api';

const handler = (req: Request) =>
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
      // eslint-disable-next-line no-console
      console.error(`[trpc] ${path}: ${error.message}`);
    },
  });

export { handler as GET, handler as POST };
