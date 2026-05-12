import type { NavRegistry } from './nav';

/**
 * Studio Console sidebar — cross-tenant studio surface.
 *
 * Everything here ignores any per-tenant context: it lists, compares, or
 * operates across the whole portfolio. Tenant-scoped operations live in the
 * Admin app (`apps/admin`) under Model A of the split.
 *
 * Icons are string keys (lucide-react names) so the registry survives the
 * RSC server→client serialization boundary.
 */
export const consoleNav = [
  {
    label: '',
    items: [
      { label: 'Overview', href: '/', icon: 'layout-dashboard' },
      { label: 'Stamp tenant', href: '/onboard', icon: 'sparkles' },
      { label: 'Apps', href: '/apps', icon: 'rocket' },
      { label: 'Tenants', href: '/tenants', icon: 'building-2' },
      { label: 'Blueprints', href: '/blueprints', icon: 'layers' },
    ],
  },
  {
    label: 'Studio',
    items: [
      { label: 'Deals', href: '/deals', icon: 'handshake' },
      { label: 'Plans', href: '/plans', icon: 'package' },
      { label: 'Reports', href: '/reports', icon: 'bar-chart-3' },
      { label: 'Analytics', href: '/analytics', icon: 'line-chart' },
      { label: 'Catalog', href: '/catalog/feature-flags', icon: 'flag' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Audit', href: '/audit', icon: 'history' },
      { label: 'Settings', href: '/settings', icon: 'settings' },
    ],
  },
] as const satisfies NavRegistry;
