import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Each Next.js app sits inside the monorepo at apps/<name>, but the canonical
// `.env` lives at the workspace root. Next.js auto-loads `.env` from the app
// directory only, so without this our @t3-oss/env-core validator falls back to
// the placeholder localhost DATABASE_URL and the runtime tRPC handler dies
// with `AggregateError: connect ECONNREFUSED ::1:5432`. `process.loadEnvFile`
// (Node ≥20.6) only sets vars that aren't already in `process.env`, so any
// shell-exported override still wins. Failing softly because CI / Docker
// images may legitimately have no .env on disk.
try {
  process.loadEnvFile(path.join(__dirname, '../../.env'));
} catch (err) {
  if (err && /** @type {{code?: string}} */ (err).code !== 'ENOENT') throw err;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/leads', destination: '/pipeline?stage=inbound', permanent: false },
      { source: '/deals', destination: '/pipeline?stage=delivery', permanent: false },
      { source: '/deals/:id', destination: '/engagements/:id', permanent: false },
      { source: '/factory', destination: '/build?tab=factory', permanent: false },
      { source: '/tenants', destination: '/build?tab=tenants', permanent: false },
      { source: '/onboard', destination: '/build?tab=onboard', permanent: false },
      { source: '/build/launch', destination: '/build?tab=launch', permanent: false },
      { source: '/reports', destination: '/insight?tab=reports', permanent: false },
      { source: '/apps', destination: '/insight?tab=apps', permanent: false },
      { source: '/lab', destination: '/insight?tab=lab', permanent: false },
      { source: '/lab/compare', destination: '/insight?tab=lab', permanent: false },
      { source: '/commercial', destination: '/configure?tab=commercial', permanent: false },
      { source: '/playbooks', destination: '/configure?tab=playbooks', permanent: false },
      { source: '/catalog', destination: '/configure?tab=templates', permanent: false },
      { source: '/catalog/templates', destination: '/configure?tab=templates', permanent: false },
      { source: '/catalog/offerings', destination: '/configure?tab=offerings', permanent: false },
      { source: '/catalog/feature-flags', destination: '/configure?tab=flags', permanent: false },
      { source: '/reference', destination: '/configure?tab=launch', permanent: false },
      { source: '/docs', destination: '/configure?tab=docs', permanent: false },
      { source: '/delivery', destination: '/configure?tab=playbooks', permanent: false },
      { source: '/blueprints', destination: '/configure?tab=templates', permanent: false },
      { source: '/settings', destination: '/configure?tab=studio', permanent: false },
      { source: '/audit', destination: '/insight?tab=reports', permanent: false },
      { source: '/analytics', destination: '/insight?tab=reports', permanent: false },
      { source: '/plans', destination: '/insight?tab=reports', permanent: false },
    ];
  },
  experimental: {
    instrumentationHook: true,
  },
  transpilePackages: [
    '@goldspire/api',
    '@goldspire/ui',
    '@goldspire/config',
    '@goldspire/auth',
    '@goldspire/blueprints',
    '@goldspire/commercial',
    '@goldspire/db',
    '@goldspire/validation',
    '@goldspire/platform',
    '@goldspire/payments',
    '@goldspire/ai',
    '@goldspire/audit',
    '@goldspire/analytics',
    '@goldspire/feature-flags',
    '@goldspire/notifications',
    '@goldspire/chat',
  ],
};
export default nextConfig;
