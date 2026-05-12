import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

/**
 * Centralized env loader. Every workspace that needs env values should import
 * `env` from `@goldspire/config` rather than reading `process.env` directly.
 *
 * Design notes:
 *  - All secrets are optional at the schema level so the stack runs out-of-the-box
 *    with mock providers. Real providers throw a clearer error at boot when a
 *    key is missing.
 *  - The `provider` selectors below let you flip between mock and real services
 *    per concern (auth/payment/ai), which is the only abstraction surface that
 *    legitimately benefits from a strategy pattern.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/goldspire'),
    DIRECT_URL: z.string().optional(),

    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    AUTH_PROVIDER: z.enum(['mock', 'supabase', 'clerk']).default('mock'),
    CLERK_SECRET_KEY: z.string().optional(),

    PAYMENT_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    REVENUECAT_API_KEY: z.string().optional(),

    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('Goldspire <noreply@goldspire.local>'),

    INNGEST_EVENT_KEY: z.string().optional(),
    INNGEST_SIGNING_KEY: z.string().optional(),

    POSTHOG_API_KEY: z.string().optional(),
    SENTRY_DSN: z.string().optional(),

    AI_PROVIDER: z.enum(['mock', 'openai', 'anthropic']).default('mock'),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),

    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    STORAGE_PROVIDER: z.enum(['supabase', 's3', 'mock']).default('supabase'),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),

    GOLDSPIRE_TENANT_ID: z.string().default('acme'),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    NEXT_PUBLIC_CONSOLE_URL: z.string().url().default('http://localhost:3001'),
    NEXT_PUBLIC_ADMIN_URL: z.string().url().default('http://localhost:3002'),
    NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().default('https://eu.i.posthog.com'),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  },
  clientPrefix: 'NEXT_PUBLIC_',
  runtimeEnv: typeof process !== 'undefined' ? process.env : {},
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
  emptyStringAsUndefined: true,
});

/**
 * Read NODE_ENV directly off `process.env` so these helpers are safe to
 * evaluate at module load. `env.NODE_ENV` is declared as a server var on
 * the t3-env schema, and any client-side access throws. `process.env.NODE_ENV`
 * is inlined at build time by every bundler we use (Next, Metro, tsx),
 * so this is both safe and identical in behavior.
 */
const NODE_ENV = (typeof process !== 'undefined' ? process.env.NODE_ENV : undefined) ?? 'development';
export const isProduction = NODE_ENV === 'production';
export const isDevelopment = NODE_ENV === 'development';
export const isTest = NODE_ENV === 'test';

/**
 * Returns true when real (non-mock) credentials are present for the given
 * provider. Use this to gate features that should be hidden when running
 * with mocks (e.g. the "Connect Stripe" button).
 *
 * IMPORTANT: every key here is a lazy getter. The naive eager form
 * (`auth: env.AUTH_PROVIDER !== 'mock'`) would read server-only env vars
 * at module-load time, which t3-env throws on in the browser. With getters,
 * accessing `hasRealProvider.foo` only triggers env access at the call
 * site — server callers see real values; client callers will still throw,
 * but only at the point of misuse, not on the bare `import { env } from
 * '@goldspire/config/env'` that hundreds of files do.
 */
export const hasRealProvider = {
  get auth() {
    return env.AUTH_PROVIDER !== 'mock' && (!!env.SUPABASE_URL || !!env.CLERK_SECRET_KEY);
  },
  get payments() {
    return env.PAYMENT_PROVIDER === 'stripe' && !!env.STRIPE_SECRET_KEY;
  },
  get ai() {
    return (
      (env.AI_PROVIDER === 'openai' && !!env.OPENAI_API_KEY) ||
      (env.AI_PROVIDER === 'anthropic' && !!env.ANTHROPIC_API_KEY)
    );
  },
  get email() {
    return !!env.RESEND_API_KEY;
  },
  get jobs() {
    return !!env.INNGEST_EVENT_KEY;
  },
  get analytics() {
    return !!env.POSTHOG_API_KEY;
  },
  get errors() {
    return !!env.SENTRY_DSN;
  },
} as const;

export {
  resolveDatabaseUrls,
  getRuntimeDatabaseUrl,
  getMigrationDatabaseUrl,
  type DatabaseUrlChoice,
} from './db-url';
