'use client';

import Link from 'next/link';
import {
  LAUNCH_CHECK_CATEGORY_LABEL,
  studioDocViewHref,
  type LaunchCheckCategory,
} from '@goldspire/commercial';
import { Badge, Button } from '@goldspire/ui';
import { StudioLaunchReadinessPanel } from '@/components/studio-launch-readiness-panel';

const DAILY_FLOW = [
  { step: '1', label: 'Desk', href: '/', detail: 'Action queue — enquiries, blockers, economics hint.' },
  { step: '2', label: 'Pipeline', href: '/pipeline', detail: 'Drag deals · open engagement workspace.' },
  { step: '3', label: 'Build', href: '/build?tab=launch', detail: 'Launch wizard or factory for delivery.' },
  { step: '4', label: 'Configure', href: '/configure?tab=charter', detail: 'Charter, capacity, automation toggles.' },
] as const;

const MANUAL_ONLY = [
  {
    title: 'Production deploy',
    doc: 'docs/deployment/vercel.md',
    steps: 'Deploy marketing, console, portal, Heartline, Nova per matrix.',
  },
  {
    title: 'Stripe live',
    doc: 'docs/deployment/phase-0-revenue-ready.md',
    steps: 'Live keys + webhook → Console /api/webhooks/stripe.',
  },
  {
    title: 'Factory certification',
    doc: 'docs/studio/tier1-dating-factory-certification.md',
    steps: 'Sign dating + booking certs after golden path on staging.',
  },
  {
    title: 'Operator sign-off',
    doc: 'docs/deployment/operator-sign-off.md',
    steps: 'You accept revenue responsibility on production.',
  },
] as const;

export function StudioOperatingGuidePanel() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Daily solo-founder loop</h3>
        <ol className="grid gap-2 sm:grid-cols-2">
          {DAILY_FLOW.map((item) => (
            <li key={item.step}>
              <Link
                href={item.href}
                className="flex gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:border-primary/30"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <StudioLaunchReadinessPanel />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Manual steps (cannot be automated)</h3>
        <ul className="space-y-2">
          {MANUAL_ONLY.map((item) => (
            <li
              key={item.title}
              className="rounded-lg border border-border/60 px-4 py-3 text-sm"
            >
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.steps}</p>
              <Button asChild variant="link" size="sm" className="mt-2 h-auto p-0 text-xs">
                <Link href={studioDocViewHref(item.doc)}>Open doc →</Link>
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Checklist categories</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LAUNCH_CHECK_CATEGORY_LABEL) as LaunchCheckCategory[]).map((cat) => (
            <Badge key={cat} variant="secondary">
              {LAUNCH_CHECK_CATEGORY_LABEL[cat]}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}
