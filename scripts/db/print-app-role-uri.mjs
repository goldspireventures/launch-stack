#!/usr/bin/env node
/**
 * Print instructions for wiring DATABASE_URL_APP after migrate.
 * Usage: pnpm db:app-role
 */
import { loadRootEnv, repoRoot } from '../setup/load-root-env.mjs';

loadRootEnv();

const dbUrl = process.env.DATABASE_URL ?? '';
let host = '(your pooler host)';
let projectHint = '';

try {
  const u = new URL(dbUrl);
  host = u.hostname;
  const parts = u.username.split('.');
  if (parts.length > 1) projectHint = parts[1];
} catch {
  /* ignore */
}

console.log(`
Goldspire app role — connection setup
Repo: ${repoRoot}

1. Ensure role exists:
   pnpm db:migrate

2. Set password (Supabase SQL editor):
   alter role goldspire_app with password 'choose-a-strong-password';

3. Add to .env / Vercel (session pooler, port 5432):
   DATABASE_URL_APP=postgresql://goldspire_app.${projectHint || 'PROJECT_REF'}:PASSWORD@${host}:5432/postgres

4. Keep DATABASE_URL as postgres/service for migrations only.

5. Verify:
   pnpm test:rls
   NODE_ENV=production pnpm verify:prod-env

See docs/deployment/database-app-role.md
`);
