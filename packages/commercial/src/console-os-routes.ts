/**
 * Console OS route map — canonical paths and legacy redirects.
 */

export const CONSOLE_OS_MODES = [
  { id: 'desk', label: 'Desk', href: '/' },
  { id: 'pipeline', label: 'Pipeline', href: '/pipeline' },
  { id: 'build', label: 'Build', href: '/build' },
  { id: 'configure', label: 'Configure', href: '/configure' },
  { id: 'insight', label: 'Insight', href: '/insight' },
] as const;

export type ConsoleOsModeId = (typeof CONSOLE_OS_MODES)[number]['id'];

export const CONSOLE_LEGACY_REDIRECTS: readonly { source: string; destination: string }[] = [
  { source: '/leads', destination: '/pipeline?stage=inbound' },
  { source: '/deals', destination: '/pipeline?stage=delivery' },
  { source: '/factory', destination: '/build?tab=factory' },
  { source: '/tenants', destination: '/build?tab=tenants' },
  { source: '/onboard', destination: '/build?tab=onboard' },
  { source: '/build/launch', destination: '/build?tab=launch' },
  { source: '/reports', destination: '/insight?tab=reports' },
  { source: '/apps', destination: '/insight?tab=apps' },
  { source: '/lab', destination: '/insight?tab=lab' },
  { source: '/lab/compare', destination: '/insight?tab=lab' },
  { source: '/commercial', destination: '/configure?tab=commercial' },
  { source: '/playbooks', destination: '/configure?tab=playbooks' },
  { source: '/catalog', destination: '/configure?tab=templates' },
  { source: '/catalog/templates', destination: '/configure?tab=templates' },
  { source: '/catalog/offerings', destination: '/configure?tab=offerings' },
  { source: '/catalog/feature-flags', destination: '/configure?tab=flags' },
  { source: '/reference', destination: '/configure?tab=launch' },
  { source: '/docs', destination: '/configure?tab=docs' },
  { source: '/delivery', destination: '/configure?tab=playbooks' },
  { source: '/blueprints', destination: '/configure?tab=templates' },
  { source: '/settings', destination: '/configure?tab=studio' },
  { source: '/audit', destination: '/insight?tab=reports' },
  { source: '/analytics', destination: '/insight?tab=reports' },
  { source: '/plans', destination: '/insight?tab=reports' },
];

export function engagementWorkspaceHref(kind: 'lead' | 'deal', id: string): string {
  if (kind === 'deal') return `/engagements/${id}`;
  return `/pipeline?lead=${id}`;
}

export function resolveConsoleOsMode(pathname: string): ConsoleOsModeId | 'engagement' | null {
  if (!pathname || pathname === '/') return 'desk';
  if (pathname.startsWith('/pipeline')) return 'pipeline';
  if (pathname.startsWith('/build')) return 'build';
  if (pathname.startsWith('/configure')) return 'configure';
  if (pathname.startsWith('/insight')) return 'insight';
  if (pathname.startsWith('/engagements/')) return 'engagement';
  return null;
}
