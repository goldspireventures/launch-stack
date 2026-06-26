'use client';

import { motion } from 'framer-motion';
import { HOME_CLOSING } from '@goldspire/commercial';
import { CTAButton } from './ui-primitives';

export function ClosingCTA() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 via-card/20 to-card/10 p-10 sm:p-14"
      >
        <div className="absolute inset-0 hero-glow opacity-60" aria-hidden />
        <div className="relative max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {HOME_CLOSING.title}
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">{HOME_CLOSING.blurb}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <CTAButton href="/contact">{HOME_CLOSING.primaryCta}</CTAButton>
            <CTAButton href="/how-we-work" variant="secondary">
              {HOME_CLOSING.secondaryCta}
            </CTAButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
