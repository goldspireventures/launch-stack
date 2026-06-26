import type { AtlasCapability, StudioConsoleCapability } from './capabilities';

/** All capability keys for admin UIs (access policy overrides). */
export const PLATFORM_CAPABILITY_KEYS = [
  'enquiries.triage',
  'enquiries.convert',
  'deals.manage',
  'commercial.edit',
  'billing.read',
  'settings.profile',
  'settings.team',
  'settings.routing',
  'tenants.manage',
  'atlas.query',
  'atlas.reindex',
  'atlas.live_ops',
  'atlas.export',
] as const satisfies readonly (StudioConsoleCapability | AtlasCapability)[];
