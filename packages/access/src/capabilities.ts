/**
 * Capability keys — the atomic permissions granted to roles.
 * Apps map routes and API procedures to these keys; policies reference them.
 */

/** Studio Console operator capabilities (Deal desk, settings, etc.). */
export type StudioConsoleCapability =
  | 'enquiries.triage'
  | 'enquiries.convert'
  | 'deals.manage'
  | 'commercial.edit'
  | 'billing.read'
  | 'settings.profile'
  | 'settings.team'
  | 'settings.routing'
  | 'tenants.manage'
  | 'lab.manage';

/** Goldspire Atlas knowledge portal capabilities. */
export type AtlasCapability =
  | 'atlas.query'
  | 'atlas.reindex'
  | 'atlas.live_ops'
  | 'atlas.export';

export type PlatformCapability = StudioConsoleCapability | AtlasCapability;

export const STUDIO_CONSOLE_CAPABILITIES: Record<
  'STUDIO_OWNER' | 'STUDIO_STAFF',
  readonly StudioConsoleCapability[]
> = {
  STUDIO_OWNER: [
    'enquiries.triage',
    'enquiries.convert',
    'deals.manage',
    'commercial.edit',
    'billing.read',
    'settings.profile',
    'settings.team',
    'settings.routing',
    'tenants.manage',
    'lab.manage',
  ],
  STUDIO_STAFF: [
    'enquiries.triage',
    'enquiries.convert',
    'deals.manage',
    'settings.profile',
  ],
};

export const ATLAS_CAPABILITIES: Record<
  'STUDIO_OWNER' | 'STUDIO_STAFF' | 'TENANT_OWNER' | 'TENANT_ADMIN',
  readonly AtlasCapability[]
> = {
  STUDIO_OWNER: ['atlas.query', 'atlas.reindex', 'atlas.live_ops', 'atlas.export'],
  STUDIO_STAFF: ['atlas.query', 'atlas.live_ops'],
  TENANT_OWNER: ['atlas.query'],
  TENANT_ADMIN: ['atlas.query'],
};
