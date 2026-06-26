'use client';

import Link from 'next/link';
import { BookOpen, Map, Layers, History, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageFlowCallout } from '@goldspire/ui';
import { StudioPageHeader } from '@/components/studio-page-header';

const CARDS = [
  {
    title: 'Playbooks',
    description: 'SLA, enquiry handling, and delivery playbooks.',
    href: '/playbooks',
    icon: BookOpen,
  },
  {
    title: 'Delivery guide',
    description: 'Milestone runbooks and handover checklists.',
    href: '/delivery',
    icon: Map,
  },
  {
    title: 'Blueprints',
    description: 'Product blueprint reference for operators.',
    href: '/blueprints',
    icon: Layers,
  },
  {
    title: 'Documentation',
    description: 'Indexed studio docs and runbooks from the repo.',
    href: '/docs',
    icon: BookOpen,
  },
  {
    title: 'Stamp tenant',
    description: 'Onboard a new tenant from template.',
    href: '/onboard',
    icon: Sparkles,
  },
  {
    title: 'Audit log',
    description: 'Append-only operator and system events.',
    href: '/audit',
    icon: History,
  },
] as const;

export default function ReferenceHubPage() {
  return (
    <div className="space-y-6">
      <StudioPageHeader
        eyebrow="Reference"
        title="How we operate"
        description="Guides and audit — separate from the client pipeline so Desk stays focused."
      />
      <PageFlowCallout variant="muted" focusLine="Tip">
        Use Cmd+K to jump to any doc path. Pin this hub if you onboard new studio staff often.
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
