import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMonorepoRootEnv } from '../../scripts/next-load-root-env.mjs';

loadMonorepoRootEnv(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
