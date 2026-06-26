'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Check, HelpCircle, Shield, Smartphone, Store, UserCircle } from 'lucide-react';
import { ENGAGEMENT_SCOPE } from '@goldspire/commercial';
import { Eyebrow } from '@/components/ui-primitives';

const STORE_ROWS: readonly {
  icon: React.ComponentType<{ className?: string }>;
  who: string;
  task: string;
}[] = [
  { icon: UserCircle, who: 'Client', task: 'Apple Developer Program enrolment (paid) & legal entity on record.' },
  { icon: UserCircle, who: 'Client', task: 'Google Play Console account & merchant / tax profile if selling in-app.' },
  { icon: UserCircle, who: 'Client', task: 'Privacy policy & support URL live (stores require URLs).' },
  { icon: Shield, who: 'Shared', task: 'App Store Connect + Play Console access for Goldspire as agreed (min access to ship).' },
  { icon: Smartphone, who: 'Studio', task: 'Builds, signing config, TestFlight / internal testing, submission drafts when mobile is in scope.' },
  { icon: Store, who: 'Studio', task: 'Respond to review questions with you in the loop — we do not control approval timelines.' },
  { icon: HelpCircle, who: 'Either', task: 'Screenshots, promo text, age rating questionnaire — we draft from the product; you approve copy.' },
];

const SCOPE_HREF = `/how-we-work#${ENGAGEMENT_SCOPE.anchorId}`;

/** Before you sign — boundaries for /how-we-work. */
export function EngagementReadinessSection() {
  return (
    <section id={ENGAGEMENT_SCOPE.anchorId} className="scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-6xl px-6 pb-16 sm:px-8"
      >
        <Eyebrow>{ENGAGEMENT_SCOPE.eyebrow}</Eyebrow>
        <h2 className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {ENGAGEMENT_SCOPE.title}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {ENGAGEMENT_SCOPE.intro}
        </p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-10 grid gap-5 lg:grid-cols-3"
        >
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {ENGAGEMENT_SCOPE.alwaysEyebrow}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-foreground/90">
              {ENGAGEMENT_SCOPE.always.map((line) => (
                <li key={line} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-6"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              {ENGAGEMENT_SCOPE.conditionalEyebrow}
            </p>
            <ul className="mt-4 space-y-4">
              {ENGAGEMENT_SCOPE.conditional.map((item) => (
                <li key={item.title}>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-border/80 bg-muted/20 p-6"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {ENGAGEMENT_SCOPE.neverEyebrow}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {ENGAGEMENT_SCOPE.never.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground/80">—</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        <details
          id="app-store-accounts"
          className="mt-14 scroll-mt-24 rounded-2xl border border-border/60 bg-card/30 p-6 sm:p-8"
        >
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <Eyebrow>{ENGAGEMENT_SCOPE.appStoresEyebrow}</Eyebrow>
            <h3 className="mt-3 text-xl font-semibold tracking-tight">{ENGAGEMENT_SCOPE.appStoresTitle}</h3>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{ENGAGEMENT_SCOPE.appStoresIntro}</p>
            <p className="mt-3 text-sm font-medium text-primary underline-offset-2 hover:underline">
              {ENGAGEMENT_SCOPE.appStoresDetailsSummary}
            </p>
          </summary>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35 }}
            className="mt-6 overflow-x-auto rounded-xl border border-border/50"
          >
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Task</th>
                </tr>
              </thead>
              <tbody>
                {STORE_ROWS.map((row) => (
                  <tr key={row.task} className="border-b border-border/40 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-medium text-foreground">
                        <row.icon className="h-4 w-4 text-primary" aria-hidden />
                        {row.who}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.task}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </details>
      </motion.div>
    </section>
  );
}

/** Slim strip for /pricing — points to full scope section. */
export function EngagementTruthStrip() {
  return (
    <div className="mx-auto max-w-6xl px-6 sm:px-8">
      <div className="rounded-xl border border-border/60 bg-muted/15 px-5 py-4 text-center text-sm text-muted-foreground">
        <span className="text-foreground/90">{ENGAGEMENT_SCOPE.stripLeading}</span> {ENGAGEMENT_SCOPE.stripBody}{' '}
        <a href={SCOPE_HREF} className="font-medium text-primary underline-offset-2 hover:underline">
          {ENGAGEMENT_SCOPE.stripLinkLabel}
        </a>
        .
      </div>
    </div>
  );
}
