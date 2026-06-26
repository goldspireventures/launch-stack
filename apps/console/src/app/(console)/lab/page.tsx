'use client';

import * as React from 'react';
import Link from 'next/link';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import {
  STUDIO_VENTURE_CATEGORIES,
  STUDIO_VENTURE_CATEGORY_LABEL,
  STUDIO_VENTURE_EDITOR_STATUSES,
  STUDIO_VENTURE_PRIORITY_OPTIONS,
  STUDIO_VENTURE_STATUS_LABEL,
  VENTURE_METRIC_PRESETS,
  studioHasCapability,
} from '@goldspire/commercial';
import {
  Badge,
  Button,
  Card,
  CommandPanel,
  EmptyState,
  Input,
  LoadingState,
  MetricCard,
  Textarea,
  cn,
  useToast,
  formatMinorUnits,
} from '@goldspire/ui';
import {
  AlertCircle,
  Compass,
  Copy,
  FlaskConical,
  FolderOpen,
  Github,
  Lightbulb,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Trash2,
} from 'lucide-react';
import { env } from '@goldspire/config/env';
import { LabCompareView } from '@/components/lab-compare-view';
import { LabFounderCockpit } from '@/components/lab-founder-cockpit';
import { LabPortfolioAlerts } from '@/components/lab-portfolio-alerts';
import { LabPortfolioPulse } from '@/components/lab-portfolio-pulse';
import { LabStrategyView } from '@/components/lab-strategy-view';
import {
  LabStrategyFields,
  defaultLabStrategyForm,
  labStrategyPayload,
} from '@/components/lab-strategy-fields';
import { VentureEconomicsPanel } from '@/components/venture-economics-panel';
import { StudioPageHeader } from '@/components/studio-page-header';
import {
  StudioDetailDrawer,
  StudioDetailPanel,
  StudioListDetailGrid,
} from '@/components/studio-list-detail';
import { useListDetailUrl } from '@/hooks/use-list-detail-url';
import { useMediaLg } from '@/hooks/use-media-lg';
import { trpc } from '@/lib/trpc';

type VentureRow = inferRouterOutputs<AppRouter>['studioLab']['list'][number];
type StatusFilter = 'all' | (typeof STUDIO_VENTURE_EDITOR_STATUSES)[number];

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

function statusBadgeClass(status: VentureRow['status']) {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'exploring':
      return 'bg-sky-500/10 text-sky-600 border-sky-500/20';
    case 'paused':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'shipped':
      return 'bg-violet-500/10 text-violet-600 border-violet-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function relTime(iso: Date | string) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

function buildAtlasVentureUrl(atlasBase: string, venture: { name: string }) {
  const q = `From studio.ventures: what is the plan, scope, and next steps for "${venture.name}"?`;
  return `${atlasBase.replace(/\/$/, '')}/?q=${encodeURIComponent(q)}`;
}

function buildAppsVentureHref(linkedDeploymentId: string | null | undefined) {
  if (!linkedDeploymentId) return null;
  return `/apps#deployment-${linkedDeploymentId}`;
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1.5 font-mono text-xs">
      <span className="min-w-0 truncate" title={value}>
        <span className="text-muted-foreground">{label}: </span>
        {value}
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 shrink-0 px-2"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast({ title: 'Copied', tone: 'success' });
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function VentureEditor({
  venture,
  onSaved,
  onCancel,
  onArchive,
}: {
  venture: Partial<VentureRow> & { id?: string };
  onSaved: (id: string) => void;
  onCancel: () => void;
  onArchive?: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const isNew = !venture.id;
  const deployments = trpc.studioLab.deploymentOptions.useQuery();
  const tenants = trpc.studioLab.tenantOptions.useQuery();
  const deploymentGroups = React.useMemo(() => {
    const rows = deployments.data ?? [];
    return {
      client: rows.filter((d) => !d.isStudioTool),
      studio: rows.filter((d) => d.isStudioTool),
    };
  }, [deployments.data]);

  const [form, setForm] = React.useState({
    name: venture.name ?? '',
    tagline: venture.tagline ?? '',
    status: venture.status ?? 'idea',
    category: venture.category ?? 'product',
    priority: String(venture.priority ?? 3),
    repoUrl: venture.repoUrl ?? '',
    localPath: venture.localPath ?? '',
    cursorWorkspace: venture.cursorWorkspace ?? '',
    docsMarkdown: venture.docsMarkdown ?? '',
    nextAction: venture.nextAction ?? '',
    nextActionDue: venture.nextActionDue
      ? new Date(venture.nextActionDue).toISOString().slice(0, 10)
      : '',
    linkedDeploymentId: venture.linkedDeploymentId ?? '',
    linkedTenantId: venture.linkedTenantId ?? '',
    manualMrrEur:
      venture.manualMrrMinor != null ? String((venture.manualMrrMinor / 100).toFixed(2)) : '',
    monthlyCostsEur:
      venture.monthlyCostsMinor != null ? String((venture.monthlyCostsMinor / 100).toFixed(2)) : '',
    runwayMonths: venture.runwayMonths != null ? String(venture.runwayMonths) : '',
    externalBillingUrl: venture.externalBillingUrl ?? '',
    recordMetricSnapshot: false,
    economicsNotes: venture.economicsNotes ?? '',
    metrics: (venture.metrics ?? []).length
      ? (venture.metrics ?? [])
      : [{ key: '', label: '', value: '', unit: '' }],
    tags: (venture.tags ?? []).join(', '),
  });
  const [strategyForm, setStrategyForm] = React.useState(() => defaultLabStrategyForm(venture));

  const create = trpc.studioLab.create.useMutation({
    onSuccess: (row) => {
      void utils.studioLab.list.invalidate();
      void utils.studioLab.summary.invalidate();
      void utils.studio.deskPulse.invalidate();
      toast({ title: 'Venture created', tone: 'success' });
      onSaved(row.id);
    },
    onError: (e) => toast({ title: 'Create failed', description: e.message, tone: 'danger' }),
  });

  const update = trpc.studioLab.update.useMutation({
    onSuccess: () => {
      void utils.studioLab.list.invalidate();
      void utils.studioLab.summary.invalidate();
      void utils.studio.deskPulse.invalidate();
      toast({ title: 'Saved', tone: 'success' });
      if (venture.id) onSaved(venture.id);
    },
    onError: (e) => toast({ title: 'Save failed', description: e.message, tone: 'danger' }),
  });

  const touch = trpc.studioLab.touch.useMutation({
    onSuccess: () => toast({ title: 'Marked as touched today', tone: 'success' }),
  });

  const save = () => {
    const payload = {
      name: form.name.trim(),
      tagline: form.tagline.trim() || null,
      status: form.status as VentureRow['status'],
      category: form.category as VentureRow['category'],
      priority: Number(form.priority),
      repoUrl: form.repoUrl.trim() || null,
      localPath: form.localPath.trim() || null,
      cursorWorkspace: form.cursorWorkspace.trim() || null,
      docsMarkdown: form.docsMarkdown,
      nextAction: form.nextAction.trim() || null,
      nextActionDue: form.nextActionDue ? new Date(form.nextActionDue) : null,
      linkedDeploymentId: form.linkedDeploymentId || null,
      linkedTenantId: form.linkedTenantId || null,
      manualMrrMinor: form.manualMrrEur.trim()
        ? Math.round(Number.parseFloat(form.manualMrrEur) * 100)
        : null,
      monthlyCostsMinor: form.monthlyCostsEur.trim()
        ? Math.round(Number.parseFloat(form.monthlyCostsEur) * 100)
        : null,
      runwayMonths: form.runwayMonths.trim() ? Number.parseInt(form.runwayMonths, 10) : null,
      externalBillingUrl: form.externalBillingUrl.trim() || null,
      recordMetricSnapshot: form.recordMetricSnapshot,
      economicsNotes: form.economicsNotes.trim() || null,
      metrics: form.metrics
        .filter((m) => m.label.trim() && m.value.trim())
        .map((m) => ({
          key: m.key.trim() || m.label.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 40),
          label: m.label.trim(),
          value: m.value.trim(),
          unit: m.unit?.trim() || null,
          recordedAt: new Date().toISOString(),
        })),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      ...labStrategyPayload(strategyForm),
    };
    if (!payload.name) {
      toast({ title: 'Name is required', tone: 'danger' });
      return;
    }
    if (isNew) create.mutate(payload);
    else update.mutate({ ...payload, id: venture.id! });
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <Field label="Name">
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </Field>
      <Field label="Tagline">
        <Input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Status">
          <select className={selectClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as VentureRow['status'] }))}>
            {STUDIO_VENTURE_EDITOR_STATUSES.map((s) => (
              <option key={s} value={s}>{STUDIO_VENTURE_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select className={selectClass} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as VentureRow['category'] }))}>
            {STUDIO_VENTURE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{STUDIO_VENTURE_CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            className={selectClass}
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          >
            {STUDIO_VENTURE_PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={String(p.value)}>{p.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Next action">
        <Input value={form.nextAction} onChange={(e) => setForm((f) => ({ ...f, nextAction: e.target.value }))} />
      </Field>
      <Field label="Due date (optional)">
        <Input
          type="date"
          value={form.nextActionDue}
          onChange={(e) => setForm((f) => ({ ...f, nextActionDue: e.target.value }))}
        />
      </Field>
      <Field label="Repo URL">
        <Input value={form.repoUrl} onChange={(e) => setForm((f) => ({ ...f, repoUrl: e.target.value }))} />
      </Field>
      <Field label="Local path">
        <Input value={form.localPath} onChange={(e) => setForm((f) => ({ ...f, localPath: e.target.value }))} />
      </Field>
      <Field label="Cursor workspace">
        <Input value={form.cursorWorkspace} onChange={(e) => setForm((f) => ({ ...f, cursorWorkspace: e.target.value }))} />
      </Field>
      <Field label="Linked app (Apps grid)">
        <select
          className={selectClass}
          value={form.linkedDeploymentId}
          onChange={(e) => setForm((f) => ({ ...f, linkedDeploymentId: e.target.value }))}
        >
          <option value="">None — personal / not in Apps yet</option>
          {deploymentGroups.client.length > 0 ? (
            <optgroup label="Client products (demo)">
              {deploymentGroups.client.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.environment}
                </option>
              ))}
            </optgroup>
          ) : null}
          {deploymentGroups.studio.length > 0 ? (
            <optgroup label="Studio tools">
              {deploymentGroups.studio.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.environment}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick an existing Apps row (e.g. Heartline Web) to demo Lab → Apps — no new deployment required.
        </p>
      </Field>
      <div className="border-t border-border/60 pt-3">
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Economics &amp; KPIs (live / shipped)</p>
        <Field label="Link tenant (pull subscription MRR)">
          <select
            className={selectClass}
            value={form.linkedTenantId}
            onChange={(e) => setForm((f) => ({ ...f, linkedTenantId: e.target.value }))}
          >
            <option value="">None — not a monorepo product</option>
            {tenants.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug}) · {t.status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Manual MRR (EUR / month, overrides tenant)">
          <Input
            inputMode="decimal"
            placeholder="e.g. 149.00"
            value={form.manualMrrEur}
            onChange={(e) => setForm((f) => ({ ...f, manualMrrEur: e.target.value }))}
          />
        </Field>
        <Field label="Monthly costs (EUR)">
          <Input
            inputMode="decimal"
            placeholder="e.g. 40.00"
            value={form.monthlyCostsEur}
            onChange={(e) => setForm((f) => ({ ...f, monthlyCostsEur: e.target.value }))}
          />
        </Field>
        <Field label="Runway (months, estimate)">
          <Input
            inputMode="numeric"
            placeholder="e.g. 12"
            value={form.runwayMonths}
            onChange={(e) => setForm((f) => ({ ...f, runwayMonths: e.target.value }))}
          />
        </Field>
        <Field label="Billing dashboard URL">
          <Input
            placeholder="Stripe / App Store Connect / Paddle"
            value={form.externalBillingUrl}
            onChange={(e) => setForm((f) => ({ ...f, externalBillingUrl: e.target.value }))}
          />
        </Field>
        <Field label="Economics notes (costs, runway, deals)">
          <Textarea
            rows={3}
            value={form.economicsNotes}
            onChange={(e) => setForm((f) => ({ ...f, economicsNotes: e.target.value }))}
          />
        </Field>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">KPIs you track (owner-entered)</p>
          {form.metrics.map((m, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Label"
                list="venture-metric-presets"
                value={m.label}
                onChange={(e) =>
                  setForm((f) => {
                    const metrics = [...f.metrics];
                    metrics[i] = { ...metrics[i]!, label: e.target.value };
                    return { ...f, metrics };
                  })
                }
              />
              <Input
                placeholder="Value"
                value={m.value}
                onChange={(e) =>
                  setForm((f) => {
                    const metrics = [...f.metrics];
                    metrics[i] = { ...metrics[i]!, value: e.target.value };
                    return { ...f, metrics };
                  })
                }
              />
              <Input
                placeholder="Unit"
                value={m.unit ?? ''}
                onChange={(e) =>
                  setForm((f) => {
                    const metrics = [...f.metrics];
                    metrics[i] = { ...metrics[i]!, unit: e.target.value };
                    return { ...f, metrics };
                  })
                }
              />
            </div>
          ))}
          <datalist id="venture-metric-presets">
            {VENTURE_METRIC_PRESETS.map((p) => (
              <option key={p.key} value={p.label} />
            ))}
          </datalist>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              setForm((f) => ({
                ...f,
                metrics: [...f.metrics, { key: '', label: '', value: '', unit: '' }],
              }))
            }
          >
            Add KPI row
          </Button>
          <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.recordMetricSnapshot}
              onChange={(e) => setForm((f) => ({ ...f, recordMetricSnapshot: e.target.checked }))}
            />
            Record KPI snapshot on save (for trend charts)
          </label>
        </div>
      </div>
      <LabStrategyFields form={strategyForm} setForm={setStrategyForm} />
      <Field label="Notes (Atlas-indexed)">
        <Textarea rows={6} className="font-mono text-xs" value={form.docsMarkdown} onChange={(e) => setForm((f) => ({ ...f, docsMarkdown: e.target.value }))} />
      </Field>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button size="sm" onClick={save} disabled={create.isPending || update.isPending}>
          <Save className="mr-1.5 h-3.5 w-3.5" />{isNew ? 'Create' : 'Save'}
        </Button>
        {!isNew && venture.id ? (
          <Button size="sm" variant="outline" onClick={() => touch.mutate({ id: venture.id! })}>Touch today</Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        {!isNew && onArchive ? (
          <Button size="sm" variant="destructive" className="ml-auto" onClick={onArchive}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Archive
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function VentureDetailReadonly({
  row,
  onRecordSnapshot,
  recordingSnapshot,
}: {
  row: VentureRow;
  onRecordSnapshot?: () => void;
  recordingSnapshot?: boolean;
}) {
  const atlasUrl = env.NEXT_PUBLIC_ATLAS_URL ?? 'http://localhost:4016';
  const atlasLink = buildAtlasVentureUrl(atlasUrl, row);
  const appsHref = buildAppsVentureHref(row.linkedDeploymentId);
  const dep = row.linkedDeployment;

  return (
    <div className="space-y-4 text-sm">
      <VentureEconomicsPanel row={row} onRecordSnapshot={onRecordSnapshot} recording={recordingSnapshot} />
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{STUDIO_VENTURE_STATUS_LABEL[row.status]}</Badge>
        <Badge variant="secondary">{STUDIO_VENTURE_CATEGORY_LABEL[row.category]}</Badge>
        <Badge variant="outline" className="tabular-nums">
          P{row.priority}
        </Badge>
        {(row.tags ?? []).slice(0, 4).map((t) => (
          <Badge key={t} variant="outline" className="text-[10px]">
            {t}
          </Badge>
        ))}
      </div>
      {row.tagline ? <p className="text-muted-foreground">{row.tagline}</p> : null}
      {row.nextAction ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="text-xs uppercase text-muted-foreground">Next action</p>
          <p className="font-medium">{row.nextAction}</p>
        </div>
      ) : (
        <p className="text-xs text-amber-600 dark:text-amber-400">No next action — set one in Edit so Desk can nudge you.</p>
      )}
      <p className="text-xs text-muted-foreground">Last touched {relTime(row.lastTouchedAt)}</p>
      {(row.localPath || row.cursorWorkspace) ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase text-muted-foreground">Workspace</p>
          {row.localPath ? <CopyLine label="Path" value={row.localPath} /> : null}
          {row.cursorWorkspace ? <CopyLine label="Cursor" value={row.cursorWorkspace} /> : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {row.repoUrl ? (
          <Button asChild size="sm" variant="outline">
            <a href={row.repoUrl} target="_blank" rel="noreferrer">
              <Github className="mr-1.5 h-3.5 w-3.5" />Repo
            </a>
          </Button>
        ) : null}
      </div>
      <div className="space-y-3 border-t border-border/60 pt-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">Connections</p>
        <div className="rounded-lg border border-border/60 px-3 py-2.5">
          <p className="font-medium">Atlas — recall</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Opens Atlas with a question scoped to this venture&apos;s notes in the <code className="text-[10px]">studio.ventures</code> corpus.
            Run <strong>Sync Atlas</strong> on Lab after editing notes.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-2">
            <a href={atlasLink} target="_blank" rel="noreferrer">
              <Compass className="mr-1.5 h-3.5 w-3.5" />
              Ask about {row.name}
            </a>
          </Button>
        </div>
        <div className="rounded-lg border border-border/60 px-3 py-2.5">
          <p className="font-medium">Apps — launch surface</p>
          {dep && appsHref ? (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Linked to <strong>{dep.name}</strong>
                {dep.healthStatus ? ` · health ${dep.healthStatus}` : ''}. Opens that card in the Apps grid.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link href={appsHref}>
                  <Rocket className="mr-1.5 h-3.5 w-3.5" />
                  Open {dep.name}
                </Link>
              </Button>
            </>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Not linked — normal for personal iOS/Cursor-only work. Edit venture → <strong>Linked app</strong> when you
              have a deployment in Apps.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudioLabPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const teamAccess = trpc.studio.teamAccess.useQuery();
  const canLab = studioHasCapability(teamAccess.data?.currentUser.role ?? '', 'lab.manage');
  const { selectedId, setSelectedId } = useListDetailUrl('venture');
  const isLg = useMediaLg();
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [boardFilter, setBoardFilter] = React.useState<'all' | 'idea' | 'inflight' | 'attention'>('all');
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [mode, setMode] = React.useState<'view' | 'edit' | 'create'>('view');
  const [labView, setLabView] = React.useState<'board' | 'compare' | 'strategy'>('board');
  const [selected, setSelected] = React.useState<VentureRow | null>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const summary = trpc.studioLab.summary.useQuery(undefined, { enabled: canLab });
  const list = trpc.studioLab.list.useQuery({ status, search: debounced || undefined }, { enabled: canLab });
  const reindex = trpc.studioLab.reindexAtlas.useMutation({
    onSuccess: (r) => toast({ title: 'Atlas synced', description: `${r.chunksWritten} chunks`, tone: 'success' }),
  });
  const archive = trpc.studioLab.archive.useMutation({
    onSuccess: () => { void utils.studioLab.list.invalidate(); setSelected(null); setSelectedId(null); setMode('view'); },
  });
  const recordSnapshot = trpc.studioLab.recordMetricSnapshot.useMutation({
    onSuccess: () => {
      void utils.studioLab.list.invalidate();
      void utils.studioLab.summary.invalidate();
      toast({ title: 'KPI snapshot recorded', tone: 'success' });
    },
    onError: (e) => toast({ title: 'Snapshot failed', description: e.message, tone: 'danger' }),
  });

  React.useEffect(() => {
    if (!selectedId || !list.data) return;
    const row = list.data.find((v) => v.id === selectedId);
    if (row) { setSelected(row); setMode('view'); }
  }, [selectedId, list.data]);

  if (!teamAccess.isLoading && !canLab) {
    return (
      <div className="space-y-6">
        <StudioPageHeader title="Lab" description="Owner-only personal portfolio." eyebrow="Portfolio" />
        <Button asChild variant="outline" size="sm"><Link href="/">Back to Desk</Link></Button>
      </div>
    );
  }

  if (summary.isLoading || list.isLoading) return <LoadingState label="Loading Lab…" />;

  const rows = list.data ?? [];
  const attentionIds = new Set(summary.data?.attention.map((a) => a.ventureId) ?? []);
  const boardRows = rows.filter((row) => {
    if (boardFilter === 'idea') return row.status === 'idea';
    if (boardFilter === 'inflight') return row.status === 'active' || row.status === 'exploring';
    if (boardFilter === 'attention') return attentionIds.has(row.id);
    return true;
  });

  const openCreate = () => {
    setSelected(null);
    setSelectedId(null);
    setMode('create');
  };

  const openVenture = (ventureId: string) => {
    const row = rows.find((v) => v.id === ventureId);
    if (!row) return;
    setSelected(row);
    setSelectedId(ventureId);
    setMode('view');
    boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const panel =
    mode === 'create' ? null : selected && mode === 'edit' ? (
      <StudioDetailPanel title={selected.name} onClose={() => setMode('view')}>
        <VentureEditor venture={selected} onSaved={() => setMode('view')} onCancel={() => setMode('view')} onArchive={() => archive.mutate({ id: selected.id })} />
      </StudioDetailPanel>
    ) : selected ? (
      <StudioDetailPanel title={selected.name} onClose={() => { setSelected(null); setSelectedId(null); }} footer={<Button size="sm" variant="secondary" onClick={() => setMode('edit')}>Edit</Button>}>
        <VentureDetailReadonly
          row={selected}
          onRecordSnapshot={() => recordSnapshot.mutate({ id: selected.id })}
          recordingSnapshot={recordSnapshot.isPending}
        />
      </StudioDetailPanel>
    ) : null;

  return (
    <div className="space-y-6">
      <StudioPageHeader
        eyebrow="Studio · Portfolio"
        title="Lab"
        description="Your private portfolio — not client deals. What to build next, where it lives, and what Desk should nudge you on."
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href="/lab/compare">Compare</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => reindex.mutate()} disabled={reindex.isPending}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Sync Atlas</Button>
            <Button size="sm" onClick={openCreate}><Plus className="mr-1.5 h-3.5 w-3.5" />Add venture</Button>
          </>
        }
      />
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(['board', 'compare', 'strategy'] as const).map((v) => (
          <Button
            key={v}
            type="button"
            size="sm"
            variant={labView === v ? 'default' : 'ghost'}
            onClick={() => setLabView(v)}
          >
            {v === 'board' ? 'Board' : v === 'compare' ? 'Compare' : 'Strategy & export'}
          </Button>
        ))}
      </div>
      {labView === 'strategy' ? <LabStrategyView /> : null}
      {labView === 'compare' ? <LabCompareView ventures={rows} /> : null}
      {labView === 'board' && summary.data ? (
        <LabPortfolioPulse
          summary={summary.data}
          onOpenVenture={openVenture}
          onShowAttention={() => {
            setBoardFilter('attention');
            setStatus('all');
            boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      ) : null}
      {labView === 'board' ? <LabFounderCockpit /> : null}
      {labView === 'board' && summary.data ? (
        <LabPortfolioAlerts alerts={summary.data.portfolioAlerts} onOpenVenture={openVenture} />
      ) : null}
      {labView === 'board' && summary.data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label="Total"
            value={summary.data.total}
            icon={FlaskConical}
            onClick={() => {
              setBoardFilter('all');
              setStatus('all');
              boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <MetricCard
            label="In flight"
            value={summary.data.active}
            icon={FolderOpen}
            onClick={() => {
              setBoardFilter('inflight');
              setStatus('all');
              boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <MetricCard
            label="Ideas"
            value={summary.data.ideas}
            icon={Lightbulb}
            onClick={() => {
              setBoardFilter('idea');
              setStatus('idea');
              boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <MetricCard
            label="Needs attention"
            value={summary.data.needsAttention}
            icon={AlertCircle}
            onClick={() => {
              setBoardFilter('attention');
              setStatus('all');
              boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>
      ) : null}
      {labView === 'board' ? (
      <div ref={boardRef}>
      <CommandPanel title="Venture board" description="Click a row for detail. Metric tiles above filter this list.">
        <div className="mb-4 flex flex-wrap gap-3">
          <Input className="max-w-xs" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            className={`${selectClass} w-[160px]`}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setBoardFilter('all');
            }}
          >
            <option value="all">All statuses</option>
            {STUDIO_VENTURE_EDITOR_STATUSES.map((s) => (
              <option key={s} value={s}>{STUDIO_VENTURE_STATUS_LABEL[s]}</option>
            ))}
          </select>
          {boardFilter !== 'all' ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setBoardFilter('all');
                setStatus('all');
              }}
            >
              Clear board filter
            </Button>
          ) : null}
        </div>
        <StudioListDetailGrid panel={isLg ? panel : null}>
          {rows.length === 0 ? (
            <EmptyState icon={FlaskConical} title="No ventures yet" description="Add a side project or business idea." action={<Button size="sm" onClick={openCreate}>Add venture</Button>} />
          ) : boardRows.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No ventures in this view"
              description="Try another metric tile or clear the board filter."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBoardFilter('all');
                    setStatus('all');
                  }}
                >
                  Show all
                </Button>
              }
            />
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-2">Venture</th>
                    <th className="px-4 py-2 w-24">Status</th>
                    <th className="hidden px-4 py-2 w-12 lg:table-cell">P</th>
                    <th className="hidden px-4 py-2 md:table-cell">Next</th>
                    <th className="hidden px-4 py-2 w-24 lg:table-cell">MRR</th>
                    <th className="hidden px-4 py-2 w-28 xl:table-cell">Touched</th>
                  </tr>
                </thead>
                <tbody>
                  {boardRows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'cursor-pointer border-b hover:bg-muted/20',
                        selected?.id === row.id && 'bg-primary/5',
                        attentionIds.has(row.id) && 'border-l-2 border-l-amber-500/60',
                      )}
                      onClick={() => { setSelected(row); setSelectedId(row.id); setMode('view'); }}
                    >
                      <td className="px-4 py-3"><p className="font-medium">{row.name}</p>{row.tagline ? <p className="text-xs text-muted-foreground">{row.tagline}</p> : null}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusBadgeClass(row.status)}>
                          {STUDIO_VENTURE_STATUS_LABEL[row.status]}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-xs tabular-nums text-muted-foreground lg:table-cell">
                        P{row.priority}
                      </td>
                      <td className="hidden max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground md:table-cell">
                        {row.nextAction ?? '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-xs tabular-nums text-muted-foreground lg:table-cell">
                        {row.economics?.effectiveMrrMinor != null
                          ? formatMinorUnits(row.economics.effectiveMrrMinor, 'EUR')
                          : '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground xl:table-cell">
                        {relTime(row.lastTouchedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </StudioListDetailGrid>
      </CommandPanel>
      </div>
      ) : null}
      {mode === 'create' ? (
        <StudioDetailDrawer
          open
          onClose={() => setMode('view')}
          title="New venture"
          subtitle="Opens in this dialog so you don't miss the form below the board."
        >
          <VentureEditor
            venture={{}}
            onSaved={(id) => {
              setMode('view');
              setSelectedId(id);
            }}
            onCancel={() => setMode('view')}
          />
        </StudioDetailDrawer>
      ) : null}
      {!isLg && selected ? (
        <StudioDetailDrawer
          open
          onClose={() => { setMode('view'); setSelected(null); setSelectedId(null); }}
          title={selected?.name ?? 'Venture'}
        >
          {selected && mode === 'edit' ? (
            <VentureEditor
              venture={selected}
              onSaved={() => setMode('view')}
              onCancel={() => setMode('view')}
              onArchive={() => archive.mutate({ id: selected.id })}
            />
          ) : selected ? (
            <>
              <VentureDetailReadonly
                row={selected}
                onRecordSnapshot={() => recordSnapshot.mutate({ id: selected.id })}
                recordingSnapshot={recordSnapshot.isPending}
              />
              <Button size="sm" className="mt-4" onClick={() => setMode('edit')}>Edit</Button>
            </>
          ) : null}
        </StudioDetailDrawer>
      ) : null}
    </div>
  );
}
