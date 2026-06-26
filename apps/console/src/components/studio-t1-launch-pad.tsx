'use client';

import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  formatMinorUnits,
} from '@goldspire/ui';
import { DEAL_PRESETS, SHIPPED_CLONE_TEMPLATE_IDS, studioDocViewHref } from '@goldspire/commercial';
import { ArrowRight, CheckCircle2, Circle, Factory, Rocket, ShieldCheck } from 'lucide-react';

const T1_PRESET_SLUGS = [
  'tier1-dating',
  'tier1-dating-as-is',
  'tier1-dating-companion',
  'tier1-dating-native',
  'tier1-booking',
] as const;

const LAUNCH_STEPS = [
  { key: 'deal', label: 'File deal', hint: 'Preset-locked economics + factory runbook' },
  { key: 'portal', label: 'Client portal', hint: 'Accept · pay kickoff · intake (dating)' },
  { key: 'stamp', label: 'Stamp tenant', hint: 'Blueprint products + flags on tenant row' },
  { key: 'runbook', label: 'Factory runbook', hint: 'CLI scaffold · identity · config passes' },
  { key: 'deploy', label: 'Staging hook', hint: 'CI → webhook → stagingUrl on deal' },
] as const;

export function StudioT1LaunchPad() {
  const t1Presets = DEAL_PRESETS.filter((p) =>
    (T1_PRESET_SLUGS as readonly string[]).includes(p.slug),
  );

  return (
    <div className="space-y-6">
      <div className="studio-panel studio-gold-glow p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="mb-2 flex items-center gap-2">
              <Factory className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-semibold">Tier 1 launch pad</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Goldspire ships <strong className="text-foreground">dating</strong> and{' '}
              <strong className="text-foreground">booking</strong> clones at fixed SKU economics. Each path:
              deal → portal → stamp → runbook → deploy. Preset slug is stored on the deal so the factory
              runbook always matches.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Shipped templates: {SHIPPED_CLONE_TEMPLATE_IDS.join(' · ')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="shrink-0">
              <Link href="/build?tab=launch">
                <Rocket className="mr-1.5 h-3.5 w-3.5" />
                Open launch wizard
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link href="/configure?tab=charter">
                Charter
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link
                href={studioDocViewHref(
                  'docs/studio/tier1-dating-factory-certification.md',
                )}
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Dating cert
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link
                href={studioDocViewHref(
                  'docs/studio/tier1-booking-factory-certification.md',
                )}
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Booking cert
              </Link>
            </Button>
          </div>
        </div>

        <ol className="mt-5 grid gap-2 sm:grid-cols-5">
          {LAUNCH_STEPS.map((step, i) => (
            <li
              key={step.key}
              className="rounded-md border border-border/50 bg-background/30 px-3 py-2 text-center"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-primary">
                {i + 1}
              </p>
              <p className="text-xs font-semibold">{step.label}</p>
              <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground">{step.hint}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {t1Presets.map((preset) => (
          <Card
            key={preset.slug}
            className="border-border/70 bg-card/60 transition-colors hover:border-primary/30"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{preset.label}</CardTitle>
                <Badge variant="outline" className="shrink-0 text-[9px] uppercase">
                  T1
                </Badge>
              </div>
              <CardDescription className="text-xs">{preset.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-lg font-semibold tabular-nums text-primary">
                {formatMinorUnits(preset.planInput.totalFeeMinorUnits, preset.planInput.currency)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  · {preset.planInput.weeksMin}–{preset.planInput.weeksMax}w
                </span>
              </p>
              <ul className="space-y-1 text-[10px] text-muted-foreground">
                {LAUNCH_STEPS.map((s) => (
                  <li key={s.key} className="flex items-center gap-1.5">
                    <Circle className="h-2.5 w-2.5 shrink-0 text-border" />
                    {s.label}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" className="h-8 text-xs">
                  <Link href={`/deals/new?preset=${preset.slug}`}>
                    <Rocket className="mr-1 h-3 w-3" />
                    New deal
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <Link
                    href={`/build?tab=onboard&blueprint=${preset.blueprintKinds[0]}&template=${encodeURIComponent(preset.productTemplateId)}`}
                  >
                    Stamp
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="studio-panel flex flex-wrap items-center gap-3 p-4 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span>
          After kickoff payment, Console suggests stamp via deal activity. Run{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">pnpm certify:tier1</code> before
          CEO sign-off on factory certs (Configure → Launch checklist).
        </span>
        <Button asChild variant="outline" size="sm" className="ml-auto h-7 text-xs">
          <Link href="/configure?tab=launch">Launch checklist</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
          <Link href="/delivery">Delivery guide</Link>
        </Button>
      </div>
    </div>
  );
}
