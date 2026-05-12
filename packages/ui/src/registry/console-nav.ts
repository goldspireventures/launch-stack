import type { NavRegistry } from './nav';

/**
 * Studio Console sidebar. Icons are string keys (lucide-react names) so the
 * registry survives the RSC server→client serialization boundary.
 *
 * `/team` and `/settings` were removed — those routes do not exist under
 * apps/console (dead nav). Re-add here once pages ship.
 */
export const consoleNav = [
  {
    label: '',
    items: [
      { label: 'Overview', href: '/', icon: 'layout-dashboard' },
      { label: 'Apps', href: '/apps', icon: 'rocket' },
      { label: 'Tenants', href: '/tenants', icon: 'building-2' },
      { label: 'Blueprints', href: '/blueprints', icon: 'layers' },
      { label: 'Audit log', href: '/audit', icon: 'history' },
    ],
  },
] as const satisfies NavRegistry;
