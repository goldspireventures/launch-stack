import {
  CATALOG_DEMO_APPS,
  getCatalogDemoForTemplate,
  resolveCatalogDemoUrl,
  type CatalogDemoAppId,
} from '@goldspire/config/catalog-demo-urls';
import {
  buildSalesDemoPortalUrl,
  DATING_TEMPLATE_ID,
  resolveHeartlineDemoUrl,
} from '@goldspire/config/studio-sales-demo';

export { DATING_TEMPLATE_ID, CATALOG_DEMO_APPS };

export function heartlineDemoUrl(): string {
  return resolveCatalogDemoUrl('heartline', process.env);
}

export function novaCareDemoUrl(): string {
  return resolveCatalogDemoUrl('nova_care', process.env);
}

export function catalogDemoUrl(appId: CatalogDemoAppId): string {
  return resolveCatalogDemoUrl(appId, process.env);
}

export function demoUrlForTemplate(templateId: string): string | null {
  const app = getCatalogDemoForTemplate(templateId);
  if (!app) return null;
  return resolveCatalogDemoUrl(app.id, process.env);
}

export function salesDemoPortalUrl(): string {
  const origin =
    process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL?.replace(/\/$/, '') ?? 'http://localhost:4005';
  return buildSalesDemoPortalUrl(origin);
}

export function discoveryCallUrl(): string | null {
  const v = process.env.NEXT_PUBLIC_GOLDSPIRE_DISCOVERY_CALL_URL?.trim();
  return v && v.length > 0 ? v : null;
}

export function isDatingTemplate(templateId: string): boolean {
  return templateId === DATING_TEMPLATE_ID || templateId.includes('dating');
}

/** @deprecated use heartlineDemoUrl */
export { resolveHeartlineDemoUrl };
