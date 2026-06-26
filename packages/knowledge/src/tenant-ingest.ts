import fs from 'node:fs/promises';
import path from 'node:path';
import * as schema from '@goldspire/db/schema';
import type { Database } from '@goldspire/db';
import { findMonorepoRoot } from './repo-root';

const APP_CONFIG_CANDIDATES = [
  { appDir: 'dating-web', configPath: 'src/app.config.ts' },
  { appDir: 'booking-web', configPath: 'src/app.config.ts' },
  { appDir: 'marketplace-web', configPath: 'src/app.config.ts' },
  { appDir: 'community-web', configPath: 'src/app.config.ts' },
  { appDir: 'ai-agent-web', configPath: 'src/app.config.ts' },
  { appDir: 'b2b-saas-web', configPath: 'src/app.config.ts' },
] as const;

export interface TenantProductSource {
  corpusId: 'tenant.product';
  sourceType: 'tenant_product';
  sourcePath: string;
  title: string;
  summary: string | null;
  content: string;
  tenantId: string;
}

function extractSlugFromConfig(content: string, key: string): string | null {
  const m = content.match(new RegExp(`${key}:\\s*['"]([^'"]+)['"]`));
  return m?.[1] ?? null;
}

export async function collectTenantProductSources(db: Database): Promise<TenantProductSource[]> {
  const root = findMonorepoRoot();
  const tenants = await db
    .select({ id: schema.tenant.id, slug: schema.tenant.slug, name: schema.tenant.name })
    .from(schema.tenant);

  const products = await db
    .select({
      id: schema.product.id,
      tenantId: schema.product.tenantId,
      slug: schema.product.slug,
      name: schema.product.name,
      blueprint: schema.product.blueprint,
    })
    .from(schema.product);

  const byTenant = new Map(tenants.map((t) => [t.slug, t]));
  const sources: TenantProductSource[] = [];

  for (const product of products) {
    const tenant = tenants.find((t) => t.id === product.tenantId);
    if (!tenant) continue;
    const lines = [
      `# ${product.name}`,
      '',
      `**Tenant:** ${tenant.name} (\`${tenant.slug}\`)`,
      `**Product slug:** \`${product.slug}\``,
      product.blueprint ? `**Blueprint:** ${product.blueprint}` : '',
    ].filter(Boolean);
    sources.push({
      corpusId: 'tenant.product',
      sourceType: 'tenant_product',
      sourcePath: `tenant/${tenant.slug}/product/${product.slug}`,
      title: `${tenant.name} · ${product.name}`,
      summary: `Product record for ${tenant.slug}/${product.slug}`,
      content: lines.join('\n'),
      tenantId: tenant.id,
    });
  }

  for (const { appDir, configPath } of APP_CONFIG_CANDIDATES) {
    const rel = `apps/${appDir}/${configPath}`;
    const abs = path.join(root, rel);
    let content: string;
    try {
      content = await fs.readFile(abs, 'utf8');
    } catch {
      continue;
    }
    const tenantSlug = extractSlugFromConfig(content, 'tenantSlug');
    const productSlug = extractSlugFromConfig(content, 'productSlug');
    const brandName = extractSlugFromConfig(content, 'name') ?? appDir;
    const tenant = tenantSlug ? byTenant.get(tenantSlug) : undefined;
    if (!tenant) continue;

    sources.push({
      corpusId: 'tenant.product',
      sourceType: 'tenant_product',
      sourcePath: rel,
      title: `${tenant.name} · ${brandName} app config`,
      summary: `White-label config in ${appDir}`,
      content: `# ${brandName} (${appDir})\n\n\`\`\`typescript\n${content.slice(0, 12_000)}\n\`\`\``,
      tenantId: tenant.id,
    });
  }

  const flags = await db
    .select({
      tenantId: schema.featureFlag.tenantId,
      key: schema.featureFlag.key,
      enabled: schema.featureFlag.enabled,
    })
    .from(schema.featureFlag)
    .limit(200);

  const flagsByTenant = new Map<string, typeof flags>();
  for (const f of flags) {
    if (!f.tenantId) continue;
    const list = flagsByTenant.get(f.tenantId) ?? [];
    list.push(f);
    flagsByTenant.set(f.tenantId, list);
  }

  for (const [tid, tflags] of flagsByTenant) {
    const tenant = tenants.find((t) => t.id === tid);
    if (!tenant || tflags.length === 0) continue;
    sources.push({
      corpusId: 'tenant.product',
      sourceType: 'tenant_product',
      sourcePath: `tenant/${tenant.slug}/feature-flags`,
      title: `${tenant.name} · Feature flags`,
      summary: 'Enabled modules and flags for this tenant',
      content: [
        `# Feature flags · ${tenant.name}`,
        '',
        ...tflags.map((f) => `- \`${f.key}\`: ${f.enabled ? 'on' : 'off'}`),
      ].join('\n'),
      tenantId: tenant.id,
    });
  }

  return sources;
}
