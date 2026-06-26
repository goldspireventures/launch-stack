#!/usr/bin/env node
/**
 * Ensures every Drizzle journal entry has a matching SQL file on disk.
 * Run from migrate.ts — prevents "schema up to date" while a column migration never applies.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DRIZZLE_DIR = fileURLToPath(new URL('../drizzle/', import.meta.url));
const JOURNAL = join(DRIZZLE_DIR, 'meta', '_journal.json');

export function verifyDrizzleJournal() {
  if (!existsSync(JOURNAL)) {
    throw new Error(`Missing Drizzle journal: ${JOURNAL}`);
  }
  const journal = JSON.parse(readFileSync(JOURNAL, 'utf8'));
  const entries = journal.entries ?? [];
  const missing = [];
  for (const e of entries) {
    const sql = join(DRIZZLE_DIR, `${e.tag}.sql`);
    if (!existsSync(sql)) missing.push(e.tag);
  }
  if (missing.length > 0) {
    throw new Error(
      `Drizzle journal lists migrations without SQL files: ${missing.join(', ')}. ` +
        'Add the .sql file or remove the journal entry.',
    );
  }
  return entries.length;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const n = verifyDrizzleJournal();
  console.log(`✓ drizzle journal OK (${n} migrations)`);
}
