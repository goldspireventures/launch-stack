'use client';

import * as React from 'react';
import {
  Activity,
  CircleCheck,
  CircleOff,
  CircleSlash,
  Copy,
  ExternalLink,
  Github,
  Globe,
  LayoutDashboard,
  Monitor,
  RefreshCw,
  Smartphone,
  Sparkles,
  Wrench} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  ProductTypeBadge,
  SectionCard,
  cn,
} from '@goldspire/ui';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import { APPS_GRID_FILTERS, type AppsGridFilter } from '@goldspire/commercial';
import { env } from '@goldspire/config/env';
import { StudioPageHeader } from '@/components/studio-page-header';
import { trpc } from '@/lib/trpc';

type DeploymentRow = inferRouterOutputs<AppRouter>['deployments']['listAll'][number];

type Kind = 'web' | 'mobile_ios' | 'mobile_android' | 'admin' | 'console' | 'api';
type Environment = 'local' | 'staging' | 'production';
type HealthStatus = 'unknown' | 'ok' | 'degraded' | 'down';

const KIND_LABEL: Record<Kind, string> = {
  web: 'Web',
  mobile_ios: 'iOS',
  mobile_android: 'Android',
  admin: 'Admin',
  console: 'Console',
  api: 'API'};

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const KIND_ICON: Record<Kind, IconComponent> = {
  web: Globe,
  mobile_ios: Smartphone,
  mobile_android: Smartphone,
  admin: LayoutDashboard,
  console: Wrench,
  api: Activity};

const HEALTH_STYLE: Record<HealthStatus, { label: string; className: string; icon: IconComponent }> = {
  ok: { label: 'Healthy', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CircleCheck },
  degraded: { label: 'Degraded', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: CircleSlash },
  down: { label: 'Down', className: 'bg-red-500/10 text-red-500 border-red-500/20', icon: CircleOff },
  unknown: { label: 'Idle', className: 'bg-muted text-muted-foreground border-border', icon: CircleSlash }};

const STUDIO_MONOREPO_URL =
  env.NEXT_PUBLIC_STUDIO_MONOREPO_URL ?? 'https://github.com/eolaniyan/goldspire-launch-stack';

export default function AppsPage() {
  const q = trpc.deployments.listAll.useQuery();
  const utils = trpc.useUtils();
  const recordHealth = trpc.deployments.recordHealth.useMutation({
    onSuccess: () => utils.deployments.listAll.invalidate()});
  const [filter, setFilter] = React.useState<AppsGridFilter>('all');
  const [highlightId, setHighlightId] = React.useState<string | null>(null);

  if (q.isLoading) return <LoadingState />;

  const rows: DeploymentRow[] = q.data ?? [];
  const filtered = rows.filter((r) => {
    if (filter === 'studio') return r.isStudioTool;
    if (filter === 'client') return !r.isStudioTool;
    if (filter === 'production') return r.environment === 'production';
    if (filter === 'local') return r.environment === 'local';
    return true;
  });

  React.useEffect(() => {
    const raw = typeof window !== 'undefined' ? window.location.hash : '';
    const id = raw.startsWith('#deployment-') ? raw.slice('#deployment-'.length) : null;
    if (!id || !rows.some((r) => r.id === id)) return;
    setHighlightId(id);
    const el = document.getElementById(`deployment-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = window.setTimeout(() => setHighlightId(null), 4000);
    return () => window.clearTimeout(t);
  }, [rows, filtered.length]);

  const totals = {
    all: rows.length,
    studio: rows.filter((r) => r.isStudioTool).length,
    client: rows.filter((r) => !r.isStudioTool).length,
    production: rows.filter((r) => r.environment === 'production').length,
    local: rows.filter((r) => r.environment === 'local').length};

  return (
    <div className="space-y-6">
      <StudioPageHeader
        title="Apps"
        description="Every launchable surface the studio runs — platform tools and live client products. Click any card to open it; production deployments report live health."
        eyebrow="Studio · Launcher"
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {APPS_GRID_FILTERS.map((key) => {
              const labels: Record<AppsGridFilter, string> = {
                all: `All (${totals.all})`,
                client: `Client products (${totals.client})`,
                studio: `Studio tools (${totals.studio})`,
                local: `Local (${totals.local})`,
                production: `Production (${totals.production})`,
              };
              return (
                <FilterPill
                  key={key}
                  active={filter === key}
                  onClick={() => setFilter(key)}
                  label={labels[key]}
                />
              );
            })}
          </div>
          <Button variant="outline" size="sm" onClick={() => utils.deployments.listAll.invalidate()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No apps match that filter"
          description="Stamp out a new product from a blueprint or relax the filter."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <DeploymentCard
              key={d.id}
              row={d}
              highlighted={highlightId === d.id}
              onProbe={(status) => recordHealth.mutate({ id: d.id, status })}
              probing={recordHealth.isPending}
            />
          ))}
        </div>
      )}

      <SectionCard
        title="How this list works"
        description="The Apps grid reads from the product_deployment table — every entry was either seeded, registered by the CLI scaffolder, or upserted via deployments.upsert."
      >
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li><strong>Studio tools</strong> are the Goldspire platform itself (console, admin). They live under the goldspire tenant.</li>
          <li><strong>Client products</strong> are tenants you&apos;ve onboarded — Heartline, Nova Care, Bazaar, etc. Each has its own deployments per surface.</li>
          <li>Only <strong>production</strong> and <strong>staging</strong> rows are health-pinged. Local rows show launch / copy commands.</li>
          <li>Health probes are client-driven from this page — click <em>Probe</em> on any production row to refresh its status.</li>
        </ul>
      </SectionCard>
    </div>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full border px-3 py-1 text-xs font-medium transition ' +
        (active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted')
      }
    >
      {label}
    </button>
  );
}

function DeploymentCard({
  row,
  highlighted,
  onProbe,
  probing}: {
  row: DeploymentRow;
  highlighted?: boolean;
  onProbe: (status: HealthStatus) => void;
  probing: boolean;
}) {
  const KindIcon = KIND_ICON[row.kind as Kind] ?? Globe;
  const isMobile = row.kind === 'mobile_ios' || row.kind === 'mobile_android';
  const isHealthCheckable = row.environment === 'production' || row.environment === 'staging';
  const targetUrl = row.environment === 'local' ? row.localDevUrl : row.url;

  const probe = React.useCallback(async () => {
    if (!targetUrl) {
      onProbe('unknown');
      return;
    }
    try {
      const res = await fetch(`${targetUrl}${row.healthCheckPath ?? '/api/health'}`, {
        mode: 'no-cors',
        cache: 'no-store'});
      // no-cors gives us an opaque response; just being reachable counts as ok.
      onProbe(res.type === 'opaque' || res.ok ? 'ok' : 'degraded');
    } catch {
      onProbe('down');
    }
  }, [targetUrl, row.healthCheckPath, onProbe]);

  return (
    <Card
      id={`deployment-${row.id}`}
      className={cn('overflow-hidden p-0', highlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}
      style={{
        borderLeft: row.accent ? `4px solid ${row.accent}` : undefined}}
    >
      <div className="space-y-4 p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-lg"
              style={{ background: row.accent ? `${row.accent}1f` : 'rgba(148,163,184,0.15)' }}
            >
              <KindIcon className="h-5 w-5" style={{ color: row.accent ?? undefined }} />
            </div>
            <div>
              <h3 className="font-semibold leading-tight">{row.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {KIND_LABEL[row.kind as Kind] ?? row.kind}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    'text-[10px] capitalize ' +
                    (row.environment === 'production'
                      ? 'border-emerald-500/30 text-emerald-500'
                      : row.environment === 'staging'
                        ? 'border-amber-500/30 text-amber-500'
                        : 'border-border text-muted-foreground')
                  }
                >
                  {row.environment}
                </Badge>
                {row.blueprint && <ProductTypeBadge kind={row.blueprint} className="text-[10px]" />}
              </div>
            </div>
          </div>
          {isHealthCheckable && <HealthPill status={(row.healthStatus as HealthStatus) ?? 'unknown'} />}
        </header>

        {row.tagline && <p className="text-sm text-muted-foreground">{row.tagline}</p>}

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted/40 p-2">
            <dt className="text-muted-foreground">Tenant</dt>
            <dd className="font-medium">{row.tenantName ?? '—'}</dd>
          </div>
          <div className="rounded-md bg-muted/40 p-2">
            <dt className="text-muted-foreground">Product</dt>
            <dd className="font-medium">{row.productName ?? <span className="italic text-muted-foreground">platform</span>}</dd>
          </div>
          {row.lastDeploySha && (
            <div className="col-span-2 rounded-md bg-muted/40 p-2 font-mono">
              <dt className="text-muted-foreground">Last deploy</dt>
              <dd className="font-medium">{row.lastDeploySha.slice(0, 7)} · {row.lastDeployAt ? new Date(row.lastDeployAt).toLocaleDateString() : '—'}</dd>
            </div>
          )}
        </dl>

        <div className="flex flex-wrap gap-2">
          {targetUrl && !isMobile && (
            <Button asChild size="sm" className="gap-1.5">
              <a href={targetUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open {row.environment === 'local' ? 'local' : 'site'}
              </a>
            </Button>
          )}
          {row.kind === 'admin' && (
            <Button asChild size="sm" variant="secondary" className="gap-1.5">
              <a href={`${row.localDevUrl ?? row.url ?? ''}/select-tenant`} target="_blank" rel="noreferrer">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Pick tenant
              </a>
            </Button>
          )}
          {isMobile && (
            <Button asChild size="sm" variant="secondary" className="gap-1.5">
              <a
                href={`${STUDIO_MONOREPO_URL}/tree/main/${row.repoPath ?? 'apps/dating-mobile'}`}
                target="_blank"
                rel="noreferrer"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Build instructions
              </a>
            </Button>
          )}
          {row.localDevCommand && (
            <CopyButton text={row.localDevCommand} label="Copy dev command" />
          )}
          {row.repoPath && (
            <Button asChild size="sm" variant="ghost" className="gap-1.5">
              <a href={`${STUDIO_MONOREPO_URL}/tree/main/${row.repoPath}`} target="_blank" rel="noreferrer">
                <Github className="h-3.5 w-3.5" />
                Repo
              </a>
            </Button>
          )}
          {isHealthCheckable && (
            <Button
              size="sm"
              variant="outline"
              onClick={probe}
              disabled={probing}
              className="ml-auto gap-1.5"
            >
              <Activity className="h-3.5 w-3.5" />
              Probe
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function HealthPill({ status }: { status: HealthStatus }) {
  const cfg = HEALTH_STYLE[status];
  const Icon = cfg.icon;
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ' +
        cfg.className
      }
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      className="gap-1.5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? 'Copied' : label}
    </Button>
  );
}

// Suppress unused exports we keep ready for future iterations.
void [Monitor];
