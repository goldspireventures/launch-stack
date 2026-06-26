import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createTRPCContext } from '@goldspire/api';
import { logger, withRequestLogging } from '@goldspire/logger/next';

/** Expo web dev server — mobile companion calls dating-web tRPC cross-origin in dev. */
const DEV_CORS_ORIGINS = new Set([
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
]);

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin') ?? '';
  if (!DEV_CORS_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'content-type, authorization, x-goldspire-tenant, x-goldspire-persona, x-e2e-persona, trpc-batch-mode',
  };
}

function withCors(req: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(req))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const innerHandler = async (req: Request) => {
  const response = await fetchRequestHandler({
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
  return withCors(req, response);
};

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export const GET = withRequestLogging(innerHandler, { service: 'dating-web' });
export const POST = withRequestLogging(innerHandler, { service: 'dating-web' });
