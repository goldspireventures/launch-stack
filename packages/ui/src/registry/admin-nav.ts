import type { NavRegistry } from './nav';

/**
 * Admin sidebar. Icons are string keys (lucide-react names) so the registry
 * survives the RSC server→client serialization boundary.
 *
 * Deal desk is studio-internal. Includes STUDIO_STAFF (used in DB) and
 * STUDIO_DEVELOPER (reserved for future role alignment / Workstream C catalog).
 */
export const adminNav = [
  {
    label: '',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard' },
      { label: 'Users', href: '/users', icon: 'users' },
      { label: 'Products', href: '/products', icon: 'package' },
      { label: 'Subscriptions', href: '/subscriptions', icon: 'credit-card' },
    ],
  },
  {
    label: 'Studio',
    items: [
      {
        label: 'Deal desk',
        href: '/studio/deals',
        icon: 'handshake',
        roles: ['STUDIO_OWNER', 'STUDIO_DEVELOPER', 'STUDIO_STAFF'],
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Feature Flags', href: '/feature-flags', icon: 'flag' },
      { label: 'Reports', href: '/reports', icon: 'shield-alert' },
      { label: 'Messages', href: '/messages', icon: 'message-square' },
      { label: 'Analytics', href: '/analytics', icon: 'bar-chart-3' },
      { label: 'Audit log', href: '/audit', icon: 'history' },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', href: '/settings', icon: 'settings' }],
  },
] as const satisfies NavRegistry;
