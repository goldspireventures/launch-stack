/**
 * Generates error.tsx, loading.tsx, not-found.tsx, and client-error API route
 * for each Next.js app in apps/.
 *
 * Usage: node scripts/generate-route-boundaries.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const APPS = [
  { dir: 'dating-web', title: 'Heartline' },
  { dir: 'booking-web', title: 'Nova Care' },
  { dir: 'goldspire-web', title: 'Goldspire' },
  { dir: 'console', title: 'Studio Console' },
  { dir: 'admin', title: 'Admin' },
  { dir: 'client-portal', title: 'Project hub' },
  { dir: 'marketplace-web', title: 'Bazaar' },
  { dir: 'community-web', title: 'Signal' },
  { dir: 'ai-agent-web', title: 'Lumen' },
  { dir: 'b2b-saas-web', title: 'Acme workspace' },
];

const errorTsx = (title) => `'use client';

import { AppRouteError } from '@goldspire/ui';

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppRouteError {...props} title="${title}" />;
}
`;

const loadingTsx = (title) => `import { AppRouteLoading } from '@goldspire/ui';

export default function Loading() {
  return <AppRouteLoading label="Loading ${title}…" />;
}
`;

const notFoundTsx = (title) => `import { AppNotFound } from '@goldspire/ui';

export default function NotFound() {
  return <AppNotFound title="Page not found · ${title}" />;
}
`;

const apiRoute = () => `import { handleClientErrorReport } from '@goldspire/ui/server';

export async function POST(req: Request) {
  return handleClientErrorReport(req);
}
`;

for (const { dir, title } of APPS) {
  const appDir = path.join(root, 'apps', dir, 'src', 'app');
  if (!fs.existsSync(appDir)) {
    console.warn(`skip ${dir}: no src/app`);
    continue;
  }
  fs.writeFileSync(path.join(appDir, 'error.tsx'), errorTsx(title));
  fs.writeFileSync(path.join(appDir, 'loading.tsx'), loadingTsx(title));
  fs.writeFileSync(path.join(appDir, 'not-found.tsx'), notFoundTsx(title));
  const apiDir = path.join(appDir, 'api', 'log', 'client-error');
  fs.mkdirSync(apiDir, { recursive: true });
  fs.writeFileSync(path.join(apiDir, 'route.ts'), apiRoute());
  console.log(`wrote route boundaries for ${dir}`);
}
