'use client';

import { motion } from 'framer-motion';
import { Check, MessageSquare, Pencil, Rocket, Wrench } from 'lucide-react';
import {
  HOW_WE_WORK_PAGE,
  HOW_WE_WORK_PHASES,
  HOW_WE_WORK_SCOPE_MODEL,
  HOW_WE_WORK_VALUES,
  CLIENT_DELIVERY_JOURNEY,
  PUBLIC_DELIVERY_GLOSSARY,
  type HowWeWorkPhaseIcon,
} from '@goldspire/commercial';
import { EngagementReadinessSection } from '@/components/engagement-readiness';
import { CTAButton, Eyebrow } from '@/components/ui-primitives';

const PHASE_ICONS: Record<HowWeWorkPhaseIcon, React.ComponentType<{ className?: string }>> = {
  discovery: MessageSquare,
  design: Pencil,
  build: Wrench,
  goLive: Rocket,
};

const GLOSSARY_ENTRIES: readonly { short: string; definition: string }[] = [
  { short: 'Design', definition: PUBLIC_DELIVERY_GLOSSARY.design },
  { short: 'Build', definition: PUBLIC_DELIVERY_GLOSSARY.build },
  PUBLIC_DELIVERY_GLOSSARY.goLive,
  PUBLIC_DELIVERY_GLOSSARY.billingIntegration,
  PUBLIC_DELIVERY_GLOSSARY.projectHub,
];

export default function HowWeWorkPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="relative overflow-hidden">
        <motion.div className="absolute inset-0 hero-glow opacity-50" aria-hidden />
        <motion.div className="absolute inset-0 grid-backdrop" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 sm:px-8 sm:pt-28">
          <Eyebrow>{HOW_WE_WORK_PAGE.eyebrow}</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            {HOW_WE_WORK_PAGE.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">{HOW_WE_WORK_PAGE.intro}</p>
          <nav
            aria-label="On this page"
            className="mt-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            <a href="#before-you-sign" className="rounded-md border border-border/60 bg-card/30 px-3 py-1.5 hover:text-foreground">
              Before you sign
            </a>
            <a href={`#${HOW_WE_WORK_SCOPE_MODEL.anchorId}`} className="rounded-md border border-border/60 bg-card/30 px-3 py-1.5 hover:text-foreground">
              Scope model
            </a>
            <a href="#glossary" className="rounded-md border border-border/60 bg-card/30 px-3 py-1.5 hover:text-foreground">
              Glossary
            </a>
            <a href="#from-brief-to-handover" className="rounded-md border border-border/60 bg-card/30 px-3 py-1.5 hover:text-foreground">
              Brief to handover
            </a>
            <a href="#phases" className="rounded-md border border-border/60 bg-card/30 px-3 py-1.5 hover:text-foreground">
              Phases
            </a>
          </nav>
        </div>
      </div>

      <div id="before-you-sign" className="scroll-mt-24">
        <EngagementReadinessSection />
      </div>

      <ScopeModelSection />

      <DeliveryJourneySection />

      <div id="glossary" className="mx-auto max-w-6xl px-6 pb-16 sm:px-8 scroll-mt-24">
        <h2 className="text-2xl font-semibold tracking-tight">{HOW_WE_WORK_PAGE.glossaryTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{HOW_WE_WORK_PAGE.glossaryIntro}</p>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          {GLOSSARY_ENTRIES.map((entry) => (
            <div key={entry.short} className="rounded-xl border border-border/60 bg-card/30 p-5">
              <dt className="text-sm font-semibold text-foreground">{entry.short}</dt>
              <dd className="mt-2 text-xs leading-relaxed text-muted-foreground">{entry.definition}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div id="phases" className="mx-auto max-w-6xl px-6 pb-24 sm:px-8 scroll-mt-24">
        <ol className="space-y-6">
          {HOW_WE_WORK_PHASES.map((p, i) => {
            const Icon = PHASE_ICONS[p.icon];
            return (
              <motion.li
                key={p.index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="grid gap-6 rounded-2xl border border-border/60 bg-card/30 p-6 sm:p-8 md:grid-cols-[180px_1fr]"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {p.index}
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight">{p.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.duration}</p>
                </div>
                <div>
                  <p className="text-base text-foreground/90">{p.blurb}</p>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-24 sm:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {HOW_WE_WORK_VALUES.map((card) => (
            <ValueCard key={card.title} title={card.title} body={card.body} />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-32 sm:px-8">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-transparent p-10 sm:p-14">
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {HOW_WE_WORK_PAGE.closingTitle}
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">{HOW_WE_WORK_PAGE.closingBlurb}</p>
          <div className="mt-6">
            <CTAButton href="/contact">{HOW_WE_WORK_PAGE.closingCta}</CTAButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 p-6">
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function DeliveryJourneySection() {
  const j = CLIENT_DELIVERY_JOURNEY;
  return (
    <section id={j.anchorId} className="scroll-mt-24 border-b border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <Eyebrow>{j.eyebrow}</Eyebrow>
        <h2 className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{j.title}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{j.intro}</p>
        <ol className="mt-10 space-y-4">
          {j.steps.map((step, i) => (
            <li key={step.phase} className="rounded-2xl border border-border/60 bg-card/30 p-6 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Step {i + 1} · {step.phase}
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">{step.client}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Studio</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.studio}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ScopeModelSection() {
  const m = HOW_WE_WORK_SCOPE_MODEL;
  return (
    <section id={m.anchorId} className="scroll-mt-24 border-y border-border/50 bg-muted/[0.08]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <Eyebrow>{m.eyebrow}</Eyebrow>
        <h2 className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{m.title}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{m.intro}</p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {m.layers.map((layer) => (
            <div key={layer.headline} className="rounded-2xl border border-border/60 bg-card/40 p-6">
              <p className="text-lg font-semibold tracking-tight text-foreground">{layer.headline}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{layer.description}</p>
              <p className="mt-4 border-t border-border/50 pt-4 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground/90">Typical clone engagement: </span>
                {layer.clonePath}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-xs text-muted-foreground sm:text-sm">{m.closingLine}</p>
      </div>
    </section>
  );
}
