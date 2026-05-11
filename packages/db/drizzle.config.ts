import { defineConfig } from 'drizzle-kit';
import { env } from '@goldspire/config/env';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DIRECT_URL ?? env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
  schemaFilter: ['public'],
  casing: 'snake_case',
});
