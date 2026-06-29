#!/usr/bin/env tsx
/** Remove walkthrough test deals created by e2e/audit/deal-walkthrough.mjs */
import { eq, or, inArray } from 'drizzle-orm';
import { db, schema } from '@goldspire/db';

const { studioDeal, studioDealPaymentLine } = schema;

const TITLES = ['Walkthrough — Heartline clone', 'Walkthrough — Medium template build'];
const CLIENTS = ['Walkthrough Clone Co', 'Walkthrough Medium Co'];

async function main() {
  const rows = await db
    .select({ id: studioDeal.id, title: studioDeal.title, clientName: studioDeal.clientName })
    .from(studioDeal)
    .where(or(inArray(studioDeal.title, TITLES), inArray(studioDeal.clientName, CLIENTS)));

  if (rows.length === 0) {
    console.log('No walkthrough deals to remove.');
    return;
  }

  console.log(`Removing ${rows.length} walkthrough deal(s)…`);
  for (const row of rows) {
    console.log(`  · ${row.title} (${row.clientName})`);
    await db.delete(studioDealPaymentLine).where(eq(studioDealPaymentLine.dealId, row.id));
    await db.delete(studioDeal).where(eq(studioDeal.id, row.id));
  }

  console.log('Done.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
