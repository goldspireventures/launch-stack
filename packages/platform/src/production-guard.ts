import { env, hasRealProvider, isProduction } from '@goldspire/config/env';

export type ProductionConfigIssue = {
  severity: 'error' | 'warn';
  code: string;
  message: string;
};

/**
 * Validates environment before production deploy. Call from instrumentation or preflight.
 */
export function collectProductionConfigIssues(): ProductionConfigIssue[] {
  if (!isProduction) return [];

  const issues: ProductionConfigIssue[] = [];

  if (env.AUTH_PROVIDER === 'mock') {
    issues.push({
      severity: 'error',
      code: 'auth_mock',
      message: 'AUTH_PROVIDER must not be "mock" in production.',
    });
  }

  if (env.PAYMENT_PROVIDER === 'mock') {
    issues.push({
      severity: 'warn',
      code: 'payments_mock',
      message: 'PAYMENT_PROVIDER is mock — studio deal payments will not settle via Stripe.',
    });
  }

  if (env.STUDIO_DEAL_DEV_RESET_ENABLED === 'true' || env.STUDIO_DEAL_DEV_RESET_ENABLED === '1') {
    issues.push({
      severity: 'error',
      code: 'deal_dev_reset',
      message: 'STUDIO_DEAL_DEV_RESET_ENABLED must be off in production.',
    });
  }

  if (!hasRealProvider.errors) {
    issues.push({
      severity: 'warn',
      code: 'sentry_missing',
      message: 'SENTRY_DSN is unset — client and server errors will not be tracked.',
    });
  }

  if (env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1')) {
    issues.push({
      severity: 'error',
      code: 'database_local',
      message: 'DATABASE_URL points at localhost in production.',
    });
  }

  return issues;
}

export function assertProductionConfig(): void {
  const issues = collectProductionConfigIssues().filter((i) => i.severity === 'error');
  if (issues.length === 0) return;
  const msg = issues.map((i) => `${i.code}: ${i.message}`).join('\n');
  throw new Error(`Production configuration invalid:\n${msg}`);
}
