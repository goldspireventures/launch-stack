'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  PartyPopper,
  Sparkles,
} from 'lucide-react';
import { listBlueprints, type BlueprintDefinition } from '@goldspire/blueprints';
import { env } from '@goldspire/config/env';
import { useToast } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

/**
 * Tenant-stamping wizard.
 *
 * Six visual steps: Blueprint → Identity → Owner → Brand → Review → Done.
 * State stays in component memory; we don't persist to URL because a single
 * mistake (refresh on step 4) costs the operator <20s of re-typing.
 *
 * The "Review" step calls `onboarding.preview` (no writes) so we can show the
 * exact products / flags / slug-availability about to be created. The final
 * "Stamp" button calls `onboarding.stamp` and renders the success step.
 */

type Step = 'blueprint' | 'identity' | 'owner' | 'brand' | 'review' | 'done';
const STEPS: Step[] = ['blueprint', 'identity', 'owner', 'brand', 'review'];

interface WizardState {
  blueprint: BlueprintDefinition['kind'] | null;
  name: string;
  slug: string;
  plan: 'trial' | 'starter' | 'growth' | 'enterprise';
  tagline: string;
  ownerName: string;
  ownerEmail: string;
  primaryHex: string;
}

const INITIAL: WizardState = {
  blueprint: null,
  name: '',
  slug: '',
  plan: 'trial',
  tagline: '',
  ownerName: '',
  ownerEmail: '',
  primaryHex: '#7c3aed',
};

export function OnboardWizard() {
  const [step, setStep] = React.useState<Step>('blueprint');
  const [state, setState] = React.useState<WizardState>(INITIAL);
  const [stamped, setStamped] = React.useState<StampResult | null>(null);

  function patch(p: Partial<WizardState>) {
    setState((s) => ({ ...s, ...p }));
  }

  const idx = STEPS.indexOf(step);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <StepBar current={step} />
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 'blueprint' && (
              <BlueprintStep
                value={state.blueprint}
                onPick={(kind, bp) => {
                  // Pre-fill plan / tagline from blueprint defaults.
                  patch({
                    blueprint: kind,
                    tagline: state.tagline || bp.tagline,
                    plan: state.plan ?? 'trial',
                  });
                }}
              />
            )}
            {step === 'identity' && (
              <IdentityStep state={state} patch={patch} />
            )}
            {step === 'owner' && (
              <OwnerStep state={state} patch={patch} />
            )}
            {step === 'brand' && (
              <BrandStep state={state} patch={patch} />
            )}
            {step === 'review' && (
              <ReviewStep state={state} onStamped={(r) => { setStamped(r); setStep('done'); }} />
            )}
            {step === 'done' && stamped && <DoneStep result={stamped} />}
          </motion.div>
        </AnimatePresence>
      </div>
      {step !== 'done' && (
        <Footer
          state={state}
          step={step}
          onBack={() => idx > 0 && setStep(STEPS[idx - 1]!)}
          onNext={() => idx < STEPS.length - 1 && setStep(STEPS[idx + 1]!)}
        />
      )}
    </div>
  );
}

/* ─── Step bar ─────────────────────────────────────────────────────────── */

function StepBar({ current }: { current: Step }) {
  const labels: Record<Step, string> = {
    blueprint: 'Blueprint',
    identity: 'Identity',
    owner: 'Owner',
    brand: 'Brand',
    review: 'Review',
    done: 'Done',
  };
  const currentIdx = STEPS.indexOf(current === 'done' ? 'review' : current);
  return (
    <ol className="grid grid-cols-5 gap-px border-b border-border bg-border/60 text-xs">
      {STEPS.map((s, i) => {
        const done = current === 'done' || i < currentIdx;
        const active = current === s;
        return (
          <li
            key={s}
            className={`flex items-center justify-center gap-2 bg-card px-3 py-3 transition-colors ${
              active ? 'text-foreground' : done ? 'text-foreground/80' : 'text-muted-foreground'
            }`}
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold transition-colors ${
                done
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                  : active
                    ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className="hidden font-medium sm:inline">{labels[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ─── Footer ───────────────────────────────────────────────────────────── */

function Footer({
  state,
  step,
  onBack,
  onNext,
}: {
  state: WizardState;
  step: Step;
  onBack: () => void;
  onNext: () => void;
}) {
  const canAdvance = canAdvanceFrom(state, step);
  return (
    <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-3 sm:px-10">
      <button
        type="button"
        onClick={onBack}
        disabled={step === 'blueprint'}
        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
      <span className="hidden text-xs text-muted-foreground sm:inline">
        Step {STEPS.indexOf(step) + 1} of {STEPS.length}
      </span>
      {step !== 'review' && (
        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function canAdvanceFrom(s: WizardState, step: Step): boolean {
  if (step === 'blueprint') return Boolean(s.blueprint);
  if (step === 'identity') return s.name.trim().length >= 2 && /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/.test(s.slug);
  if (step === 'owner') return s.ownerName.trim().length >= 2 && /\S+@\S+\.\S+/.test(s.ownerEmail);
  if (step === 'brand') return /^#[0-9a-fA-F]{6}$/.test(s.primaryHex);
  return false;
}

/* ─── Step 1 — Blueprint ──────────────────────────────────────────────── */

function BlueprintStep({
  value,
  onPick,
}: {
  value: WizardState['blueprint'];
  onPick: (kind: BlueprintDefinition['kind'], bp: BlueprintDefinition) => void;
}) {
  const blueprints = listBlueprints();
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Pick a blueprint.</h2>
        <p className="text-sm text-muted-foreground">
          Blueprints are pre-validated app shells. They define nav, default products,
          paid entitlements, AI surfaces, and engagement scope. You can extend or
          swap things after stamping.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {blueprints.map((bp) => {
          const selected = value === bp.kind;
          return (
            <motion.button
              key={bp.kind}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPick(bp.kind, bp)}
              className={`relative flex flex-col gap-3 rounded-lg border bg-card/60 p-4 text-left transition-colors hover:bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                selected ? 'border-primary/60 ring-2 ring-primary/40' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className="h-6 w-6 rounded-md"
                  style={{ background: bp.accent }}
                  aria-hidden
                />
                {selected && <Check className="h-4 w-4 text-primary" />}
              </div>
              <div>
                <p className="font-medium">{bp.name}</p>
                <p className="text-xs text-muted-foreground">{bp.tagline}</p>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5">
                  {bp.maturity}
                </span>
                <span className="rounded border border-border bg-muted/30 px-1.5 py-0.5">
                  {bp.estimatedWeeks.min}-{bp.estimatedWeeks.max}w
                </span>
                <span className="rounded border border-border bg-muted/30 px-1.5 py-0.5">
                  {bp.entitlementKeys.length} entitlements
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 2 — Identity ──────────────────────────────────────────────── */

function IdentityStep({
  state,
  patch,
}: {
  state: WizardState;
  patch: (p: Partial<WizardState>) => void;
}) {
  // Auto-derive slug from name on first type. Operator can override.
  function setName(v: string) {
    patch({
      name: v,
      slug: state.slug && state.slug !== slugify(state.name) ? state.slug : slugify(v),
    });
  }
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Name the tenant.</h2>
        <p className="text-sm text-muted-foreground">
          This is what operators see in the Console; the slug becomes part of
          URLs and routing.
        </p>
      </header>
      <Field label="Tenant name" hint="e.g. Heartline, Nova Care, Bazaar">
        <input
          value={state.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Co"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </Field>
      <Field label="Slug" hint="lowercase letters, digits, dashes — used in URLs">
        <div className="flex items-center rounded-md border border-border bg-background pr-3">
          <input
            value={state.slug}
            onChange={(e) => patch({ slug: e.target.value })}
            placeholder="acme"
            className="flex-1 bg-transparent px-3 py-2 font-mono text-sm outline-none"
          />
          <span className="text-xs text-muted-foreground">.goldspire.app</span>
        </div>
      </Field>
      <Field label="Plan" hint="The commercial tier they're starting on">
        <select
          value={state.plan}
          onChange={(e) => patch({ plan: e.target.value as WizardState['plan'] })}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="trial">Trial · 30 days</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </Field>
      <Field label="Tagline" hint="One-liner shown on dashboards. Optional.">
        <input
          value={state.tagline}
          onChange={(e) => patch({ tagline: e.target.value })}
          placeholder="The dating app that listens."
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </Field>
    </div>
  );
}

/* ─── Step 3 — Owner ─────────────────────────────────────────────────── */

function OwnerStep({
  state,
  patch,
}: {
  state: WizardState;
  patch: (p: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Who owns this tenant?</h2>
        <p className="text-sm text-muted-foreground">
          The first user — TENANT_OWNER role. They'll be the only person who
          can change billing and invite others until they delegate. (Studio
          operators can always step in.)
        </p>
      </header>
      <Field label="Full name">
        <input
          value={state.ownerName}
          onChange={(e) => patch({ ownerName: e.target.value })}
          placeholder="Alex Stone"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={state.ownerEmail}
          onChange={(e) => patch({ ownerEmail: e.target.value })}
          placeholder="alex@example.com"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </Field>
    </div>
  );
}

/* ─── Step 4 — Brand ─────────────────────────────────────────────────── */

function BrandStep({
  state,
  patch,
}: {
  state: WizardState;
  patch: (p: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Pick a brand colour.</h2>
        <p className="text-sm text-muted-foreground">
          The primary accent that runs through the tenant's product. Operators
          can refine this later in Admin → Settings → Branding.
        </p>
      </header>
      <Field label="Primary colour" hint="Hex code">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={state.primaryHex}
            onChange={(e) => patch({ primaryHex: e.target.value })}
            className="h-10 w-12 cursor-pointer rounded-md border border-border bg-background"
          />
          <input
            value={state.primaryHex}
            onChange={(e) => patch({ primaryHex: e.target.value })}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </Field>
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Preview</p>
        <div
          className="rounded-lg border border-border bg-card/60 p-4"
          style={{ ['--accent' as string]: state.primaryHex }}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md" style={{ background: state.primaryHex }} />
            <div>
              <p className="text-sm font-semibold">{state.name || 'Tenant name'}</p>
              <p className="text-xs text-muted-foreground">{state.tagline || 'Tagline goes here.'}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ background: state.primaryHex }}
            >
              Primary button
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs">
              Secondary
            </span>
            <span
              className="rounded-full border px-2.5 py-0.5 text-xs"
              style={{ borderColor: state.primaryHex, color: state.primaryHex }}
            >
              Outline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 5 — Review & Stamp ────────────────────────────────────────── */

interface StampResult {
  tenant: { id: string; slug: string; name: string; plan: string };
  owner: { id: string; email: string; name: string | null };
  products: { id: string; name: string }[];
  flagOverridesCount: number;
}

function ReviewStep({
  state,
  onStamped,
}: {
  state: WizardState;
  onStamped: (r: StampResult) => void;
}) {
  const { toast } = useToast();
  const preview = trpc.onboarding.preview.useQuery(
    {
      name: state.name,
      slug: state.slug,
      plan: state.plan,
      blueprint: state.blueprint!,
      ownerName: state.ownerName,
      ownerEmail: state.ownerEmail,
      tagline: state.tagline || undefined,
      primaryHex: state.primaryHex,
    },
    { enabled: Boolean(state.blueprint), staleTime: 0 },
  );
  const stamp = trpc.onboarding.stamp.useMutation({
    onSuccess: (r) => {
      toast({ title: `${r.tenant.name} is live`, tone: 'success' });
      onStamped(r);
    },
    onError: (e) => {
      toast({ title: 'Could not stamp tenant', description: e.message, tone: 'danger' });
    },
  });

  function commit() {
    stamp.mutate({
      name: state.name,
      slug: state.slug,
      plan: state.plan,
      blueprint: state.blueprint!,
      ownerName: state.ownerName,
      ownerEmail: state.ownerEmail,
      tagline: state.tagline || undefined,
      primaryHex: state.primaryHex,
    });
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Review the stamp.</h2>
        <p className="text-sm text-muted-foreground">
          Nothing is created until you click Stamp. Everything below happens in a
          single transaction.
        </p>
      </header>

      {preview.isLoading && (
        <div className="rounded-md border border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          <p className="mt-2">Building preview…</p>
        </div>
      )}

      {preview.data && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ReviewCard title="Tenant" rows={[
            ['Name', state.name],
            ['Slug', state.slug + (preview.data.slugAvailable ? ' ✓' : ' (unavailable)')],
            ['Plan', state.plan],
            ['Blueprint', preview.data.blueprint.name],
          ]} />
          <ReviewCard title="Owner" rows={[
            ['Name', state.ownerName],
            ['Email', state.ownerEmail],
            ['Role', preview.data.ownerWillBe.role],
          ]} />
          <ReviewCard title="Products to provision" rows={
            preview.data.productsToCreate.map((p) => [p.name, p.slug] as const)
          } />
          <ReviewCard title="Feature flag overrides" rows={
            preview.data.flagOverrides.length === 0
              ? [['None', 'no overrides for this blueprint']]
              : preview.data.flagOverrides.map((f) => [
                  f.key,
                  f.enabled ? 'enabled' : `${f.numericValue ?? '—'}`,
                ] as const)
          } />
        </div>
      )}

      {preview.error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {preview.error.message}
        </div>
      )}

      <button
        type="button"
        onClick={commit}
        disabled={stamp.isPending || !preview.data?.slugAvailable}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {stamp.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Stamping…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Stamp tenant
          </>
        )}
      </button>
    </div>
  );
}

function ReviewCard({ title, rows }: { title: string; rows: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-4">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <li key={k} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{k}</span>
            <span className="truncate text-right font-medium">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Step 6 — Done ──────────────────────────────────────────────────── */

function DoneStep({ result }: { result: StampResult }) {
  const adminDeepLink = `${env.NEXT_PUBLIC_ADMIN_URL}/api/active-tenant?slug=${result.tenant.slug}&next=/dashboard`;
  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/40"
      >
        <PartyPopper className="h-7 w-7 text-emerald-300" />
      </motion.div>
      <header>
        <h2 className="text-2xl font-semibold">{result.tenant.name} is live.</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          The tenant, its owner, default products, and an audit trail are all in the database.
          Reach out to {result.owner.email} with the invite, or operate on their behalf.
        </p>
      </header>
      <div className="grid gap-3 text-left sm:grid-cols-3">
        <Summary label="Tenant" value={result.tenant.slug} />
        <Summary label="Products" value={String(result.products.length)} />
        <Summary label="Flag overrides" value={String(result.flagOverridesCount)} />
      </div>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <a
          href={adminDeepLink}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open in Admin <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <a
          href={`/tenants/${result.tenant.id}`}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-4 py-2 text-sm font-medium hover:bg-card"
        >
          View in Console
        </a>
        <a
          href="/onboard"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-4 py-2 text-sm font-medium hover:bg-card"
        >
          Stamp another
        </a>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-3 text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm">{value}</p>
    </div>
  );
}

/* ─── tiny field wrapper ─────────────────────────────────────────────── */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

void Circle;
void CheckCircle2;
