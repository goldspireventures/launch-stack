'use client';

import Link from 'next/link';
import { Layers, Flag, LayoutTemplate, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageFlowCallout } from '@goldspire/ui';
import { StudioPageHeader } from '@/components/studio-page-header';

const CARDS = [
  {
    title: 'Templates',
    description: 'Product SKUs, merge fields, scope playbook, and public pricing tabs.',
    href: '/catalog/templates',
    icon: LayoutTemplate,
  },
  {
    title: 'Offerings',
    description: 'Edit public tier copy and commercial positioning per template.',
    href: '/catalog/offerings',
    icon: CreditCard,
  },
  {
    title: 'Feature flags',
    description: 'Rollout keys for tenants and studio experiments.',
    href: '/catalog/feature-flags',
    icon: Flag,
  },
  {
    title: 'Blueprints',
    description: 'Reference product blueprints (linked from factory and deals).',
    href: '/blueprints',
    icon: Layers,
  },
] as const;

export default function CatalogHubPage() {
  return (
    <div className="space-y-6">
      <StudioPageHeader
        eyebrow="Catalog"
        title="Sell-side configuration"
        description="Templates, tiers, and flags — one place instead of hunting the More menu."
      />
      <PageFlowCallout variant="muted" focusLine="When to use this">
        Change what clients see on the marketing site and what presets appear in Deal Desk — not day-to-day triage
        (that stays under Enquiries and Deals).
      </PageFlowCallout>
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="block">
              <Card className="h-full transition-colors hover:border-primary/30 hover:bg-card/80">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{card.title}</CardTitle>
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-xs font-medium text-primary">Open →</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
