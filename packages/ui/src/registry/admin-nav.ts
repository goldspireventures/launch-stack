import type { NavRegistry } from './nav';

/**
 * Admin sidebar — purely tenant-scoped.
 *
 * Studio-only surfaces (Deal Desk, cross-tenant audit, catalog management,
 * etc.) live in the Console (`apps/console`) under Model A of the split.
 * Anything in here MUST make sense viewed through the lens of one tenant.
 *
 * Icons are string keys (lucide-react names) so the registry survives the
 * RSC server→client serialization boundary.
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
    label: 'Operations',
    items: [
      { label: 'Feature Flags', href: '/feature-flags', icon: 'flag' },
      { label: 'Reports', href: '/reports', icon: 'shield-alert' },
      { label: 'Messages', href: '/messages', icon: 'message-square' },
      { label: 'Analytics', href: '/analytics', icon: 'bar-chart-3' },
      { label: 'Audit log', href: '/audit', icon: 'history' },
      { label: 'Notifications', href: '/notifications', icon: 'bell' },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', href: '/settings', icon: 'settings' }],
  },
] as const satisfies NavRegistry;
