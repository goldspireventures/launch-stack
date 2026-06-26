'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { PRICING_PAGE, PRICING_SECTION } from '@goldspire/commercial';
import { CTAButton, Eyebrow } from './ui-primitives';
import { trpc } from '@/lib/trpc';

/** Public engagement tiers — `marketing.engagementTiers` (commercial + Studio overrides). */
export function ThreeTierPricing() {
  const q = trpc.marketing.engagementTiers.useQuery();
  const tiers = q.data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">
      <div className="max-w-3xl">
        <Eyebrow>{PRICING_PAGE.pricingSectionEyebrow}</Eyebrow>
        <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          {PRICING_SECTION.title}
        </h2>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">{PRICING_SECTION.subcopy}</p>
        <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {PRICING_SECTION.scopeNote}{' '}
          <a href={PRICING_SECTION.scopeLinkHref} className="text-primary underline-offset-2 hover:underline">
            {PRICING_SECTION.scopeLinkLabel}
          </a>
          .{' '}
          <a href={PRICING_SECTION.scopeLayersLinkHref} className="text-primary underline-offset-2 hover:underline">
            {PRICING_SECTION.scopeLayersLinkLabel}
          </a>
          .
        </p>
      </div>

      {q.isLoading ? (
        <p className="mt-12 text-sm text-muted-foreground">Loading pricing…</p>
      ) : (
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {tiers.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={`group relative flex flex-col rounded-2xl border p-6 transition ${
                t.featured
                  ? 'border-primary/40 bg-gradient-to-b from-primary/10 to-transparent ring-1 ring-primary/30'
                  : 'border-border/60 bg-card/30 hover:bg-card/50'
              }`}
            >
              {t.featuredBadge ? (
                <span className="absolute -top-2.5 left-6 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  {t.featuredBadge}
                </span>
              ) : null}
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.eyebrow}
              </div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">{t.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t.blurb}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{t.startsAtLabel}</span>
                <span className="text-xs text-muted-foreground">from</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.weeksLabel}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-foreground/90">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 pt-5">
                <CTAButton
                  href={`/contact?tier=${t.contactTier}`}
                  variant={t.featured ? 'primary' : 'secondary'}
                  className="w-full justify-center"
                >
                  {t.id === 'clone'
                    ? 'Start a clone'
                    : t.id === 'template'
                      ? 'Start a template'
                      : 'Start a blueprint'}
                </CTAButton>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
