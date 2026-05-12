import { defineConfig } from 'drizzle-kit';
import { getMigrationDatabaseUrl } from '@goldspire/config/env';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Migrations require a session-mode connection — Supabase's transaction
    // pooler (port 6543) can't run DDL. resolveDatabaseUrls() in
    // @goldspire/config/db-url derives the right URL automatically.
    url: getMigrationDatabaseUrl(),
  },
  verbose: true,
  strict: true,
  schemaFilter: ['public'],
  casing: 'snake_case',
});
