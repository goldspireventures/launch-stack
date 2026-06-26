import { sql } from 'drizzle-orm';
import { db } from '@goldspire/db';
import { env, hasRealProvider } from '@goldspire/config/env';

export type HttpHealthPayload = {
  ok: boolean;
  app: string;
  version: string;
  env: string;
  checks: {
    database: boolean;
  };
  providers: Record<string, 'live' | 'mock'>;
  time: string;
};

const APP_VERSION = process.env.npm_package_version ?? '0.0.0';

export async function buildHttpHealth(appName: string): Promise<HttpHealthPayload> {
  let database = false;
  try {
    await db.execute(sql`select 1`);
    database = true;
  } catch {
    database = false;
  }

  return {
    ok: database,
    app: appName,
    version: APP_VERSION,
    env: env.NODE_ENV,
    checks: { database },
    providers: {
      auth: hasRealProvider.auth ? 'live' : 'mock',
      payments: hasRealProvider.payments ? 'live' : 'mock',
      ai: hasRealProvider.ai ? 'live' : 'mock',
      email: hasRealProvider.email ? 'live' : 'mock',
      jobs: hasRealProvider.jobs ? 'live' : 'mock',
      analytics: hasRealProvider.analytics ? 'live' : 'mock',
      errors: hasRealProvider.errors ? 'live' : 'mock',
    },
    time: new Date().toISOString(),
  };
}

export async function handleHttpHealth(appName: string): Promise<Response> {
  const body = await buildHttpHealth(appName);
  return Response.json(body, {
    status: body.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
