import { env } from './env';

/** True when Playwright may send `x-e2e-persona` (local dev or CI with E2E_MOCK_STUDIO_AUTH=1). */
export function allowMockE2ePersona(): boolean {
  return (
    env.AUTH_PROVIDER === 'mock' &&
    (env.NODE_ENV !== 'production' || process.env.E2E_MOCK_STUDIO_AUTH === '1')
  );
}
