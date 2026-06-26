import { ENTITLEMENT_KEYS } from '@goldspire/config';
import type { BlueprintDefinition } from './types';

export const b2bSaasShellBlueprint: BlueprintDefinition = {
  kind: 'b2b_saas_shell',
  name: 'B2B SaaS Shell',
  tagline: 'Workspaces, seats, roles, billing — the boring foundation behind every "build me a SaaS".',
  description:
    'The generic B2B SaaS substrate: workspace creation, seat-based billing, invitations, roles, audit log, API keys. Use this as the base for any "we need a SaaS" client engagement, then layer the vertical-specific UX on top.',
  maturity: 'beta',
  accent: '#0EA5E9',
  referenceAppFolder: 'b2b-saas-web',
  defaultTenantSlug: 'acme',
  defaultPort: 3014,
  localDevCommand: 'pnpm --filter @goldspire/b2b-saas-web dev',
  demoUrl: 'http://localhost:4014',
  badgeAccent: '#0EA5E9',
  badgeLabel: 'B2B SaaS',
  industryAliases: ['saas', 'b2b', 'software', 'enterprise'],
  defaultSlugPrefix: 'app',
  entitlementKeys: [
    ENTITLEMENT_KEYS.B2B_UNLIMITED_SEATS,
    ENTITLEMENT_KEYS.B2B_SSO,
    ENTITLEMENT_KEYS.B2B_AUDIT_LOG_EXPORT,
    ENTITLEMENT_KEYS.B2B_API_ACCESS,
  ],
  prototypePriceCents: 6_000_00,
  retainerPriceCents: 2_000_00,
  estimatedWeeks: { min: 2, max: 4 },
  nav: [
    { label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard' },
    { label: 'Members', href: '/members', icon: 'users' },
    { label: 'Billing', href: '/billing', icon: 'credit-card' },
    { label: 'API Keys', href: '/api-keys', icon: 'key' },
    { label: 'Settings', href: '/settings', icon: 'settings' },
  ],
  aiSurface: [
    {
      feature: 'Workspace insights',
      description: 'Weekly AI-generated summary of workspace activity for the workspace owner.',
      defaultEnabled: false,
      flagKey: 'ai.b2b_insights',
    },
  ],
  clientNotes: [
    'Most "MVP" requests are this shell + 1–2 custom pages. Quote accordingly.',
    'SSO is a paywall feature 9/10 times. Default to gating it behind enterprise.',
  ],
};
