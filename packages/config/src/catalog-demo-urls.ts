/**
 * Public catalog demo URLs — one env var per reference app.
 * Safe for client bundles (marketing site, contact success).
 */

export type CatalogDemoAppId =
  | 'heartline'
  | 'nova_care'
  | 'bazaar'
  | 'signal'
  | 'lumen'
  | 'relay_workspace';

export type CatalogDemoAppDefinition = {
  id: CatalogDemoAppId;
  templateId: string;
  label: string;
  envKey: string;
  defaultLocalUrl: string;
  /** Short blurb for marketing / template detail. */
  tagline: string;
};

export const CATALOG_DEMO_APPS: readonly CatalogDemoAppDefinition[] = [
  {
    id: 'heartline',
    templateId: 'social_matching/dating',
    label: 'Heartline',
    envKey: 'NEXT_PUBLIC_HEARTLINE_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4000',
    tagline: 'Dating — discover, match, chat',
  },
  {
    id: 'nova_care',
    templateId: 'multi_staff_booking/clinic',
    label: 'Nova Care',
    envKey: 'NEXT_PUBLIC_NOVA_CARE_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4015',
    tagline: 'Clinic & salon booking',
  },
  {
    id: 'bazaar',
    templateId: 'marketplace/local_listings',
    label: 'Bazaar',
    envKey: 'NEXT_PUBLIC_BAZAAR_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4011',
    tagline: 'Local marketplace listings',
  },
  {
    id: 'signal',
    templateId: 'community/membership_hub',
    label: 'Signal',
    envKey: 'NEXT_PUBLIC_SIGNAL_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4012',
    tagline: 'Membership community',
  },
  {
    id: 'lumen',
    templateId: 'vertical_ai_agent/studio_assistant',
    label: 'Lumen',
    envKey: 'NEXT_PUBLIC_LUMEN_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4013',
    tagline: 'Vertical AI assistant',
  },
  {
    id: 'relay_workspace',
    templateId: 'b2b_saas_shell/control_plane',
    label: 'Relay',
    envKey: 'NEXT_PUBLIC_RELAY_DEMO_URL',
    defaultLocalUrl: 'http://localhost:4014',
    tagline: 'B2B workspace control plane',
  },
] as const;

export function resolveCatalogDemoUrl(
  appId: CatalogDemoAppId,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string | null {
  const def = CATALOG_DEMO_APPS.find((a) => a.id === appId);
  if (!def) throw new Error(`Unknown catalog demo app: ${appId}`);
  const explicit =
    env[def.envKey]?.trim() ||
    (def.id === 'relay_workspace' ? env.NEXT_PUBLIC_ACME_DEMO_URL?.trim() : undefined);
  if (explicit && explicit.length > 0) return explicit.replace(/\/$/, '');
  if (env.NODE_ENV === 'production') return null;
  return def.defaultLocalUrl;
}

export function getCatalogDemoForTemplate(templateId: string): CatalogDemoAppDefinition | null {
  return CATALOG_DEMO_APPS.find((a) => a.templateId === templateId) ?? null;
}

export function listCatalogDemoUrls(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): { app: CatalogDemoAppDefinition; url: string }[] {
  return CATALOG_DEMO_APPS.flatMap((app) => {
    const url = resolveCatalogDemoUrl(app.id, env);
    return url ? [{ app, url }] : [];
  });
}
