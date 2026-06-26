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
  transpilePackages: [
    '@goldspire/ui',
    '@goldspire/api',
    '@goldspire/auth',
    '@goldspire/config',
    '@goldspire/access',
    '@goldspire/commercial',
    '@goldspire/db',
    '@goldspire/knowledge',
    '@goldspire/platform',
    '@goldspire/logger',
  ],
};

export default nextConfig;
