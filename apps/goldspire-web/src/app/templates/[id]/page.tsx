'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Coins,
  Sparkles,
} from 'lucide-react';
import { formatTemplatePriceCents, templatePanelIcon } from '@goldspire/template-kit';
import { TEMPLATES_PAGE, isShippedCloneTemplate, DATING_PRODUCT_TEMPLATE_ID } from '@goldspire/commercial';
import { trpc } from '@/lib/trpc';
import { CTAButton, Eyebrow, OfferingTierPill, StatusPill } from '@/components/ui-primitives';
import { TemplateDemoLinks } from '@/components/template-demo-links';

function iconFor(name: string) {
  return templatePanelIcon(name);
}

function formatCents(cents: number): string {
  return formatTemplatePriceCents(cents, 'EUR', 'de-DE');
}

export default function TemplateDetailPage() {
  const params = useParams();
  const rawId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const id = rawId ? decodeURIComponent(rawId) : '';

  const q = trpc.marketing.templateById.useQuery({ id }, { enabled: id.length > 0, retry: false });

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
        <div className="h-96 animate-pulse rounded-2xl border border-border/40 bg-muted/20" />
      </div>
    );
  }
  if (q.error || !q.data) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
        <p className="text-sm text-muted-foreground">
          Template not found. <Link href="/templates" className="text-primary underline-offset-2 hover:underline">Browse all templates</Link>.
        </p>
      </div>
    );
  }

  const t = q.data;
  const Icon = iconFor(t.brand.iconName);
  const accent = t.brand.accentHex;
  const isShipped = t.status === 'shipped';
  const waitlisted = isShipped && !t.acceptingNewClones;

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at top, ${accent}26, transparent 55%)`,
          }}
          aria-hidden
        />
        <div className="absolute inset-0 grid-backdrop opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pb-12 pt-20 sm:px-8 sm:pt-28">
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            All templates
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mt-5 grid gap-8 md:grid-cols-[1fr_auto] md:items-start"
          >
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${accent}22`, color: accent }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isShippedCloneTemplate(t.id) ? (
                    <OfferingTierPill tier="tier1_clone" />
                  ) : t.status === 'shipped' ? (
                    <OfferingTierPill tier="reference_demo" />
                  ) : null}
                  <StatusPill status={t.status} />
                </div>
              </div>
              <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                {t.name}
              </h1>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                {waitlisted
                  ? 'We are not taking new fixed-price clone builds for this template right now. Join the waitlist and we will reach out when a slot opens.'
                  : t.tagline}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {waitlisted ? (
                  <CTAButton href={`/contact?template=${encodeURIComponent(t.id)}&waitlist=1`}>
                    Join the waitlist
                  </CTAButton>
                ) : isShipped ? (
                  <CTAButton href={`/contact?template=${encodeURIComponent(t.id)}`}>
                    Start a {t.name.toLowerCase()} project
                  </CTAButton>
                ) : (
                  <CTAButton href={`/contact?template=${encodeURIComponent(t.id)}`}>
                    Tell us you want this template
                  </CTAButton>
                )}
                <CTAButton href="/templates" variant="ghost">
                  Browse other templates
                </CTAButton>
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3 md:justify-self-end">
              <div className="grid w-full gap-3 sm:grid-cols-2 md:grid-cols-1 md:gap-2">
                <Stat
                  icon={Coins}
                  label="Starts at"
                  value={formatCents(t.pricing.startsAtPriceCents)}
                />
                <Stat
                  icon={Clock}
                  label="Typical build"
                  value={`${t.pricing.typicalWeeks.min}–${t.pricing.typicalWeeks.max} weeks`}
                />
                <Stat
                  icon={Sparkles}
                  label="Effort vs baseline"
                  value={`×${t.pricing.effortMultiplier.toFixed(2)}`}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Description */}
      <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <Eyebrow>What this template is</Eyebrow>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {t.description}
            </p>

            {t.id === DATING_PRODUCT_TEMPLATE_ID && q.data.deliverySkus && q.data.deliverySkus.length > 0 ? (
              <motion.div
                className="mt-10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  {TEMPLATES_PAGE.datingDeliverySkusTitle}
                </h3>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {TEMPLATES_PAGE.datingDeliverySkusLead}
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {q.data.deliverySkus.map((sku) => (
                    <li
                      key={sku.id}
                      className={`rounded-xl border p-4 ${sku.featured ? 'border-primary/40 bg-primary/[0.04]' : 'border-border/60 bg-card/30'}`}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                      >
                        <motion.div
                          className="flex flex-wrap items-center justify-between gap-2"
                          initial={false}
                        >
                          <p className="font-semibold text-foreground">{sku.label}</p>
                          <p className="text-sm font-medium text-primary">{sku.priceLabel}</p>
                        </motion.div>
                        <p className="mt-1 text-xs text-muted-foreground">{sku.weeksLabel}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{sku.description}</p>
                        <Link
                          href={sku.contactHref}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary"
                        >
                          Start brief <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </motion.div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : null}

            {t.useCases.length > 0 && (
              <div className="mt-10">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  Use cases
                </h3>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {t.useCases.map((u) => (
                    <li
                      key={u}
                      className="flex items-start gap-2 rounded-md border border-border/60 bg-card/30 p-3 text-sm"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {u}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {t.heroScreens.length > 0 && (
              <div className="mt-10">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  Hero screens we ship
                </h3>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {t.heroScreens.map((s) => (
                    <li
                      key={s}
                      className="rounded-md border border-border/60 bg-card/30 p-3 text-sm"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="md:col-span-1">
            <div className="sticky top-24 space-y-6">
              {isShipped ? <TemplateDemoLinks templateId={t.id} /> : null}
              <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {TEMPLATES_PAGE.templateDetailSidebarTitle}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {TEMPLATES_PAGE.templateDetailSidebarBody}
                </p>
                <Link
                  href={`/contact?template=${encodeURIComponent(t.id)}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
                >
                  Start a brief <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
