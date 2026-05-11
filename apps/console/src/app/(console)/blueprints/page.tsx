'use client';

import Link from 'next/link';
import { listBlueprints } from '@goldspire/blueprints';
import { Card, PageHeader, ProductTypeBadge, StatusBadge } from '@goldspire/ui';

export default function BlueprintsPage() {
  const blueprints = listBlueprints();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Blueprints"
        description="The studio's reusable product templates. Spin up a tenant on any of these."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {blueprints.map((b) => (
          <Card key={b.kind} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <ProductTypeBadge kind={b.kind} />
                  <StatusBadge status={b.maturity === 'production' ? 'live' : b.maturity === 'beta' ? 'staging' : 'draft'} />
                </div>
                <h3 className="text-lg font-semibold">{b.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.tagline}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{b.description}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Prototype</p>
                <p className="font-medium">${(b.prototypePriceCents / 100).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Retainer</p>
                <p className="font-medium">${(b.retainerPriceCents / 100).toLocaleString()}/mo</p>
              </div>
              <div>
                <p className="text-muted-foreground">Build time</p>
                <p className="font-medium">{b.estimatedWeeks.min}–{b.estimatedWeeks.max} wks</p>
              </div>
            </div>
            {b.clientNotes.length > 0 && (
              <details className="mt-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Client notes</summary>
                <ul className="ml-4 mt-2 list-disc space-y-1">
                  {b.clientNotes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="mt-4">
              <Link
                href={`/blueprints/${b.kind}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Open blueprint →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
