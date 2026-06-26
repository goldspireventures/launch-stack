'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  LoadingState,
  SectionCard} from '@goldspire/ui';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@goldspire/api';
import { ArrowUpRight, Globe, Sparkles } from 'lucide-react';
import { marketingSiteUrl } from '@/lib/marketing-site-url';
import { formatTemplatePriceCents, templatePanelIcon } from '@goldspire/template-kit';
import { StudioPageHeader } from '@/components/studio-page-header';
import { StudioDialogFooter } from '@/components/studio-page-shell';
import { trpc } from '@/lib/trpc';

import { CatalogScopePlaybook } from '@/components/catalog-scope-playbook';

import { CommercialPlansPanel } from '@/components/commercial-plans-panel';

import { OfferingsEditorPanel } from '@/components/offerings-editor-panel';

import { TemplateOfferingsEditorPanel } from '@/components/template-offerings-editor-panel';

type TemplateRow = inferRouterOutputs<AppRouter>['catalog']['listTemplates'][number];
type TemplateDetail = inferRouterOutputs<AppRouter>['catalog']['templateById'];

/**
 * Product Templates catalog.
 *
 * Templates sit between **blueprints** (the technical foundation) and
 * **tenants** (a client's branded instance). One blueprint can have many
 * templates — `social_matching` powers both `dating` and (eventually)
 * `mentorship`. This page is the studio's source of truth for "what
 * shaped products we ship".
 *
 * On the public Goldspire site this same data drives the /templates
 * marketing pages. Internally here it doubles as the launch pad for the
 * tenant-stamping wizard (one click → /onboard with the template pre-set).
 */
function iconFor(name: string) {
  return templatePanelIcon(name);
}

function formatCents(cents: number, currency = 'EUR'): string {
  return formatTemplatePriceCents(cents, currency, 'de-DE');
}

const STATUS_LABEL: Record<TemplateRow['status'], string> = {
  shipped: 'Shipped',
  beta: 'Beta',
  planned: 'Planned'};

const STATUS_STYLE: Record<TemplateRow['status'], string> = {
  shipped: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  beta: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  planned: 'border-slate-400/30 bg-slate-500/10 text-slate-300'};

function TemplateStatusPill({ status }: { status: TemplateRow['status'] }) {
  return (
    <Badge variant="outline" className={STATUS_STYLE[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

type CatalogTab = 'products' | 'pricing' | 'offerings' | 'template-copy' | 'playbook';

export default function CatalogTemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: CatalogTab =
    tabParam === 'pricing'
      ? 'pricing'
      : tabParam === 'offerings'
        ? 'offerings'
        : tabParam === 'template-copy'
          ? 'template-copy'
          : tabParam === 'playbook'
            ? 'playbook'
            : 'products';

  const setTab = (next: CatalogTab) => {
    const p = new URLSearchParams(searchParams.toString());
    if (next === 'products') p.delete('tab');
    else p.set('tab', next);
    const qs = p.toString();
    router.replace(qs ? `/catalog/templates?${qs}` : '/catalog/templates');
  };

  const q = trpc.catalog.listTemplates.useQuery();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | TemplateRow['status']>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = q.data ?? [];

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!s) return true;
      const hay = [r.name, r.tagline, r.id, ...r.useCases].join(' ').toLowerCase();
      return hay.includes(s);
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const shipped = rows.filter((r) => r.status === 'shipped').length;
    const planned = rows.filter((r) => r.status === 'planned').length;
    const tenants = rows.reduce((sum, r) => sum + r.stampedTenants, 0);
    return { shipped, planned, tenants };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={tab === 'products' ? 'default' : 'outline'} onClick={() => setTab('products')}>
          Products
        </Button>
        <Button size="sm" variant={tab === 'pricing' ? 'default' : 'outline'} onClick={() => setTab('pricing')}>
          Pricing
        </Button>
        <Button size="sm" variant={tab === 'offerings' ? 'default' : 'outline'} onClick={() => setTab('offerings')}>
          Public tiers
        </Button>
        <Button size="sm" variant={tab === 'playbook' ? 'default' : 'outline'} onClick={() => setTab('playbook')}>
          Scope &amp; SKUs
        </Button>
        <Button size="sm" variant={tab === 'template-copy' ? 'default' : 'outline'} onClick={() => setTab('template-copy')}>
          Template copy
        </Button>
      </div>

      <StudioPageHeader
        title={
          tab === 'pricing'
            ? 'Commercial pricing'
            : tab === 'offerings'
              ? 'Public engagement tiers'
              : tab === 'template-copy'
                ? 'Template marketing copy'
                : tab === 'playbook'
                  ? 'Scope, SKUs & roadmap'
                  : 'Product templates'
        }
        description={
          tab === 'pricing'
            ? 'Tier cards and milestone previews — same source as the public site and Deal Desk. Run pnpm audit:commercial-sync before launches.'
            : tab === 'offerings'
              ? 'Clone / template / blueprint cards on the public /pricing page.'
              : tab === 'template-copy'
                ? 'Taglines, hero copy, and starts-at pricing on /templates.'
                : tab === 'playbook'
                  ? 'Internal playbook: metric, scope layers, revenue SKUs, guardrails, and what to ship next. Public tier copy is edited in “Public tiers”.'
                : 'Polished instances of a blueprint. How the studio sells Dating, Mentorship, and the rest without selling the raw stack.'
        }
        eyebrow="Studio · Catalog"
        actions={
          tab === 'products' ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/commercial">Commercial hub</Link>
              </Button>
              <Button variant="outline" className="gap-1.5" asChild>
                <a href={marketingSiteUrl()} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-3.5 w-3.5" />
                  View public site
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                </a>
              </Button>
              <Button asChild className="gap-1.5">
                <Link href="/onboard">
                  <Sparkles className="h-3.5 w-3.5" />
                  Stamp a tenant
                </Link>
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="gap-1.5" asChild>
              <a href={marketingSiteUrl()} target="_blank" rel="noopener noreferrer">
                <Globe className="h-3.5 w-3.5" />
                View public site
                <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
              </a>
            </Button>
          )
        }
      />

      {tab === 'pricing' ? (
        <CommercialPlansPanel />
      ) : tab === 'offerings' ? (
        <OfferingsEditorPanel />
      ) : tab === 'template-copy' ? (
        <TemplateOfferingsEditorPanel />
      ) : tab === 'playbook' ? (
        <CatalogScopePlaybook />
      ) : (
        <>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Templates" value={String(rows.length)} hint={`${stats.shipped} shipped · ${stats.planned} planned`} />
        <StatCard label="Tenants live" value={String(stats.tenants)} hint="Across all templates" />
        <StatCard
          label="Blueprints covered"
          value={String(new Set(rows.map((r) => r.blueprint)).size)}
          hint={`of 6 registered blueprints`}
        />
      </div>

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex flex-wrap items-center gap-1">
              {(['', 'shipped', 'beta', 'planned'] as const).map((s) => (
                <Button
                  key={s || 'all'}
                  size="sm"
                  variant={statusFilter === s ? 'default' : 'ghost'}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === '' ? 'All' : STATUS_LABEL[s as TemplateRow['status']]}
                </Button>
              ))}
            </div>
            <p className="ml-auto text-xs text-muted-foreground">
              {filtered.length} of {rows.length}
            </p>
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <LoadingState label="Loading templates" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No templates match"
          description="Adjust the search or status filter."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((t) => (
            <TemplateCard key={t.id} t={t} onOpen={() => setSelectedId(t.id)} />
          ))}
        </div>
      )}

      <SectionCard
        title="Blueprint → template → tenant"
        description="Sell templates and stamp tenants; blueprints stay engineering reference."
      >
        <ol className="ml-5 list-decimal space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Blueprint</strong> — technical foundation.{' '}
            <Link href="/blueprints" className="text-primary underline-offset-2 hover:underline">
              Open blueprints
            </Link>
            .
          </li>
          <li>
            <strong>Product template</strong> — polished SKU with brand defaults, flags, and list pricing (this catalog).
          </li>
          <li>
            <strong>Tenant</strong> — one client instance.{' '}
            <Link href="/onboard" className="text-primary underline-offset-2 hover:underline">
              Stamp from onboard
            </Link>
            .
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          Pricing layers and public vs deal desk edits:{' '}
          <Link href="/commercial" className="font-medium text-primary underline-offset-2 hover:underline">
            Commercial hub
          </Link>
          . Scope guardrails:{' '}
          <Link
            href="/catalog/templates?tab=playbook"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Scope &amp; SKUs
          </Link>
          .
        </p>
      </SectionCard>

      <TemplateDrawer templateId={selectedId} onClose={() => setSelectedId(null)} />
        </>
      )}
    </div>
  );
}

function TemplateCard({ t, onOpen }: { t: TemplateRow; onOpen: () => void }) {
  const Icon = iconFor(t.brand.iconName);
  const accent = t.brand.defaultAccentHex;
  return (
    <Card className="overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: accent }} aria-hidden />
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-md"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">{t.name}</CardTitle>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.id}</p>
            </div>
          </div>
          <TemplateStatusPill status={t.status} />
        </div>
        <CardDescription className="text-sm">{t.tagline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Starts at</p>
            <p className="font-medium">{formatCents(t.pricing.startsAtPriceCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Typical</p>
            <p className="font-medium">
              {t.pricing.typicalWeeks.min}–{t.pricing.typicalWeeks.max} wks
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Tenants</p>
            <p className="font-medium">{t.stampedTenants}</p>
          </div>
        </div>
        {t.useCases.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {t.useCases.slice(0, 3).map((u) => (
              <Badge key={u} variant="outline" className="text-[11px]">
                {u}
              </Badge>
            ))}
            {t.useCases.length > 3 && (
              <Badge variant="outline" className="text-[11px]">
                +{t.useCases.length - 3} more
              </Badge>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={onOpen} className="gap-1.5">
            View template
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/blueprints?highlight=${encodeURIComponent(t.blueprint)}`}>Blueprint</Link>
          </Button>
          {t.status === 'shipped' ? (
            <Button asChild size="sm" variant="secondary" className="gap-1.5">
              <Link
                href={{
                  pathname: '/onboard',
                  query: { blueprint: t.blueprint, template: t.id }}}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Stamp tenant
              </Link>
            </Button>
          ) : (
            <Badge variant="outline" className="text-[11px]">
              Pricing: ×{t.pricing.effortMultiplier.toFixed(2)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 py-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function TemplateDrawer({
  templateId,
  onClose}: {
  templateId: string | null;
  onClose: () => void;
}) {
  const q = trpc.catalog.templateById.useQuery(
    { id: templateId ?? '' },
    { enabled: Boolean(templateId) },
  );

  const open = Boolean(templateId);
  const t: TemplateDetail | undefined = q.data;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[min(90vh,920px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        {!t ? (
          <>
            <div className="shrink-0 border-b px-6 pb-4 pr-12 pt-6">
              <DialogHeader className="space-y-0 text-left">
                <DialogTitle>Loading template…</DialogTitle>
                <DialogDescription>Fetching template details.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <LoadingState label="Loading" />
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 border-b px-6 pb-4 pr-12 pt-6">
              <DialogHeader className="space-y-2 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="pr-2">{t.name}</DialogTitle>
                  <TemplateStatusPill status={t.status} />
                </div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.id}</p>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              <DialogDescription className="mb-5 text-left text-sm leading-relaxed">
                {t.description}
              </DialogDescription>

              <div className="space-y-5 text-sm">
                <Section title="Use cases">
                  <div className="flex flex-wrap gap-1.5">
                    {t.useCases.map((u) => (
                      <Badge key={u} variant="outline" className="text-[11px]">
                        {u}
                      </Badge>
                    ))}
                  </div>
                </Section>

                <Section title="Hero screens">
                  <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                    {t.heroScreens.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </Section>

                <Section title="Pricing hints">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Hint label="Starts at" value={formatCents(t.pricing.startsAtPriceCents)} />
                    <Hint
                      label="Typical weeks"
                      value={`${t.pricing.typicalWeeks.min}–${t.pricing.typicalWeeks.max}`}
                    />
                    <Hint label="Effort vs baseline" value={`×${t.pricing.effortMultiplier.toFixed(2)}`} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{t.pricing.reason}</p>
                </Section>

                <Section title={`Products stamped (${t.products.length})`}>
                  <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                    {t.products.map((p) => (
                      <li key={p.slug}>
                        <span className="font-medium text-foreground">{p.name}</span>{' '}
                        <span className="text-[11px]">/{p.slug}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title={`Flag overrides (${t.flagOverrides.length})`}>
                  {t.flagOverrides.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None — catalog defaults only.</p>
                  ) : (
                    <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                      {t.flagOverrides.map((f) => (
                        <li key={f.key}>
                          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{f.key}</code>{' '}
                          → {f.numericValue != null ? f.numericValue : f.enabled ? 'on' : 'off'}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Section title={`Discovery questions (${t.discoveryQuestions.length})`}>
                  <ol className="ml-5 list-decimal space-y-1 text-muted-foreground">
                    {t.discoveryQuestions.map((q) => (
                      <li key={q.id}>{q.question}</li>
                    ))}
                  </ol>
                </Section>

                {t.clientNotes.length > 0 && (
                  <Section title="Client notes">
                    <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                      {t.clientNotes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </Section>
                )}

                {t.tenants.length > 0 && (
                  <Section title={`Live tenants (${t.tenants.length})`}>
                    <div className="flex flex-wrap gap-1.5">
                      {t.tenants.map((tn) => (
                        <Badge key={tn.id} variant="secondary" className="text-[11px]">
                          {tn.name}
                        </Badge>
                      ))}
                    </div>
                  </Section>
                )}

              </div>
            </div>
            <StudioDialogFooter className="shrink-0 px-6">
              <div className="flex flex-wrap gap-2">
                {t.status === 'shipped' && (
                  <Button asChild className="gap-1.5">
                    <Link
                      href={{
                        pathname: '/onboard',
                        query: { blueprint: t.blueprint, template: t.id },
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Stamp a tenant on this template
                    </Link>
                  </Button>
                )}
                <Button asChild variant="secondary">
                  <Link href={`/blueprints?highlight=${encodeURIComponent(t.blueprint)}`}>
                    View blueprint
                  </Link>
                </Button>
              </div>
            </StudioDialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function Hint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
