'use client';

import Link from 'next/link';
import { buildCommercialPlan, listTiers, tierHeadlinePrice } from '@goldspire/commercial';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  SlideUp,
} from '@goldspire/ui';
import { Check, Calculator } from 'lucide-react';

export function CommercialPlansPanel() {
  const tiers = listTiers();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Deal Desk tiers (solo / growth / enterprise). Public /pricing uses engagement tiers — edit under{' '}
          <Link href="/catalog/templates?tab=playbook" className="text-primary underline-offset-2 hover:underline">
            Scope &amp; SKUs playbook
          </Link>
          .
        </p>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/deals/new?calculator=1">
            <Calculator className="h-3.5 w-3.5" />
            Quote calculator
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier, i) => {
          const preview = buildCommercialPlan(tier.defaults);
          const headline = tierHeadlinePrice(tier.id);
          return (
            <SlideUp key={tier.id} delay={0.05 * i}>
              <Card className="flex h-full flex-col border-primary/15 shadow-sm shadow-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    <Badge variant="outline">{tier.weeksLabel}</Badge>
                  </div>
                  <CardDescription>{tier.blurb}</CardDescription>
                  <div className="pt-2">
                    <p className="text-3xl font-semibold tracking-tight">{headline.label}</p>
                    <p className="text-xs text-muted-foreground">{tier.priceNote}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tier.blueprints} · milestone engine matches Deal Desk
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
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Milestone preview
                    </p>
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
