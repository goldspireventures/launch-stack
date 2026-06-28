'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
import {
  CONTACT_SUCCESS,
  contactSuccessTierNote,
  type PublicEngagementTierId,
} from '@goldspire/commercial';
import { CTAButton } from './ui-primitives';
import { CATALOG_DEMO_APPS } from '@goldspire/config/catalog-demo-urls';
import { catalogDemoUrl, discoveryCallUrl, salesDemoPortalUrl } from '@/lib/public-demo-links';
import { trpc } from '@/lib/trpc';

export function ContactSuccessPanel({
  email,
  referenceId,
  engagementTier,
}: {
  email: string;
  referenceId: string;
  engagementTier?: PublicEngagementTierId;
}) {
  const tiersQ = trpc.marketing.engagementTiers.useQuery();
  const tierView = engagementTier ? tiersQ.data?.find((t) => t.id === engagementTier) : null;

  const callUrl = discoveryCallUrl();
  const hub = salesDemoPortalUrl();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-8"
    >
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card/40 to-primary/5 p-8 sm:p-10">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
          </div>
          <p className="mt-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {CONTACT_SUCCESS.queueLabel}
          </p>
          <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            {CONTACT_SUCCESS.title}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {tierView ? (
              contactSuccessTierNote(tierView.name, tierView.weeksLabel, tierView.startsAtLabel)
            ) : (
              <>
                {CONTACT_SUCCESS.defaultBody} Reply to{' '}
                <span className="text-foreground">{email}</span>.
              </>
            )}
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Reference {referenceId.slice(0, 12)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/30 p-6 sm:p-8">
        <p className="text-sm font-medium text-foreground">What happens next</p>
        <ol className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          {CONTACT_SUCCESS.steps.map((step) => (
            <li key={step.when}>
              <span className="font-medium text-foreground">{step.when}.</span> {step.text}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/5 to-transparent p-6 sm:p-8">
        <p className="text-sm font-medium text-foreground">{CONTACT_SUCCESS.peekTitle}</p>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">{CONTACT_SUCCESS.peekIntro}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOG_DEMO_APPS.flatMap((app) => {
            const href = catalogDemoUrl(app.id);
            if (!href) return [];
            return (
              <motion.a
                key={app.id}
                href={href}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -2 }}
              className="group flex flex-col rounded-xl border border-border/60 bg-background/60 p-4 transition hover:border-primary/40 hover:bg-background"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">{app.label}</span>
              <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                Open demo
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </span>
              <span className="mt-2 text-xs leading-relaxed text-muted-foreground">{app.tagline}</span>
            </motion.a>
            );
          })}
          {hub ? (
            <motion.a
              href={hub}
              target="_blank"
              rel="noreferrer"
              whileHover={{ y: -2 }}
              className="group flex flex-col rounded-xl border border-primary/30 bg-primary/5 p-4 transition hover:border-primary/50"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {CONTACT_SUCCESS.demoHubTitle}
              </span>
              <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                Open demo hub
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </span>
              <span className="mt-2 text-xs leading-relaxed text-muted-foreground">{CONTACT_SUCCESS.demoHubBlurb}</span>
            </motion.a>
          ) : null}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {callUrl ? (
            <CTAButton href={callUrl} variant="secondary">
              Book a call
            </CTAButton>
          ) : null}
          <CTAButton href="/templates" variant="ghost">
            Browse templates
          </CTAButton>
        </div>
      </div>
    </motion.div>
  );
}
