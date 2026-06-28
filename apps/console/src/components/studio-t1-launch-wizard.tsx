'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTemplate } from '@goldspire/blueprints';
import {
  DEAL_PRESETS,
  getDealPresetBySlug,
  type DealPresetDefinition,
} from '@goldspire/commercial';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Textarea,
  cn,
  formatMinorUnits,
  useToast,
} from '@goldspire/ui';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Loader2,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { storeDealPortalUrl } from '@/lib/deal-portal-session';

const PRESET_GROUPS: { title: string; filter: (p: DealPresetDefinition) => boolean }[] = [
  { title: 'Tier 1 — Clones', filter: (p) => p.id.startsWith('tier1_') },
  {
    title: 'Tier 2 & 3',
    filter: (p) =>
      p.id === 'tier2_template' || p.id === 'tier2_template_medium' || p.id === 'tier3_blueprint',
  },
  {
    title: 'Discovery & retainer',
    filter: (p) => p.id === 'discovery_sprint' || p.id === 'post_go_live_retainer',
  },
];

function presetSupportsAutoStamp(p: DealPresetDefinition): boolean {
  return p.id !== 'discovery_sprint' && p.id !== 'post_go_live_retainer';
}

type Step = 'preset' | 'deal' | 'portal' | 'stamp' | 'done';

const STEPS: { id: Step; label: string }[] = [
  { id: 'preset', label: 'SKU' },
  { id: 'deal', label: 'Deal' },
  { id: 'portal', label: 'Portal' },
  { id: 'stamp', label: 'Stamp' },
  { id: 'done', label: 'Done' },
];

function slugFromName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return base.length >= 3 ? base : 'client';
}

export function StudioLaunchWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [step, setStep] = React.useState<Step>('preset');
  const [presetSlug, setPresetSlug] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState('');
  const [clientName, setClientName] = React.useState('');
  const [clientEmail, setClientEmail] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [dealId, setDealId] = React.useState<string | null>(null);
  const [portalUrl, setPortalUrl] = React.useState<string | null>(null);

  const [tenantSlug, setTenantSlug] = React.useState('');
  const [tenantName, setTenantName] = React.useState('');
  const [ownerName, setOwnerName] = React.useState('');
  const [ownerEmail, setOwnerEmail] = React.useState('');
  const [primaryHex, setPrimaryHex] = React.useState('#E15A82');
  const [tagline, setTagline] = React.useState('');
  const [stampedSlug, setStampedSlug] = React.useState<string | null>(null);

  const preset = presetSlug ? getDealPresetBySlug(presetSlug) : undefined;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const createDeal = trpc.studioDeals.create.useMutation();
  const syncSchedule = trpc.studioDeals.syncPaymentSchedule.useMutation();
  const updateDeal = trpc.studioDeals.update.useMutation();
  const portalLink = trpc.studioDeals.createPortalLink.useMutation();
  const launchT1 = trpc.studioDeals.launchT1.useMutation();
  const previewStamp = trpc.onboarding.preview.useQuery(
    preset
      ? {
          name: tenantName,
          slug: tenantSlug,
          plan: 'trial' as const,
          blueprint: preset.blueprintKind,
          templateId: preset.productTemplateId,
          ownerName,
          ownerEmail,
          tagline: tagline || undefined,
          primaryHex,
        }
      : ({} as never),
    { enabled: step === 'stamp' && Boolean(preset && tenantSlug.length >= 3 && ownerEmail) },
  );
  const stamp = trpc.onboarding.stamp.useMutation();
  const [deployHook, setDeployHook] = React.useState<{ secret: string; endpoint: string; curl: string } | null>(null);

  function pickPreset(slug: string) {
    const p = getDealPresetBySlug(slug);
    if (!p) return;
    setPresetSlug(slug);
    const tpl = getTemplate(p.productTemplateId);
    if (tpl?.brand.defaultPrimaryHex) setPrimaryHex(tpl.brand.defaultPrimaryHex);
    if (tpl?.brand.defaultTagline) setTagline(tpl.brand.defaultTagline);
    setStep('deal');
  }

  function prefillStampFields(name: string, email: string) {
    setTenantName(name);
    setTenantSlug(slugFromName(name));
    setOwnerName(name);
    setOwnerEmail(email);
  }

  async function handleCreateDeal() {
    if (!preset) return;
    try {
      const row = await createDeal.mutateAsync({
        title: title.trim(),
        clientName: clientName.trim(),
        notes: notes.trim() || undefined,
        intakeTemplateId: preset.intakeTemplateId,
        dealPresetSlug: preset.slug,
        ...preset.planInput,
      });
      setDealId(row.id);
      if (clientEmail.trim()) {
        await updateDeal.mutateAsync({
          id: row.id,
          clientContactEmail: clientEmail.trim(),
        });
      }
      await syncSchedule.mutateAsync({ dealId: row.id });
      prefillStampFields(clientName.trim(), clientEmail.trim());
      if (!title.trim()) setTitle(`${clientName.trim()} — ${preset.label}`);
      toast({ title: 'Deal filed', description: 'Preset locked · payment schedule synced.', tone: 'success' });
      setStep('portal');
    } catch (e) {
      toast({
        title: 'Could not create deal',
        description: e instanceof Error ? e.message : String(e),
        tone: 'danger',
      });
    }
  }

  async function handleAutoLaunch() {
    if (!preset) return;
    try {
      const canStamp = presetSupportsAutoStamp(preset);
      const res = await launchT1.mutateAsync({
        presetSlug: preset.slug,
        title: title.trim(),
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        issuePortal: true,
        emailClient: true,
        stampTenant: canStamp,
        rotateDeployHook: canStamp,
        tenantName: clientName.trim(),
        tenantSlug: tenantSlug.trim() || undefined,
        ownerName: ownerName.trim() || clientName.trim(),
        ownerEmail: ownerEmail.trim() || clientEmail.trim() || undefined,
        primaryHex,
        tagline: tagline.trim() || undefined,
      });
      setDealId(res.dealId);
      setPortalUrl(res.portalUrl);
      setDeployHook(res.deployHook);
      setStampedSlug(res.tenantSlug);
      toast({
        title: 'Launch wired',
        description: res.portalEmailed
          ? canStamp
            ? 'Portal issued and emailed. Tenant stamped.'
            : 'Portal issued and emailed.'
          : canStamp
            ? 'Portal issued. Tenant stamped.'
            : 'Portal issued.',
        tone: 'success',
      });
      setStep('done');
    } catch (e) {
      toast({
        title: 'Auto launch failed',
        description: e instanceof Error ? e.message : String(e),
        tone: 'danger',
      });
    }
  }

  async function handleIssuePortal() {
    if (!dealId) return;
    try {
      const res = await portalLink.mutateAsync({ dealId });
      setPortalUrl(res.url);
      storeDealPortalUrl(dealId, res.url);
      await navigator.clipboard.writeText(res.url);
      toast({ title: 'Portal link copied', description: 'Send to client for accept · pay · intake.', tone: 'success' });
    } catch (e) {
      toast({
        title: 'Portal failed',
        description: e instanceof Error ? e.message : String(e),
        tone: 'danger',
      });
    }
  }

  async function handleStamp() {
    if (!preset || !dealId) return;
    try {
      const r = await stamp.mutateAsync({
        name: tenantName.trim(),
        slug: tenantSlug.trim(),
        plan: 'trial',
        blueprint: preset.blueprintKind,
        templateId: preset.productTemplateId,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        tagline: tagline.trim() || undefined,
        primaryHex,
        studioDealId: dealId,
      });
      setStampedSlug(r.tenant.slug);
      void utils.studioDeals.byId.invalidate({ id: dealId });
      void utils.studio.listEngagements.invalidate();
      toast({ title: `${r.tenant.name} stamped`, tone: 'success' });
      setStep('done');
    } catch (e) {
      toast({
        title: 'Stamp failed',
        description: e instanceof Error ? e.message : String(e),
        tone: 'danger',
      });
    }
  }

  const busy =
    createDeal.isPending ||
    syncSchedule.isPending ||
    updateDeal.isPending ||
    portalLink.isPending ||
    stamp.isPending ||
    launchT1.isPending;

  return (
    <div className="space-y-6">
      <div className="studio-panel studio-gold-glow overflow-hidden">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Launch wizard</h2>
            <Badge variant="outline" className="text-[9px] uppercase">
              Automated path
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Any SKU tier: deal → portal → stamp (when applicable) → deploy hook → engagement workspace.
          </p>
        </div>

        <nav className="flex flex-wrap gap-1 border-b border-border/50 px-4 py-2 sm:px-6" aria-label="Wizard steps">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = s.id === step;
            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                  active && 'studio-mode-active',
                  done && !active && 'text-primary',
                  !done && !active && 'text-muted-foreground',
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Circle className={cn('h-3.5 w-3.5', active && 'fill-primary/20')} />
                )}
                {s.label}
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-6 sm:px-8 sm:py-8">
          {step === 'preset' && (
            <PresetStep selected={presetSlug} onSelect={pickPreset} />
          )}

          {step === 'deal' && preset && (
            <DealStep
              preset={preset}
              title={title}
              clientName={clientName}
              clientEmail={clientEmail}
              notes={notes}
              onTitle={setTitle}
              onClientName={(v) => {
                setClientName(v);
                if (!title) setTitle(v ? `${v} — ${preset.label}` : '');
              }}
              onClientEmail={setClientEmail}
              onNotes={setNotes}
            />
          )}

          {step === 'portal' && preset && dealId && (
            <PortalStep
              preset={preset}
              dealId={dealId}
              clientEmail={clientEmail}
              portalUrl={portalUrl}
              onIssue={handleIssuePortal}
              issuing={portalLink.isPending}
            />
          )}

          {step === 'stamp' && preset && dealId && (
            <StampStep
              preset={preset}
              tenantSlug={tenantSlug}
              tenantName={tenantName}
              ownerName={ownerName}
              ownerEmail={ownerEmail}
              primaryHex={primaryHex}
              tagline={tagline}
              previewLoading={previewStamp.isFetching}
              previewOk={previewStamp.data?.slugAvailable}
              onTenantSlug={setTenantSlug}
              onTenantName={setTenantName}
              onOwnerName={setOwnerName}
              onOwnerEmail={setOwnerEmail}
              onPrimaryHex={setPrimaryHex}
              onTagline={setTagline}
            />
          )}

          {step === 'done' && dealId && (
            <DoneStep
              dealId={dealId}
              portalUrl={portalUrl}
              stampedSlug={stampedSlug}
              deployHook={deployHook}
              presetLabel={preset?.label ?? 'Tier 1'}
            />
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={step === 'preset' || busy}
            onClick={() => {
              const prev = STEPS[stepIndex - 1];
              if (prev) setStep(prev.id);
            }}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back
          </Button>

          <div className="flex flex-wrap gap-2">
            {step === 'deal' && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || !clientName.trim() || !title.trim()}
                  onClick={() => void handleCreateDeal()}
                >
                  {createDeal.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  File deal (manual)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !clientName.trim() || !title.trim()}
                  onClick={() => void handleAutoLaunch()}
                >
                  {launchT1.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  Auto-launch (portal + stamp + deploy hook)
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {step === 'portal' && (
              <>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setStep('stamp')}>
                  Skip portal
                </Button>
                {!portalUrl ? (
                  <Button type="button" size="sm" disabled={busy} onClick={() => void handleIssuePortal()}>
                    {portalLink.isPending ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Issue portal link
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={() => setStep('stamp')}>
                    Continue to stamp
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
            {step === 'stamp' && (
              <Button
                type="button"
                size="sm"
                disabled={
                  busy ||
                  !tenantSlug.trim() ||
                  !tenantName.trim() ||
                  !ownerEmail.trim() ||
                  previewStamp.data?.slugAvailable === false
                }
                onClick={() => void handleStamp()}
              >
                {stamp.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                Stamp tenant
              </Button>
            )}
            {step === 'done' && (
              <Button type="button" size="sm" onClick={() => router.push(`/engagements/${dealId}`)}>
                Open engagement
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function PresetStep({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  const grouped = PRESET_GROUPS.map((g) => ({
    ...g,
    presets: DEAL_PRESETS.filter(g.filter),
  })).filter((g) => g.presets.length > 0);

  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-base font-semibold">Choose engagement SKU</h3>
        <p className="text-sm text-muted-foreground">
          Economics and runbook lock to this preset. Discovery and retainer skip auto-stamp.
        </p>
      </header>
      {grouped.map((group) => (
        <section key={group.title} className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.presets.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => onSelect(p.slug)}
                className={cn(
                  'studio-panel rounded-lg p-4 text-left transition-colors hover:border-primary/40',
                  selected === p.slug && 'border-primary/50 ring-1 ring-primary/30',
                )}
              >
                <p className="font-medium">{p.label}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                <p className="mt-2 text-sm font-semibold text-primary">
                  {formatMinorUnits(p.planInput.totalFeeMinorUnits, p.planInput.currency)}
                </p>
                {!presetSupportsAutoStamp(p) ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">Portal only — stamp later</p>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** @deprecated alias */
export const StudioT1LaunchWizard = StudioLaunchWizard;

function DealStep({
  preset,
  title,
  clientName,
  clientEmail,
  notes,
  onTitle,
  onClientName,
  onClientEmail,
  onNotes,
}: {
  preset: DealPresetDefinition;
  title: string;
  clientName: string;
  clientEmail: string;
  notes: string;
  onTitle: (v: string) => void;
  onClientName: (v: string) => void;
  onClientEmail: (v: string) => void;
  onNotes: (v: string) => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header>
        <h3 className="text-base font-semibold">Client & deal</h3>
        <p className="text-sm text-muted-foreground">
          Filing <strong className="text-foreground">{preset.label}</strong> at{' '}
          {formatMinorUnits(preset.planInput.totalFeeMinorUnits, preset.planInput.currency)}.
        </p>
      </header>
      <FormField label="Deal title" required>
        <Input value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Acme Dating launch" />
      </FormField>
      <FormField label="Client name" required>
        <Input value={clientName} onChange={(e) => onClientName(e.target.value)} />
      </FormField>
      <FormField label="Client email" description="Used for portal notifications and stamp owner prefill.">
        <Input type="email" value={clientEmail} onChange={(e) => onClientEmail(e.target.value)} />
      </FormField>
      <FormField label="Internal notes">
        <Textarea value={notes} onChange={(e) => onNotes(e.target.value)} rows={2} />
      </FormField>
    </div>
  );
}

function PortalStep({
  preset,
  dealId,
  clientEmail,
  portalUrl,
  onIssue,
  issuing,
}: {
  preset: DealPresetDefinition;
  dealId: string;
  clientEmail: string;
  portalUrl: string | null;
  onIssue: () => void;
  issuing: boolean;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header>
        <h3 className="text-base font-semibold">Client portal</h3>
        <p className="text-sm text-muted-foreground">
          Client accepts scope, pays kickoff
          {preset.intakeTemplateId !== 'none' ? ', completes intake' : ''} — then you stamp (or stamp now for demos).
        </p>
      </header>
      {portalUrl ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-3 pt-4">
            <p className="break-all font-mono text-[11px]">{portalUrl}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(portalUrl)}
            >
              <Copy className="mr-1 h-3.5 w-3.5" />
              Copy again
            </Button>
            {clientEmail ? (
              <p className="text-xs text-muted-foreground">Send to {clientEmail}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Button type="button" onClick={onIssue} disabled={issuing}>
          {issuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Issue portal link (copy to clipboard)
        </Button>
      )}
      <p className="text-[11px] text-muted-foreground">
        Deal ID <code className="rounded bg-muted px-1">{dealId}</code> — preset slug stored for factory runbook.
      </p>
    </div>
  );
}

function StampStep({
  preset,
  tenantSlug,
  tenantName,
  ownerName,
  ownerEmail,
  primaryHex,
  tagline,
  previewLoading,
  previewOk,
  onTenantSlug,
  onTenantName,
  onOwnerName,
  onOwnerEmail,
  onPrimaryHex,
  onTagline,
}: {
  preset: DealPresetDefinition;
  tenantSlug: string;
  tenantName: string;
  ownerName: string;
  ownerEmail: string;
  primaryHex: string;
  tagline: string;
  previewLoading: boolean;
  previewOk: boolean | undefined;
  onTenantSlug: (v: string) => void;
  onTenantName: (v: string) => void;
  onOwnerName: (v: string) => void;
  onOwnerEmail: (v: string) => void;
  onPrimaryHex: (v: string) => void;
  onTagline: (v: string) => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header>
        <h3 className="text-base font-semibold">Stamp tenant</h3>
        <p className="text-sm text-muted-foreground">
          Template <code className="text-xs">{preset.productTemplateId}</code> — products and flags from blueprint
          catalog.
        </p>
      </header>
      <FormField label="Tenant name">
        <Input value={tenantName} onChange={(e) => onTenantName(e.target.value)} />
      </FormField>
      <FormField
        label="Tenant slug"
        description={
          previewLoading
            ? 'Checking availability…'
            : previewOk === false
              ? 'Slug taken — choose another'
              : previewOk
                ? 'Slug available'
                : undefined
        }
      >
        <Input value={tenantSlug} onChange={(e) => onTenantSlug(e.target.value)} className="font-mono text-sm" />
      </FormField>
      <FormField label="Owner name">
        <Input value={ownerName} onChange={(e) => onOwnerName(e.target.value)} />
      </FormField>
      <FormField label="Owner email">
        <Input type="email" value={ownerEmail} onChange={(e) => onOwnerEmail(e.target.value)} />
      </FormField>
      <FormField label="Tagline">
        <Input value={tagline} onChange={(e) => onTagline(e.target.value)} />
      </FormField>
      <FormField label="Brand colour">
        <div className="flex gap-2">
          <input
            type="color"
            value={primaryHex}
            onChange={(e) => onPrimaryHex(e.target.value)}
            className="h-10 w-12 rounded border border-border"
          />
          <Input value={primaryHex} onChange={(e) => onPrimaryHex(e.target.value)} className="font-mono" />
        </div>
      </FormField>
    </div>
  );
}

function DoneStep({
  dealId,
  portalUrl,
  stampedSlug,
  deployHook,
  presetLabel,
}: {
  dealId: string;
  portalUrl: string | null;
  stampedSlug: string | null;
  deployHook: { secret: string; endpoint: string; curl: string } | null;
  presetLabel: string;
}) {
  const checklist = [
    { done: true, label: `${presetLabel} deal filed` },
    { done: Boolean(portalUrl), label: 'Client portal link issued' },
    { done: Boolean(stampedSlug), label: stampedSlug ? `Tenant ${stampedSlug} stamped` : 'Tenant stamped' },
    { done: false, label: 'Factory runbook — open Delivery module' },
    { done: Boolean(deployHook), label: 'Deploy hook secret ready' },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/20">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Launch path started</h3>
          <p className="text-sm text-muted-foreground">Finish runbook + deploy from the engagement workspace.</p>
        </div>
      </div>
      <ul className="space-y-2">
        {checklist.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-sm">
            {c.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={c.done ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/engagements/${dealId}?module=delivery`}>Factory runbook</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/engagements/${dealId}?module=kickoff`}>Kickoff & portal</Link>
        </Button>
        {deployHook ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(deployHook.curl)}
          >
            Copy deploy curl
          </Button>
        ) : null}
        {stampedSlug ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/build?tab=tenants`}>Tenants</Link>
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => window.location.assign('/build?tab=launch')}
        >
          Launch another
        </Button>
      </div>
    </div>
  );
}
