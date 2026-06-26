/**
 * Adds health route, instrumentation, and security middleware to each Next app.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const APPS = [
  { dir: 'dating-web', app: 'heartline' },
  { dir: 'booking-web', app: 'nova-care' },
  { dir: 'goldspire-web', app: 'goldspire-web' },
  { dir: 'console', app: 'console' },
  { dir: 'atlas', app: 'atlas' },
  { dir: 'admin', app: 'admin' },
  { dir: 'client-portal', app: 'client-portal' },
  { dir: 'marketplace-web', app: 'bazaar' },
  { dir: 'community-web', app: 'signal' },
  { dir: 'ai-agent-web', app: 'lumen' },
  { dir: 'b2b-saas-web', app: 'acme-workspace' },
];

const healthRoute = (app) => `import { handleHttpHealth } from '@goldspire/api/http-health';

export async function GET() {
  return handleHttpHealth('${app}');
}
`;

const instrumentation = `export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  const [{ initSentry }, { collectProductionConfigIssues, assertProductionConfig }] =
    await Promise.all([
      import('@goldspire/platform/sentry'),
      import('@goldspire/platform/production-guard'),
    ]);
  await initSentry();
  for (const issue of collectProductionConfigIssues()) {
    if (issue.severity === 'error') {
      console.error(\`[production-guard] \${issue.code}: \${issue.message}\`);
    }
  }
  if (process.env.GOLDSPIRE_STRICT_PRODUCTION === '1') {
    assertProductionConfig();
  }
}
`;

const middleware = `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SECURITY_HEADERS } from '@goldspire/platform/security-headers';

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  for (const { key, value } of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
`;

for (const { dir, app } of APPS) {
  const appDir = path.join(root, 'apps', dir, 'src');
  if (!fs.existsSync(appDir)) continue;

  const apiHealth = path.join(appDir, 'app', 'api', 'health', 'route.ts');
  fs.mkdirSync(path.dirname(apiHealth), { recursive: true });
  fs.writeFileSync(apiHealth, healthRoute(app));

  fs.writeFileSync(path.join(appDir, 'instrumentation.ts'), instrumentation);
  fs.writeFileSync(path.join(appDir, 'middleware.ts'), middleware);
  console.log(`prod wiring: ${dir}`);
}
