import {
  BarChart3,
  CreditCard,
  Flag,
  Handshake,
  History,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type { NavRegistry } from './nav';

/**
 * Deal desk is studio-internal. Includes STUDIO_STAFF (used in DB) and STUDIO_DEVELOPER
 * (reserved for future role alignment / Workstream C catalog).
 */
export const adminNav = [
  {
    label: '',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Users', href: '/users', icon: Users },
      { label: 'Products', href: '/products', icon: Package },
      { label: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
    ],
  },
  {
    label: 'Studio',
    items: [
      {
        label: 'Deal desk',
        href: '/studio/deals',
        icon: Handshake,
        roles: ['STUDIO_OWNER', 'STUDIO_DEVELOPER', 'STUDIO_STAFF'],
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Feature Flags', href: '/feature-flags', icon: Flag },
      { label: 'Reports', href: '/reports', icon: ShieldAlert },
      { label: 'Messages', href: '/messages', icon: MessageSquare },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Audit log', href: '/audit', icon: History },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', href: '/settings', icon: Settings }],
  },
] as const satisfies NavRegistry;
