'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink, Play } from 'lucide-react';
import { CATALOG_DEMO_APPS } from '@goldspire/config/catalog-demo-urls';
import { STUDIO_LIVE_DEMOS, isShippedCloneTemplate } from '@goldspire/commercial';
import { OfferingTierPill } from './ui-primitives';
import { catalogDemoUrl, salesDemoPortalUrl } from '@/lib/public-demo-links';
import { Eyebrow } from './ui-primitives';

export function StudioLiveDemos() {
  const portal = salesDemoPortalUrl();

  return (
    <section className="border-y border-border/50 bg-muted/10 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <Eyebrow>{STUDIO_LIVE_DEMOS.eyebrow}</Eyebrow>
        <h2 className="mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {STUDIO_LIVE_DEMOS.title}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {STUDIO_LIVE_DEMOS.lead}
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOG_DEMO_APPS.map((app, i) => {
            const href = catalogDemoUrl(app.id);
            return (
              <motion.a
                key={app.id}
                href={href}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="group flex flex-col rounded-2xl border border-border/60 bg-card/40 p-5 transition hover:border-primary/40 hover:bg-card/70"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <OfferingTierPill
                    tier={isShippedCloneTemplate(app.templateId) ? 'tier1_clone' : 'reference_demo'}
                  />
                </span>
                <span className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Play className="h-4 w-4 text-primary" aria-hidden />
                  {app.label}
                  <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-0 transition group-hover:opacity-70" />
                </span>
                <span className="mt-1 text-xs text-muted-foreground">{app.tagline}</span>
              </motion.a>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          {STUDIO_LIVE_DEMOS.portalNote}{' '}
          <Link
            href={portal}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Open sample project hub
            <ExternalLink className="ml-0.5 inline h-3.5 w-3.5" />
          </Link>
        </p>
      </div>
    </section>
  );
}
