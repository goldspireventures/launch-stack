import { CATALOG_DEMO_APPS, type CatalogDemoAppId } from '@goldspire/config/catalog-demo-urls';
import type { TemplateId } from './templates/types';

/**
 * Studio golden paths — what we show prospects and what operators smoke-test before go-live.
 * `tier1Clone` = fixed-price Identity + Configuration without change order.
 * `catalogLive` = sales-ready reference demo (beta template or shipped).
 */
export type GoldenPathTier = 'tier1_clone' | 'catalog_live' | 'roadmap';

export type GoldenPathDefinition = {
  id: string;
  templateId: TemplateId;
  marketingName: string;
  demoAppId: CatalogDemoAppId;
  tier: GoldenPathTier;
  referenceTenantSlug: string;
  referenceAppFolder: string;
  /** Routes operators click through in smoke tests. */
  smokeRoutes: readonly string[];
  /** Console onboard deep-link blueprint + template query params. */
  onboardQuery: string;
};

export const GOLDEN_PATHS: readonly GoldenPathDefinition[] = [
  {
    id: 'dating',
    templateId: 'social_matching/dating',
    marketingName: 'Heartline · Dating',
    demoAppId: 'heartline',
    tier: 'tier1_clone',
    referenceTenantSlug: 'heartline',
    referenceAppFolder: 'dating-web',
    smokeRoutes: ['/', '/discover', '/matches', '/premium'],
    onboardQuery: 'blueprint=social_matching&template=social_matching/dating',
  },
  {
    id: 'clinic_booking',
    templateId: 'multi_staff_booking/clinic',
    marketingName: 'Nova Care · Booking',
    demoAppId: 'nova_care',
    tier: 'tier1_clone',
    referenceTenantSlug: 'nova-care',
    referenceAppFolder: 'booking-web',
    smokeRoutes: ['/', '/services', '/book'],
    onboardQuery: 'blueprint=multi_staff_booking&template=multi_staff_booking/clinic',
  },
  {
    id: 'marketplace',
    templateId: 'marketplace/local_listings',
    marketingName: 'Bazaar · Marketplace',
    demoAppId: 'bazaar',
    tier: 'catalog_live',
    referenceTenantSlug: 'bazaar',
    referenceAppFolder: 'marketplace-web',
    smokeRoutes: ['/', '/shop', '/sell'],
    onboardQuery: 'blueprint=marketplace&template=marketplace/local_listings',
  },
  {
    id: 'community',
    templateId: 'community/membership_hub',
    marketingName: 'Signal · Community',
    demoAppId: 'signal',
    tier: 'catalog_live',
    referenceTenantSlug: 'pulse-club',
    referenceAppFolder: 'community-web',
    smokeRoutes: ['/', '/spaces', '/feed'],
    onboardQuery: 'blueprint=community&template=community/membership_hub',
  },
  {
    id: 'ai_agent',
    templateId: 'vertical_ai_agent/studio_assistant',
    marketingName: 'Lumen · AI agent',
    demoAppId: 'lumen',
    tier: 'catalog_live',
    referenceTenantSlug: 'goldspire',
    referenceAppFolder: 'ai-agent-web',
    smokeRoutes: ['/', '/chat'],
    onboardQuery: 'blueprint=vertical_ai_agent&template=vertical_ai_agent/studio_assistant',
  },
  {
    id: 'b2b_saas',
    templateId: 'b2b_saas_shell/control_plane',
    marketingName: 'Acme · B2B workspace',
    demoAppId: 'acme_workspace',
    tier: 'catalog_live',
    referenceTenantSlug: 'goldspire',
    referenceAppFolder: 'b2b-saas-web',
    smokeRoutes: ['/', '/dashboard'],
    onboardQuery: 'blueprint=b2b_saas_shell&template=b2b_saas_shell/control_plane',
  },
] as const;

/** Studio surfaces every production deploy should include. */
export const STUDIO_SURFACE_PATHS = {
  marketing: { app: 'goldspire-web', port: 3010, smokeRoutes: ['/', '/templates', '/pricing', '/contact'] as const },
  console: { app: 'console', port: 3001, smokeRoutes: ['/deals', '/docs', '/delivery'] as const },
  clientPortal: { app: 'client-portal', port: 3005, smokeRoutes: ['/'] as const },
  admin: { app: 'admin', port: 3002, smokeRoutes: ['/'] as const },
} as const;

export function getGoldenPathForTemplate(templateId: string): GoldenPathDefinition | null {
  return GOLDEN_PATHS.find((p) => p.templateId === templateId) ?? null;
}

export function listTier1GoldenPaths(): GoldenPathDefinition[] {
  return GOLDEN_PATHS.filter((p) => p.tier === 'tier1_clone');
}

export function listCatalogLiveGoldenPaths(): GoldenPathDefinition[] {
  return GOLDEN_PATHS.filter((p) => p.tier === 'tier1_clone' || p.tier === 'catalog_live');
}

/** Re-export demo app metadata for marketing components. */
export { CATALOG_DEMO_APPS };
