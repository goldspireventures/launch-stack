'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import {
  CONTACT_PAGE,
  TIER_CONTACT_PREFILL,
  type PublicEngagementTierId,
} from '@goldspire/commercial';
import { ContactSuccessPanel } from '@/components/contact-success-panel';
import { trpc } from '@/lib/trpc';
import { Eyebrow } from '@/components/ui-primitives';
import { PageFlowCallout } from '@goldspire/ui';

type BudgetBand = 'under_25k' | '25k_60k' | '60k_150k' | '150k_plus' | 'unsure';
type Timeline = 'asap' | 'within_3m' | 'within_6m' | 'exploring';

function isEngagementTier(v: string): v is PublicEngagementTierId {
  return v === 'clone' || v === 'template' || v === 'blueprint';
}

function contactMessageFromUrl(
  tier: PublicEngagementTierId | '',
  intent: string,
  sku: string,
): string {
  if (sku) return `Interested in dating delivery: ${sku.replace(/-/g, ' ')}.\n\n`;
  if (tier) return `Interested in: ${TIER_CONTACT_PREFILL[tier]}.\n\n`;
  if (intent === 'discovery') {
    return 'Interested in: Paid discovery / alignment sprint (smaller start before a full clone, template, or blueprint build).\n\n';
  }
  return '';
}

interface FormState {
  name: string;
  email: string;
  company: string;
  message: string;
  templateInterest: string;
  budgetBand: BudgetBand | '';
  timeline: Timeline | '';
  role: string;
  website: string;
  targetUsers: string;
  mustHaves: string;
  integrations: string;
  decisionOwner: string;
  timezone: string;
  preferredContact: 'email' | 'call' | '';
  honeypot: string;
}

const INITIAL: FormState = {
  name: '',
  email: '',
  company: '',
  message: '',
  templateInterest: '',
  budgetBand: '',
  timeline: '',
  role: '',
  website: '',
  targetUsers: '',
  mustHaves: '',
  integrations: '',
  decisionOwner: '',
  timezone: '',
  preferredContact: '',
  honeypot: '',
};

const BUDGET_OPTIONS: Array<{ value: BudgetBand; label: string }> = [
  { value: 'under_25k', label: 'Under €25k' },
  { value: '25k_60k', label: '€25k–€60k' },
  { value: '60k_150k', label: '€60k–€150k' },
  { value: '150k_plus', label: '€150k+' },
  { value: 'unsure', label: 'Not sure yet' },
];

const TIMELINE_OPTIONS: Array<{ value: Timeline; label: string }> = [
  { value: 'asap', label: 'ASAP' },
  { value: 'within_3m', label: 'Within 3 months' },
  { value: 'within_6m', label: 'Within 6 months' },
  { value: 'exploring', label: 'Just exploring' },
];

export default function ContactPage() {
  const params = useSearchParams();
  const presetTemplate = params?.get('template') ?? '';
  const presetTierRaw = params?.get('tier') ?? '';
  const presetTier: PublicEngagementTierId | '' = isEngagementTier(presetTierRaw) ? presetTierRaw : '';
  const presetIntent = params?.get('intent') ?? '';
  const presetSku = params?.get('sku') ?? '';
  const waitlist = (params?.get('waitlist') ?? '') === '1';

  const [form, setForm] = React.useState<FormState>(() => ({
    ...INITIAL,
    templateInterest: presetTemplate,
    message: contactMessageFromUrl(presetTier, presetIntent, presetSku),
  }));

  const [submittedId, setSubmittedId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const templateQ = trpc.marketing.templateById.useQuery(
    { id: form.templateInterest },
    { enabled: form.templateInterest.length > 0, retry: false },
  );

  const submit = trpc.marketing.submitDiscovery.useMutation({
    onSuccess: (r) => {
      setSubmittedId(r.id);
      setError(null);
    },
    onError: (e) => {
      setError(e.message);
    },
  });

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    submit.mutate({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      company: form.company.trim() || null,
      message: form.message.trim(),
      templateInterest: form.templateInterest.trim() || null,
      engagementTier: presetTier || undefined,
      deliverySku: presetSku || undefined,
      budgetBand: form.budgetBand as BudgetBand,
      timeline: form.timeline as Timeline,
      intake: {
        role: form.role.trim() || undefined,
        website: form.website.trim() || undefined,
        targetUsers: form.targetUsers.trim() || undefined,
        mustHaves: form.mustHaves
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 12),
        integrations: form.integrations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 12),
        decisionOwner: form.decisionOwner.trim() || undefined,
        timezone: form.timezone.trim() || undefined,
        preferredContact: form.preferredContact ? (form.preferredContact as 'email' | 'call') : undefined,
      },
      honeypot: form.honeypot,
      source:
        typeof document !== 'undefined'
          ? { referrer: document.referrer || undefined, intent: presetIntent || undefined }
          : presetIntent
            ? { intent: presetIntent }
            : undefined,
    });
  }

  const valid =
    form.name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.message.trim().length >= 20;

  return (
    <div>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 hero-glow opacity-50" aria-hidden />
        <div className="absolute inset-0 grid-backdrop" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pb-12 pt-20 sm:px-8 sm:pt-28">
          <Eyebrow>Contact</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            {CONTACT_PAGE.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{CONTACT_PAGE.intro}</p>
          <div className="mt-6 max-w-2xl">
            <PageFlowCallout variant="muted" focusLine={CONTACT_PAGE.flowCalloutFocus}>
              {CONTACT_PAGE.flowCalloutBody}
            </PageFlowCallout>
          </div>
          {waitlist ? (
            <div className="mt-6 max-w-2xl">
              <PageFlowCallout variant="primary" focusLine="Waitlist request">
                We’re not taking new fixed-price slots for this template right now. Send a short brief and we’ll reply
                with next availability and whether discovery makes sense in the meantime.
              </PageFlowCallout>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-32 sm:px-8 md:grid-cols-[1fr_320px]">
        <AnimatePresence mode="wait">
          {submittedId ? (
            <ContactSuccessPanel
              key="success"
              email={form.email}
              referenceId={submittedId}
              engagementTier={presetTier || undefined}
            />
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              onSubmit={onSubmit}
              className="space-y-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" required>
                  <Input
                    value={form.name}
                    onChange={(v) => patch({ name: v })}
                    placeholder="Alex Stone"
                    autoComplete="name"
                  />
                </Field>
                <Field label="Email" required>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(v) => patch({ email: v })}
                    placeholder="alex@yourcompany.com"
                    autoComplete="email"
                  />
                </Field>
              </div>

              <Field label="Company or project" hint="Optional — helps us file the thread.">
                <Input
                  value={form.company}
                  onChange={(v) => patch({ company: v })}
                  placeholder="Northline Ltd"
                  autoComplete="organization"
                />
              </Field>

              <Field
                label="The product in plain language"
                required
                hint={`Audience, geography, how you make money, what makes it different. ${form.message.length}/4000`}
              >
                <Textarea
                  value={form.message}
                  onChange={(v) => patch({ message: v.slice(0, 4000) })}
                  placeholder="We're launching a dating app for people over 40 in Ireland and the UK. Subscription plus boosts. We already have brand and a waitlist — we need a credible MVP, not a slide deck."
                  rows={7}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Budget (rough)" required hint="We'll tighten this on the call.">
                  <Select
                    value={form.budgetBand}
                    onChange={(v) => patch({ budgetBand: v as BudgetBand | '' })}
                    options={[{ value: '', label: 'Select…' }, ...BUDGET_OPTIONS]}
                  />
                </Field>
                <Field label="When do you need it live?" required>
                  <Select
                    value={form.timeline}
                    onChange={(v) => patch({ timeline: v as Timeline | '' })}
                    options={[{ value: '', label: 'Select…' }, ...TIMELINE_OPTIONS]}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your role" hint="Founder, operator, product lead, etc.">
                  <Input
                    value={form.role}
                    onChange={(v) => patch({ role: v })}
                    placeholder="Founder / Product lead"
                    autoComplete="organization-title"
                  />
                </Field>
                <Field label="Website" hint="Optional — existing site, prototype, or Notion.">
                  <Input
                    value={form.website}
                    onChange={(v) => patch({ website: v })}
                    placeholder="https://yourcompany.com"
                    inputMode="url"
                  />
                </Field>
              </div>

              <Field label="Target users" hint="Who is this for (and where)?">
                <Input
                  value={form.targetUsers}
                  onChange={(v) => patch({ targetUsers: v })}
                  placeholder="e.g. Solo founders in EU / UK"
                />
              </Field>

              <Field label="Must-have v1 features" hint="Comma-separated. What has to exist on day one?">
                <Input
                  value={form.mustHaves}
                  onChange={(v) => patch({ mustHaves: v })}
                  placeholder="Auth, payments, onboarding, admin, analytics…"
                />
              </Field>

              <Field label="Integrations" hint="Comma-separated. Only list what matters now.">
                <Input
                  value={form.integrations}
                  onChange={(v) => patch({ integrations: v })}
                  placeholder="Stripe, Calendly, HubSpot, PostHog…"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Decision owner" hint="Who signs off scope + budget?">
                  <Input
                    value={form.decisionOwner}
                    onChange={(v) => patch({ decisionOwner: v })}
                    placeholder="Name / role"
                  />
                </Field>
                <Field label="Timezone" hint="For scheduling and response expectations.">
                  <Input
                    value={form.timezone}
                    onChange={(v) => patch({ timezone: v })}
                    placeholder="e.g. Europe/Dublin"
                  />
                </Field>
              </div>

              <Field label="Preferred contact" hint="We default to email unless you prefer a call.">
                <Select
                  value={form.preferredContact}
                  onChange={(v) => patch({ preferredContact: v as 'email' | 'call' | '' })}
                  options={[
                    { value: '', label: 'Email (default)' },
                    { value: 'email', label: 'Email' },
                    { value: 'call', label: 'Call' },
                  ]}
                />
              </Field>

              {presetTier ? (
                <div className="rounded-md border border-primary/40 bg-primary/10 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {CONTACT_PAGE.tierBannerTitle}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{TIER_CONTACT_PREFILL[presetTier]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We will reflect this in our reply — you can still change direction on a call.
                  </p>
                </div>
              ) : presetIntent === 'discovery' ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 dark:bg-amber-500/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Discovery sprint
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">Paid alignment before a full build</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tell us context below — we reply with whether a short discovery engagement fits and what a fixed fee
                    would need to cover.
                  </p>
                </div>
              ) : null}

              {form.templateInterest ? (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
                  <p className="font-medium text-foreground">
                    You were looking at{' '}
                    <Link
                      href={`/templates/${encodeURIComponent(form.templateInterest)}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {templateQ.data?.name ?? form.templateInterest}
                    </Link>
                    . We&apos;ll factor that into the reply.
                  </p>
                </div>
              ) : null}

              <div className="hidden" aria-hidden>
                <label>
                  Leave blank
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.honeypot}
                    onChange={(e) => patch({ honeypot: e.target.value })}
                  />
                </label>
              </div>

              {error && (
                <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                  <p>{error}</p>
                  {error.includes('hello@goldspire.dev') ? (
                    <p className="mt-2">
                      Or email us directly:{' '}
                      <a href="mailto:hello@goldspire.dev" className="font-medium underline">
                        hello@goldspire.dev
                      </a>
                    </p>
                  ) : null}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!valid || submit.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submit.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      Send brief <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <aside>
          <div className="sticky top-24 space-y-5">
            <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
              <p className="text-sm font-medium text-foreground">What happens next</p>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                {CONTACT_PAGE.sidebarSteps.map((text, i) => (
                  <Step key={text} n={i + 1} text={text} />
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/30 p-5 text-xs text-muted-foreground">
              <p>
                Or email{' '}
                <a href="mailto:hello@goldspire.dev" className="text-primary underline-offset-2 hover:underline">
                  hello@goldspire.dev
                </a>
                .
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
        {n}
      </span>
      <span className="text-foreground/90">{text}</span>
    </li>
  );
}
