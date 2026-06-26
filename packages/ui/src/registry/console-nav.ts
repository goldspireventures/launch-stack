import type { NavRegistry } from './nav';

/**
 * Studio Console navigation (simplified).
 *
 * - Icon rail — 4 daily destinations + More (Reports/Settings moved to overflow)
 * - Desk — "G" home
 * - Cmd+K — full tree via `consoleNav`
 */
export const consoleNavPrimary = [
  { label: 'Enquiries', href: '/leads', icon: 'inbox' },
  { label: 'Deals', href: '/deals', icon: 'handshake' },
  { label: 'Clone factory', href: '/factory', icon: 'sparkles' },
  { label: 'Tenants', href: '/tenants', icon: 'building-2' },
] as const;

export const consoleNavMore = [
  {
    label: 'Insight',
    items: [
      { label: 'Reports', href: '/reports', icon: 'bar-chart-3' },
      { label: 'Lab', href: '/lab', icon: 'flask-conical' },
      { label: 'Apps & deploys', href: '/apps', icon: 'rocket' },
      { label: 'Commercial', href: '/commercial', icon: 'credit-card' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Catalog hub', href: '/catalog', icon: 'layout-template' },
      { label: 'Templates', href: '/catalog/templates', icon: 'layout-template' },
      { label: 'Offerings', href: '/catalog/offerings', icon: 'credit-card' },
      { label: 'Feature flags', href: '/catalog/feature-flags', icon: 'flag' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { label: 'Reference hub', href: '/reference', icon: 'book-open' },
      { label: 'Playbooks', href: '/playbooks', icon: 'book-open' },
      { label: 'Delivery guide', href: '/delivery', icon: 'map' },
      { label: 'Blueprints', href: '/blueprints', icon: 'layers' },
      { label: 'Stamp tenant', href: '/onboard', icon: 'sparkles' },
      { label: 'Documentation', href: '/docs', icon: 'book-open' },
      { label: 'Audit', href: '/audit', icon: 'history' },
    ],
  },
  {
    label: 'Account',
    items: [{ label: 'Settings', href: '/settings', icon: 'settings' }],
  },
] as const satisfies NavRegistry;

/** Legacy flat registry — command palette grouping. */
export const consoleNav = [
  {
    label: 'Today',
    items: [
      { label: 'Desk', href: '/', icon: 'layout-dashboard' },
      ...consoleNavPrimary.slice(0, 2),
    ],
  },
  {
    label: 'Build',
    items: [...consoleNavPrimary.slice(2)],
  },
  {
    label: 'Insight',
    items: [...consoleNavMore[0].items],
  },
  {
    label: 'Catalog',
    items: [...consoleNavMore[1].items],
  },
  {
    label: 'Reference',
    items: [...consoleNavMore[2].items, ...consoleNavMore[3].items.filter((i) => i.href !== '/settings')],
  },
  {
    label: 'Account',
    items: consoleNavMore[3].items,
  },
] as const satisfies NavRegistry;
