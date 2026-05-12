import { Building2, History, Layers, LayoutDashboard, Rocket } from 'lucide-react';
import type { NavRegistry } from './nav';

/**
 * Studio Console sidebar. `/team` and `/settings` were removed — those routes
 * do not exist under apps/console (dead nav). Re-add here once pages ship.
 */
export const consoleNav = [
  {
    label: '',
    items: [
      { label: 'Overview', href: '/', icon: LayoutDashboard },
      { label: 'Apps', href: '/apps', icon: Rocket },
      { label: 'Tenants', href: '/tenants', icon: Building2 },
      { label: 'Blueprints', href: '/blueprints', icon: Layers },
      { label: 'Audit log', href: '/audit', icon: History },
    ],
  },
] as const satisfies NavRegistry;
