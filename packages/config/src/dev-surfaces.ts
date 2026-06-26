/**
 * Canonical local dev surface registry — single source for ports, probe targets, and seed URLs.
 *
 * Production URLs always come from `NEXT_PUBLIC_*` env vars. Local defaults use the 4000
 * range so this repo can run beside another stack on 3000–3016.
 */

export type DevSurfaceId =
  | 'heartline'
  | 'console'
  | 'admin'
  | 'client_portal'
  | 'marketing'
  | 'bazaar'
  | 'signal'
  | 'lumen'
  | 'acme'
  | 'nova_care'
  | 'atlas';

export type DevSurfaceDefinition = {
  id: DevSurfaceId;
  label: string;
  /** Default local port when env URL is unset */
  defaultPort: number;
  /** `NEXT_PUBLIC_*` env key for public origin (optional for some demos) */
  publicEnvKey?: string;
  /** pnpm filter for docs / factory */
  packageFilter?: string;
  /** Included in `pnpm probe:dev-urls` required set */
  probeRequired?: boolean;
  /** Also probe `/login` (studio + admin) */
  probeLogin?: boolean;
};

export const DEV_SURFACES: readonly DevSurfaceDefinition[] = [
  {
    id: 'heartline',
    label: 'Heartline',
    defaultPort: 4000,
    publicEnvKey: 'NEXT_PUBLIC_APP_URL',
    packageFilter: '@goldspire/dating-web',
    probeRequired: true,
    probeLogin: true,
  },
  {
    id: 'console',
    label: 'Console',
    defaultPort: 4001,
    publicEnvKey: 'NEXT_PUBLIC_CONSOLE_URL',
    packageFilter: '@goldspire/console',
    probeRequired: true,
    probeLogin: true,
  },
  {
    id: 'admin',
    label: 'Admin',
    defaultPort: 4002,
    publicEnvKey: 'NEXT_PUBLIC_ADMIN_URL',
    packageFilter: '@goldspire/admin',
    probeRequired: true,
    probeLogin: true,
  },
  {
    id: 'client_portal',
    label: 'Client portal',
    defaultPort: 4005,
    publicEnvKey: 'NEXT_PUBLIC_CLIENT_PORTAL_URL',
    packageFilter: '@goldspire/client-portal',
    probeRequired: true,
  },
  {
    id: 'marketing',
    label: 'Marketing',
    defaultPort: 4010,
    publicEnvKey: 'NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL',
    packageFilter: '@goldspire/goldspire-web',
    probeRequired: true,
  },
  {
    id: 'bazaar',
    label: 'Bazaar',
    defaultPort: 4011,
    publicEnvKey: 'NEXT_PUBLIC_BAZAAR_DEMO_URL',
    packageFilter: '@goldspire/marketplace-web',
    probeRequired: false,
  },
  {
    id: 'signal',
    label: 'Signal',
    defaultPort: 4012,
    publicEnvKey: 'NEXT_PUBLIC_SIGNAL_DEMO_URL',
    packageFilter: '@goldspire/community-web',
    probeRequired: false,
  },
  {
    id: 'lumen',
    label: 'Lumen',
    defaultPort: 4013,
    publicEnvKey: 'NEXT_PUBLIC_LUMEN_DEMO_URL',
    packageFilter: '@goldspire/ai-agent-web',
    probeRequired: false,
  },
  {
    id: 'acme',
    label: 'Acme B2B',
    defaultPort: 4014,
    publicEnvKey: 'NEXT_PUBLIC_ACME_DEMO_URL',
    packageFilter: '@goldspire/b2b-saas-web',
    probeRequired: false,
  },
  {
    id: 'nova_care',
    label: 'Nova Care',
    defaultPort: 4015,
    publicEnvKey: 'NEXT_PUBLIC_NOVA_CARE_DEMO_URL',
    packageFilter: '@goldspire/booking-web',
    probeRequired: false,
  },
  {
    id: 'atlas',
    label: 'Atlas',
    defaultPort: 4016,
    publicEnvKey: 'NEXT_PUBLIC_ATLAS_URL',
    packageFilter: '@goldspire/atlas',
    probeRequired: true,
  },
] as const;

const byId = new Map(DEV_SURFACES.map((s) => [s.id, s]));

export function getDevSurface(id: DevSurfaceId): DevSurfaceDefinition {
  const s = byId.get(id);
  if (!s) throw new Error(`Unknown dev surface: ${id}`);
  return s;
}

/** Resolve public origin from env or `http://localhost:{defaultPort}`. */
export function resolveDevSurfaceOrigin(
  id: DevSurfaceId,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  const def = getDevSurface(id);
  const explicit = def.publicEnvKey ? env[def.publicEnvKey]?.trim() : undefined;
  if (explicit && explicit.length > 0) return explicit.replace(/\/$/, '');
  return `http://localhost:${def.defaultPort}`;
}

/** Probe targets for scripts and status page. */
export function devSurfaceProbeTargets(options?: { requiredOnly?: boolean }) {
  const surfaces = options?.requiredOnly
    ? DEV_SURFACES.filter((s) => s.probeRequired)
    : DEV_SURFACES;

  const targets: Array<{ label: string; url: string; required: boolean; kind: 'home' | 'health' | 'login' }> =
    [];

  for (const s of surfaces) {
    const origin = resolveDevSurfaceOrigin(s.id);
    targets.push({ label: s.label, url: `${origin}/`, required: !!s.probeRequired, kind: 'home' });
    targets.push({
      label: `${s.label} health`,
      url: `${origin}/api/health`,
      required: !!s.probeRequired,
      kind: 'health',
    });
    if (s.probeLogin) {
      targets.push({
        label: `${s.label} login`,
        url: `${origin}/login`,
        required: !!s.probeRequired,
        kind: 'login',
      });
    }
  }

  return targets;
}

/** Markdown table rows for docs (launch checklist, local-dev). */
export function devSurfaceLocalUrlTable(): string {
  return DEV_SURFACES.map((s) => {
    const url = `http://localhost:${s.defaultPort}`;
    return `| ${s.label} | ${url} |`;
  }).join('\n');
}
