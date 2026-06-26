'use client';

import { motion } from 'framer-motion';
import { HOME_HERO } from '@goldspire/commercial';
import { CTAButton, Eyebrow } from './ui-primitives';

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 hero-glow" aria-hidden />
      <div className="absolute inset-0 grid-backdrop" aria-hidden />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start px-6 pb-24 pt-24 sm:px-8 sm:pt-32 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <Eyebrow>{HOME_HERO.eyebrow}</Eyebrow>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            {HOME_HERO.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {HOME_HERO.subcopy}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <CTAButton href="/contact">{HOME_HERO.primaryCta}</CTAButton>
            <CTAButton href="/templates" variant="secondary">
              {HOME_HERO.secondaryCta}
            </CTAButton>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 grid w-full max-w-3xl grid-cols-2 gap-x-8 gap-y-4 text-sm md:max-w-4xl md:grid-cols-3"
        >
          {HOME_HERO.proofPoints.map((p) => (
            <Promise key={p.label} label={p.label} sub={p.sub} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function Promise({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="border-l border-border/50 pl-4">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground sm:text-sm">{sub}</p>
    </div>
  );
}
