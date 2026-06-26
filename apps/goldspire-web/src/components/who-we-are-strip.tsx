'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { STUDIO_MISSION_V0, STUDIO_OFFER_LADDER_V0 } from '@goldspire/commercial';
import { ArrowUpRight } from 'lucide-react';
import { Eyebrow } from './ui-primitives';

/**
 * Homepage clarity block — who Goldspire is and what we sell (not buried in /pricing).
 */
export function WhoWeAreStrip() {
  return (
    <section className="relative border-y border-border/60 bg-card/20">
      <div className="absolute inset-0 hero-glow opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:px-8 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Eyebrow>Who we are</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {STUDIO_MISSION_V0.headline}
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{STUDIO_MISSION_V0.body}</p>
          <Link
            href="/how-we-work"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            How we work
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {STUDIO_OFFER_LADDER_V0.slice(0, 5).map((tier) => (
            <div
              key={tier.tier}
              className="rounded-2xl border border-border/70 bg-background/40 p-4 transition hover:border-primary/35"
            >
              <p className="text-sm font-semibold text-foreground">{tier.tier}</p>
              <p className="mt-1 text-lg font-semibold text-primary">{tier.fromLabel}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{tier.includes}</p>
            </div>
          ))}
        </motion.div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Full tiers and scope boundaries on{' '}
          <Link href="/pricing" className="font-medium text-primary hover:underline">
            Pricing
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
