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
  experimental: {
    instrumentationHook: true,
  },
  transpilePackages: [
    '@goldspire/api',
    '@goldspire/ui',
    '@goldspire/config',
    '@goldspire/auth',
    '@goldspire/blueprints',
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
