/**
 * Shared POST handler for `/api/log/client-error`. Each app re-exports this
 * to provide the route — the body shape is `ClientErrorReporter`'s payload.
 *
 * In dev: logs to stdout with a bright prefix so the error is visible in the
 * `pnpm dev` terminal. In production this is where you'd forward to Sentry
 * / Datadog / your error pipeline.
 */

interface ClientErrorPayload {
  kind?: 'error' | 'rejection';
  app?: string;
  message?: string;
  stack?: string;
  url?: string;
  lineno?: number;
  colno?: number;
  userAgent?: string;
  timestamp?: string;
}

export async function handleClientErrorReport(req: Request): Promise<Response> {
  let payload: ClientErrorPayload;
  try {
    payload = (await req.json()) as ClientErrorPayload;
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const app = payload.app ?? 'web';
  const kind = payload.kind ?? 'error';
  const message = payload.message ?? '(no message)';
  const url = payload.url ?? '(no url)';

  // Pino-ish line so it's grep-able and stands out in the terminal next to
  // Next.js's request logs.
  const header = `\x1b[31m[CLIENT_${kind.toUpperCase()}]\x1b[0m \x1b[36m[${app}]\x1b[0m ${message}`;
  console.error(header);
  console.error(`  at ${url}`);
  if (payload.stack) {
    const indented = payload.stack
      .split('\n')
      .map((line) => '    ' + line)
      .join('\n');
    console.error(indented);
  }
  if (payload.userAgent) {
    console.error(`  ua: ${payload.userAgent}`);
  }

  return new Response(null, { status: 204 });
}
