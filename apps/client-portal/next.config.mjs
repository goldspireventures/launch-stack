import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    '@goldspire/commercial',
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
