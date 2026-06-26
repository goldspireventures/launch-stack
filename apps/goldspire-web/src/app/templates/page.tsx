'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Filter } from 'lucide-react';
import { TEMPLATES_PAGE, isShippedCloneTemplate } from '@goldspire/commercial';
import { formatTemplatePriceCents, templatePanelIcon } from '@goldspire/template-kit';
import { trpc } from '@/lib/trpc';
import { CTAButton, Eyebrow, OfferingTierPill, StatusPill } from '@/components/ui-primitives';

function iconFor(name: string) {
  return templatePanelIcon(name);
}

function formatCents(cents: number): string {
  return formatTemplatePriceCents(cents, 'EUR', 'de-DE');
}

type StatusFilter = 'all' | 'shipped' | 'beta';

export default function TemplatesIndexPage() {
  const q = trpc.marketing.templates.useQuery();
  const [filter, setFilter] = React.useState<StatusFilter>('all');

  const all = q.data ?? [];
  const filtered = all.filter((t) => (filter === 'all' ? true : t.status === filter));

  const shippedCount = all.filter((t) => t.status === 'shipped').length;
  const betaCount = all.filter((t) => t.status === 'beta').length;

  return (
    <div className="relative">
      <div className="absolute inset-0 hero-glow opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 sm:px-8 sm:pt-28">
        <Eyebrow>Templates</Eyebrow>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          {TEMPLATES_PAGE.heroTitle}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {TEMPLATES_PAGE.heroLead}{' '}
          <Link href={TEMPLATES_PAGE.scopeLinkHref} className="text-primary underline-offset-2 hover:underline">
            {TEMPLATES_PAGE.scopeLinkLabel}
          </Link>{' '}
          {TEMPLATES_PAGE.heroScopeSuffix}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card/30 p-1">
            {(['all', 'shipped', 'beta'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`rounded-sm px-3 py-1 text-xs font-medium capitalize transition ${
                  filter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3 w-3" />
            {shippedCount} shipped · {betaCount} beta
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-32 sm:px-8">
        {q.isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-2xl border border-border/40 bg-muted/20"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-border/60 bg-card/30 p-8 text-center text-sm text-muted-foreground">
            No templates match the current filter.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t, i) => {
              const Icon = iconFor(t.brand.iconName);
              const accent = t.brand.accentHex;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.05 }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/30 transition hover:bg-card/60"
                >
                  <div className="h-1.5 w-full" style={{ backgroundColor: accent }} aria-hidden />
                  <div className="flex flex-1 flex-col gap-4 p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${accent}22`, color: accent }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {isShippedCloneTemplate(t.id) ? (
                          <OfferingTierPill tier="tier1_clone" />
                        ) : t.status === 'shipped' ? (
                          <OfferingTierPill tier="reference_demo" />
                        ) : null}
                        <StatusPill status={t.status} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight">{t.name}</h2>
                      <p className="mt-1.5 text-sm text-muted-foreground">{t.tagline}</p>
                    </div>
                    {t.useCases.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {t.useCases.slice(0, 3).map((u) => (
                          <span
                            key={u}
                            className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-muted-foreground"
                          >
                            {u}
                          </span>
                        ))}
                        {t.useCases.length > 3 && (
                          <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-muted-foreground">
                            +{t.useCases.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        From{' '}
                        <span className="text-foreground">
                          {formatCents(t.pricing.startsAtPriceCents)}
                        </span>
                      </span>
                      <span>
                        {t.pricing.typicalWeeks.min}–{t.pricing.typicalWeeks.max} wks
                      </span>
                    </div>
                    <Link
                      href={`/templates/${encodeURIComponent(t.id)}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary transition group-hover:gap-2"
                    >
                      View template <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-24 sm:px-8">
        <div className="rounded-2xl border border-border/60 bg-card/30 p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Don&apos;t see your shape?
          </p>
          <h3 className="mt-3 max-w-2xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            We invent new templates inside existing blueprints — or build a whole new blueprint.
          </h3>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Either of those is a real engagement type. Pricing scales with how much we&apos;re
            inventing for you, not by the hour.
          </p>
          <div className="mt-5">
            <CTAButton href="/contact">Start a discovery</CTAButton>
          </div>
        </div>
      </div>
    </div>
  );
}
