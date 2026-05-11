/* eslint-disable no-console */
import postgres from 'postgres';
import { env } from '@goldspire/config/env';

const url = env.DIRECT_URL ?? env.DATABASE_URL;

async function main() {
  console.warn('⚠  DROPPING all goldspire tables in the public schema');
  if (env.NODE_ENV === 'production') {
    throw new Error('refusing to reset in production');
  }
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    await sql.unsafe(`
      drop schema if exists public cascade;
      create schema public;
      grant all on schema public to postgres;
      grant all on schema public to public;
    `);
    console.log('✓ public schema reset');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('✗ reset failed:', err);
  process.exit(1);
});
