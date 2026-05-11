/**
 * Sentry wrapper. Apps install `@sentry/nextjs` and call `initSentry()` at
 * startup. This module no-ops when SENTRY_DSN is missing so local dev never
 * spams a real project.
 */
import { env, hasRealProvider } from '@goldspire/config';
import { logger } from './logger';

let initialized = false;

export async function initSentry(): Promise<void> {
  if (initialized) return;
  if (!hasRealProvider.errors) {
    logger.debug('[sentry] DSN not set — skipping init');
    return;
  }
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: env.SENTRY_DSN,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
      environment: env.NODE_ENV,
      enabled: true,
    });
    initialized = true;
    logger.info('[sentry] initialized');
  } catch (err) {
    logger.warn('[sentry] init failed', undefined, err);
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!hasRealProvider.errors) {
    logger.error('[sentry mock]', err, context);
    return;
  }
  // Lazy import keeps Sentry out of the bundle when not used.
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.withScope((scope) => {
      if (context) {
        for (const [key, value] of Object.entries(context)) {
          scope.setExtra(key, value);
        }
      }
      Sentry.captureException(err);
    });
  });
}
