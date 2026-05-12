'use client';

import Link from 'next/link';
import { buildCommercialPlan } from '@goldspire/commercial';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FadeIn,
  PageHeader,
  SlideUp,
} from '@goldspire/ui';
import { Check } from 'lucide-react';

const tiers = [
  {
    id: 'solo' as const,
    name: 'Solo MVP',
    priceLabel: '€25,000',
    priceNote: 'fixed engagement',
    weeks: '6–10 weeks',
    blueprints: '1 blueprint',
    blurb: 'Ship a credible MVP on a fixed calendar with one blueprint family.',
    features: ['Discovery + UX wireframes', 'Core flows + auth', 'Stripe test mode', 'Handoff runbook'],
    planInput: {
      engagementKind: 'mvp' as const,
      clientRisk: 'unknown' as const,
      subcontracting: 'none' as const,
      weeksMin: 6,
      weeksMax: 10,
      totalFeeMinorUnits: 2_500_000,
      currency: 'EUR' as const,
    },
  },
  {
    id: 'growth' as const,
    name: 'Growth',
    priceLabel: '€80,000+',
    priceNote: 'scoped phases',
    weeks: '12–18 weeks',
    blueprints: 'Up to 3 blueprints',
    blurb: 'Multi-surface launches with integrations, analytics, and ops polish.',
    features: ['Multi-app coordination', 'Custom integrations', 'Observability pack', 'Launch playbooks'],
    planInput: {
      engagementKind: 'mvp_plus_prod_planned' as const,
      clientRisk: 'referred' as const,
      subcontracting: 'light' as const,
      weeksMin: 12,
      weeksMax: 18,
      totalFeeMinorUnits: 8_000_000,
      currency: 'EUR' as const,
    },
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    priceLabel: 'Custom',
    priceNote: 'retainer or T&M',
    weeks: 'Dedicated team',
    blueprints: 'Multi-product',
    blurb: 'Portfolio programs with procurement-friendly milestones and SLAs.',
    features: ['Dedicated squad', 'Multi-tenant governance', 'Security review lane', '24/7 paging option'],
    planInput: {
      engagementKind: 'mvp_plus_prod_planned' as const,
      clientRisk: 'enterprise' as const,
      subcontracting: 'heavy' as const,
      weeksMin: 16,
      weeksMax: 40,
      totalFeeMinorUnits: 25_000_000,
      currency: 'EUR' as const,
    },
  },
];

export default function StudioPlansPage() {
  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title="Commercial plans"
          description="What we sell before ink hits paper — distinct from signed engagements on the Deal Desk."
          eyebrow="Studio"
        />
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier, i) => {
          const preview = buildCommercialPlan(tier.planInput);
          return (
            <SlideUp key={tier.id} delay={0.05 * i}>
              <Card className="flex h-full flex-col border-primary/15 shadow-sm shadow-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    <Badge variant="outline">{tier.weeks}</Badge>
                  </div>
                  <CardDescription>{tier.blurb}</CardDescription>
                  <div className="pt-2">
                    <p className="text-3xl font-semibold tracking-tight">{tier.priceLabel}</p>
                    <p className="text-xs text-muted-foreground">{tier.priceNote}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tier.blueprints} · same milestone engine as Deal Desk previews
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <ul className="space-y-2 text-sm">
                    {tier.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex-1" />
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Milestone preview</p>
                    <ol className="mt-2 space-y-2">
                      {preview.milestones.slice(0, 3).map((m) => (
                        <li key={m.key} className="border-l-2 border-primary/40 pl-3 text-xs">
                          <span className="font-medium">
                            {m.order}. {m.title}
                          </span>
                          <span className="text-muted-foreground"> · {(m.percentBps / 100).toFixed(0)}%</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <Button asChild className="w-full">
                    <Link href={`/deals/new?tier=${tier.id}`}>Open in Deal Desk</Link>
                  </Button>
                </CardContent>
              </Card>
            </SlideUp>
          );
        })}
      </div>
    </div>
  );
}
