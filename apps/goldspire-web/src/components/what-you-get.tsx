'use client';

import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import { CreditCard } from 'lucide-react';
import {
  Boxes,
  Database,
  Eye,
  Globe,
  Layers,
  ShieldCheck,
  Smartphone,
  Workflow,
} from 'lucide-react';
import { WHAT_YOU_GET } from '@goldspire/commercial';
import { Eyebrow } from './ui-primitives';

const FEATURE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  data: Database,
  web: Globe,
  mobile: Smartphone,
  auth: ShieldCheck,
  billing: CreditCard,
  admin: Layers,
  observability: Eye,
  handover: Boxes,
};

export function WhatYouGet() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">
      <div className="max-w-3xl">
        <Eyebrow>{WHAT_YOU_GET.eyebrow}</Eyebrow>
        <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          {WHAT_YOU_GET.title}
        </h2>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">{WHAT_YOU_GET.intro}</p>
      </div>

      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {WHAT_YOU_GET.features.map((f, i) => {
          const Icon = FEATURE_ICONS[f.id] ?? Workflow;
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="rounded-xl border border-border/60 bg-card/30 p-5 transition hover:bg-card/60"
            >
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
