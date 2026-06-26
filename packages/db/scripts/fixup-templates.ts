/* eslint-disable no-console */
/**
 * Tag existing tenants with their canonical product template.
 *
 * Sprint 0 introduces the product-template layer between blueprints and
 * tenants. Existing demo tenants pre-date that concept — their metadata
 * carries `blueprint: 'social_matching'` but no `productTemplate`. This
 * script back-fills that field so the Console catalog page can show real
 * stamped-tenant counts ("Dating · 1 tenant live") on day one.
 *
 * Idempotent and non-destructive: only sets `productTemplate` when the
 * existing metadata doesn't already declare one. Existing keys (`tagline`,
 * `stampedAt`, etc.) are preserved.
 *
 * Run with:
 *   pnpm --filter @goldspire/db fixup:templates
 */
import './_load-env';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { getMigrationDatabaseUrl } from '@goldspire/config/env';
import { listTemplates, type ProductTemplate } from '@goldspire/blueprints';
import * as schema from '../src/schema/index.js';

const conn = postgres(getMigrationDatabaseUrl(), { max: 1, prepare: false });
const db = drizzle(conn, { schema, casing: 'snake_case' });

/**
 * Tenants we know about ahead of time and want to pin to specific templates.
 * Anything not listed here falls through to the per-blueprint default
 * (the canonical shipped template for that blueprint, if one exists).
 */
const EXPLICIT_PINS: Record<string, string> = {
  heartline: 'social_matching/dating',
};

function findDefaultTemplate(blueprint: string, templates: readonly ProductTemplate[]): ProductTemplate | null {
  const matches = templates.filter((t) => t.blueprint === blueprint);
  return matches.find((t) => t.status === 'shipped') ?? matches[0] ?? null;
}

async function main() {
  console.log('[fixup-templates] starting');
  const templates = listTemplates();
  console.log(`[fixup-templates] ${templates.length} templates in registry`);

  const tenants = await db
    .select({
      id: schema.tenant.id,
      name: schema.tenant.name,
      slug: schema.tenant.slug,
      metadata: schema.tenant.metadata,
    })
    .from(schema.tenant);

  let updated = 0;
  let skipped = 0;

  for (const t of tenants) {
    const meta = (t.metadata ?? {}) as Record<string, unknown>;
    if (typeof meta.productTemplate === 'string' && meta.productTemplate.length > 0) {
      console.log(`[fixup-templates] ${t.slug}: already tagged → ${meta.productTemplate}`);
      skipped += 1;
      continue;
    }

    const explicit = EXPLICIT_PINS[t.slug];
    const blueprint = typeof meta.blueprint === 'string' ? meta.blueprint : null;
    let templateId: string | null = null;

    if (explicit) {
      const found = templates.find((tpl) => tpl.id === explicit);
      if (!found) {
        console.warn(`[fixup-templates] ${t.slug}: pinned template ${explicit} not in registry, falling back`);
      } else {
        templateId = found.id;
      }
    }

    if (!templateId && blueprint) {
      const fallback = findDefaultTemplate(blueprint, templates);
      if (fallback && fallback.status === 'shipped') {
        templateId = fallback.id;
      }
    }

    if (!templateId) {
      console.log(`[fixup-templates] ${t.slug}: no shipped template for blueprint=${blueprint ?? 'n/a'}, leaving untagged`);
      skipped += 1;
      continue;
    }

    const nextMeta = { ...meta, productTemplate: templateId };
    await db
      .update(schema.tenant)
      .set({ metadata: nextMeta })
      .where(eq(schema.tenant.id, t.id));
    console.log(`[fixup-templates] ${t.slug}: tagged → ${templateId}`);
    updated += 1;
  }

  console.log(`[fixup-templates] done · updated=${updated} skipped=${skipped}`);
  await conn.end();
}

main().catch((err) => {
  console.error('[fixup-templates] failed', err);
  process.exit(1);
});
