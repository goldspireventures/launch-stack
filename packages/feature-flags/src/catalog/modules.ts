import type { ModuleFlagDefinition } from './types';

export const MODULE_FLAGS = [
  {
    key: 'module.studio_deals',
    kind: 'module',
    description: 'Goldspire Studio deal desk — commercial planning and milestones.',
    scope: 'global',
    defaultEnabled: false,
    tags: [] as string[],
    studioOnly: true,
    lifecycle: 'stable',
  },
  {
    key: 'module.live_video',
    kind: 'module',
    description: 'Live video dates and real-time calling surfaces.',
    scope: 'tenant',
    defaultEnabled: false,
    tags: [] as string[],
    studioOnly: false,
    lifecycle: 'experimental',
  },
  {
    key: 'module.referrals',
    kind: 'module',
    description: 'Referral invites, rewards, and growth loops.',
    scope: 'tenant',
    defaultEnabled: false,
    tags: [] as string[],
    studioOnly: false,
    lifecycle: 'stable',
  },
  {
    key: 'module.crm_export',
    kind: 'module',
    description: 'CRM-friendly exports and outbound sync connectors.',
    scope: 'tenant',
    defaultEnabled: false,
    tags: [] as string[],
    studioOnly: false,
    lifecycle: 'stable',
  },
  {
    key: 'module.ai_features',
    kind: 'module',
    description: 'Aggregate gate for AI-powered product experiences.',
    scope: 'tenant',
    defaultEnabled: false,
    tags: ['ai'],
    studioOnly: false,
    lifecycle: 'stable',
  },
] as const satisfies readonly ModuleFlagDefinition[];

export type ModuleFlagKey = (typeof MODULE_FLAGS)[number]['key'];
