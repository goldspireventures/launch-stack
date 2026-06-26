/**
 * Studio Console — information architecture.
 *
 * Mental model:
 * - **Work** — enquiries → deals (client revenue pipeline)
 * - **Build** — factory + tenants (delivery capacity)
 * - **Insight** — reports, lab, apps
 * - **Catalog** — templates, pricing, flags (sell configuration)
 * - **Reference** — playbooks, delivery guide, docs (how we operate)
 */

/** Desk page density contract. */
export const CONSOLE_DESK_POLICY = {
  maxInlineMetricCards: 0,
  useTelemetryStrip: true,
  businessPulseOnDesk: 'collapsed' as const,
  businessPulseFullPage: '/reports',
  actionQueueMaxItems: 8,
  recentActivityMaxItems: 5,
} as const;

/** Icon rail destinations (Desk = "G" home, not listed). */
export const CONSOLE_NAV_PRIMARY_HREFS = ['/leads', '/deals', '/factory', '/tenants'] as const;

export const CONSOLE_LIST_DETAIL_POLICY = {
  urlParamBySurface: {
    leads: 'lead',
    deals: 'deal',
    audit: 'event',
    lab: 'venture',
  },
  defaultQueryLimit: 50,
  lgPanelMinWidthPx: 300,
  lgPanelMaxWidthPx: 400,
} as const;

export type ConsoleZoneId = 'work' | 'build' | 'insight' | 'catalog' | 'reference';

export type ConsoleZoneLink = {
  label: string;
  href: string;
  description?: string;
};

export type ConsoleZone = {
  id: ConsoleZoneId;
  label: string;
  description: string;
  /** Path prefixes that activate this zone's contextual nav. */
  pathPrefixes: readonly string[];
  links: readonly ConsoleZoneLink[];
};

/** Grouped destinations — powers Desk cards, zone nav, and Cmd+K grouping. */
export const CONSOLE_ZONES: readonly ConsoleZone[] = [
  {
    id: 'work',
    label: 'Client pipeline',
    description: 'Enquiries through signed deals.',
    pathPrefixes: ['/pipeline', '/leads', '/deals', '/engagements'],
    links: [
      { label: 'Pipeline', href: '/pipeline', description: 'Inbound + delivery board' },
      { label: 'New deal', href: '/deals/new', description: 'Start from preset or blank' },
    ],
  },
  {
    id: 'build',
    label: 'Build & ship',
    description: 'Launch wizard, factory, and live tenants.',
    pathPrefixes: ['/build', '/factory', '/tenants', '/onboard'],
    links: [
      { label: 'Launch wizard', href: '/build?tab=launch', description: 'All-tier launch path' },
      { label: 'Clone factory', href: '/build?tab=factory', description: 'In-flight delivery' },
      { label: 'Tenants', href: '/build?tab=tenants', description: 'Portfolio' },
      { label: 'Stamp tenant', href: '/build?tab=onboard', description: 'Onboard wizard' },
    ],
  },
  {
    id: 'insight',
    label: 'Insight',
    description: 'Revenue, portfolio, and deploy surfaces.',
    pathPrefixes: ['/insight', '/reports', '/lab', '/apps', '/analytics', '/plans', '/commercial'],
    links: [
      { label: 'Insight', href: '/insight', description: 'Reports, lab, apps' },
      { label: 'Reports', href: '/insight?tab=reports', description: 'MRR, pipeline, charts' },
      { label: 'Lab', href: '/insight?tab=lab', description: 'Founder ventures' },
      { label: 'Apps', href: '/insight?tab=apps', description: 'Surface matrix' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    description: 'What we sell and how it is priced.',
    pathPrefixes: ['/configure', '/catalog'],
    links: [
      { label: 'Configure', href: '/configure', description: 'Charter, catalog, settings' },
      { label: 'Launch checklist', href: '/configure?tab=launch', description: 'Production readiness' },
      { label: 'Templates', href: '/configure?tab=templates', description: 'SKUs and merge fields' },
      { label: 'Studio settings', href: '/configure?tab=studio', description: 'Automation & webhooks' },
    ],
  },
  {
    id: 'reference',
    label: 'Reference',
    description: 'Runbooks, guides, and audit trail.',
    pathPrefixes: [
      '/playbooks',
      '/delivery',
      '/blueprints',
      '/docs',
      '/audit',
      '/reference',
    ],
    links: [
      { label: 'Operating guide', href: '/configure?tab=launch', description: 'Solo-founder launch path' },
      { label: 'Playbooks', href: '/configure?tab=playbooks', description: 'SLA and delivery' },
      { label: 'Documentation', href: '/configure?tab=docs', description: 'Studio doc registry' },
    ],
  },
] as const;

/** Compact cards on Desk — one entry per zone (not every leaf route). */
export const CONSOLE_DESK_AREAS: readonly {
  zoneId: ConsoleZoneId;
  href: string;
  cta: string;
}[] = [
  { zoneId: 'work', href: '/pipeline', cta: 'Open pipeline' },
  { zoneId: 'build', href: '/build?tab=launch', cta: 'Launch wizard' },
  { zoneId: 'insight', href: '/insight', cta: 'View insight' },
  { zoneId: 'catalog', href: '/configure', cta: 'Configure studio' },
  { zoneId: 'reference', href: '/configure?tab=launch', cta: 'Launch checklist' },
];

export function resolveConsoleZone(pathname: string | null | undefined): ConsoleZone | null {
  if (!pathname) return null;
  const path = pathname.split('?')[0] ?? '/';
  if (path === '/') return null;
  for (const zone of CONSOLE_ZONES) {
    if (zone.pathPrefixes.some((p) => path === p || path.startsWith(`${p}/`))) {
      return zone;
    }
  }
  if (path === '/settings') return null;
  return null;
}

export function consoleZoneForHref(href: string): ConsoleZone | null {
  const path = href.split('?')[0] ?? href;
  for (const zone of CONSOLE_ZONES) {
    if (zone.links.some((l) => l.href.split('?')[0] === path)) return zone;
    if (zone.pathPrefixes.some((p) => path === p || path.startsWith(`${p}/`))) return zone;
  }
  return null;
}
