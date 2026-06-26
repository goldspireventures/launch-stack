'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, GraduationCap, Heart, LayoutTemplate } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { HOME_TEMPLATE_TEASER } from '@goldspire/commercial';
import { formatMinorUnits } from '@goldspire/commercial/format-currency';
import { CTAButton, Eyebrow, StatusPill } from './ui-primitives';

const ICON_FOR_TEMPLATE: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  'graduation-cap': GraduationCap,
};

function iconFor(name: string) {
  return ICON_FOR_TEMPLATE[name] ?? LayoutTemplate;
}

function formatCents(cents: number, currency = 'EUR'): string {
  return formatMinorUnits(Math.round(cents), currency);
}

export function TemplateTeaser() {
  const q = trpc.marketing.templates.useQuery();
  const templates = q.data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <Eyebrow>{HOME_TEMPLATE_TEASER.eyebrow}</Eyebrow>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {HOME_TEMPLATE_TEASER.title}
          </h2>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">{HOME_TEMPLATE_TEASER.blurb}</p>
        </div>
        <CTAButton href="/templates" variant="ghost">
          {HOME_TEMPLATE_TEASER.cta}
        </CTAButton>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {q.isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-border/40 bg-muted/20"
              />
            ))
          : templates.map((t, i) => {
              const Icon = iconFor(t.brand.iconName);
              const accent = t.brand.accentHex;
              const waitlisted = t.status === 'shipped' && !t.acceptingNewClones;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/30 transition hover:bg-card/60"
                >
                  <div className="h-1.5 w-full" style={{ backgroundColor: accent }} aria-hidden />
                  <div className="flex flex-1 flex-col gap-4 p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${accent}22`, color: accent }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <StatusPill status={t.status} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{t.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        From <span className="text-foreground">{formatCents(t.pricing.startsAtPriceCents)}</span>
                      </span>
                      <span>
                        {t.pricing.typicalWeeks.min}–{t.pricing.typicalWeeks.max} wks
                      </span>
                    </div>
                    <Link
                      href={
                        waitlisted
                          ? `/contact?template=${encodeURIComponent(t.id)}&waitlist=1`
                          : `/templates/${encodeURIComponent(t.id)}`
                      }
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary transition group-hover:gap-2"
                    >
                      {waitlisted ? 'Join waitlist' : 'Read template'}{' '}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
      </div>
    </div>
  );
}
