/**
 * Human-readable Console page titles for chrome breadcrumbs and accessibility.
 * Keep in sync with `consoleNav` in `@goldspire/ui`.
 */

const EXACT: Record<string, string> = {
  '/': 'Desk',
  '/pipeline': 'Pipeline',
  '/build': 'Build',
  '/configure': 'Configure',
  '/insight': 'Insight',
  '/leads': 'Enquiries',
  '/deals': 'Deals',
  '/deals/new': 'New deal',
  '/factory': 'Clone factory',
  '/tenants': 'Tenants',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/lab': 'Lab',
  '/lab/compare': 'Lab compare',
  '/apps': 'Apps & deploys',
  '/commercial': 'Commercial',
  '/catalog': 'Catalog',
  '/reference': 'Reference',
  '/catalog/templates': 'Templates',
  '/catalog/feature-flags': 'Feature flags',
  '/blueprints': 'Blueprints',
  '/delivery': 'Delivery guide',
  '/playbooks': 'Playbooks',
  '/onboard': 'Stamp tenant',
  '/docs': 'Documentation',
  '/audit': 'Audit log',
  '/plans': 'Plans',
  '/analytics': 'Analytics',
};

const PREFIX: { prefix: string; label: string }[] = [
  { prefix: '/engagements/', label: 'Engagement' },
  { prefix: '/deals/', label: 'Deal' },
  { prefix: '/tenants/', label: 'Tenant' },
  { prefix: '/docs/view', label: 'Document' },
];

/** Resolve a short label for the current Console pathname. */
export function consolePageLabel(pathname: string | null | undefined): string {
  if (!pathname) return 'Desk';
  const path = pathname.split('?')[0] ?? '/';
  const exact = EXACT[path];
  if (exact) return exact;
  for (const { prefix, label } of PREFIX) {
    if (path.startsWith(prefix) && path.length > prefix.length) return label;
  }
  const segment = path.split('/').filter(Boolean).pop();
  if (!segment) return 'Desk';
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
