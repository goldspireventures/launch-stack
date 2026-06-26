/**
 * Load monorepo root .env before reading process.env in Node scripts.
 */
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function loadRootEnv() {
  config({ path: path.join(repoRoot, '.env') });
  config({ path: path.join(repoRoot, '.env.local') });
}
