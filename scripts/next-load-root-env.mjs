import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Load the monorepo root `.env` before Next/t3-env boot.
 * Next.js only auto-loads `.env` from the app directory; catalog apps
 * otherwise fall back to the placeholder localhost DATABASE_URL.
 */
export function loadMonorepoRootEnv(importMetaUrl) {
  const dir = path.dirname(fileURLToPath(importMetaUrl));
  try {
    process.loadEnvFile(path.join(dir, '../../.env'));
  } catch (err) {
    if (err && /** @type {{ code?: string }} */ (err).code !== 'ENOENT') throw err;
  }
}
