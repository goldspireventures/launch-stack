#!/usr/bin/env tsx
/** Patch production user + studio profile emails from @goldspire.studio → @goldspire.dev */
import { eq, like, sql } from 'drizzle-orm';
import { db, schema } from '@goldspire/db';

const { user, tenant } = schema;

async function main() {
  const legacy = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(like(user.email, '%@goldspire.studio'));

  if (legacy.length > 0) {
    console.log(`Updating ${legacy.length} user row(s)…`);
    for (const row of legacy) {
      const next = row.email.replace('@goldspire.studio', '@goldspire.dev');
      console.log(`  · ${row.email} → ${next}`);
      await db.update(user).set({ email: next, updatedAt: new Date() }).where(eq(user.id, row.id));
    }
  } else {
    console.log('No @goldspire.studio user rows found.');
  }

  const [studio] = await db.select().from(tenant).where(eq(tenant.slug, 'goldspire')).limit(1);
  if (studio?.metadata && typeof studio.metadata === 'object') {
    const meta = { ...(studio.metadata as Record<string, unknown>) };
    const profile =
      meta.studioProfile && typeof meta.studioProfile === 'object'
        ? { ...(meta.studioProfile as Record<string, unknown>) }
        : null;
    if (profile) {
      let changed = false;
      for (const key of ['primaryContactEmail', 'supportEmail'] as const) {
        const v = profile[key];
        if (typeof v === 'string' && v.includes('@goldspire.studio')) {
          profile[key] = v.replace('@goldspire.studio', '@goldspire.dev').replace('ops@', 'hello@');
          changed = true;
        }
      }
      if (changed) {
        meta.studioProfile = profile;
        await db
          .update(tenant)
          .set({ metadata: meta, updatedAt: new Date() })
          .where(eq(tenant.id, studio.id));
        console.log('Updated goldspire tenant studioProfile emails.');
      }
    }
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.email, 'eamon@goldspire.dev'));
  console.log(`Studio owner rows for eamon@goldspire.dev: ${count}`);
  console.log('Done.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
