'use client';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageFlowCallout,
} from '@goldspire/ui';
import { STUDIO_REVENUE_SKUS_V0 } from '@goldspire/commercial';

const PARTNER_SKU = STUDIO_REVENUE_SKUS_V0.find((s) => s.id === 'partner_implementation')!;

const PARTNER_CHECKLIST = [
  'Signed partner agreement + brand guidelines addendum',
  'Tri-party SOW when partner delivers to end client',
  'Scoped training hours and escalation path documented',
  'Rev-share or per-seat fee in Commercial plan (not bundled in clone)',
  'Support load modelled — one partner shape before scaling',
] as const;

export function PartnerOpsPanel() {
  return (
    <div className="space-y-6">
      <PageFlowCallout variant="muted" focusLine="Partner track">
        Do not sell white-label agency-of-record without this checklist. Charter explicit-no still
        applies until agreement is on file.
      </PageFlowCallout>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{PARTNER_SKU.label}</CardTitle>
          <CardDescription>{PARTNER_SKU.proposalLine}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            <span className="text-muted-foreground">Suggested band · </span>
            <span className="font-medium">{PARTNER_SKU.suggestedBandEur}</span>
            <span className="text-muted-foreground"> · {PARTNER_SKU.typicalDuration}</span>
          </p>
          {PARTNER_SKU.notesForOps ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
              {PARTNER_SKU.notesForOps}
            </p>
          ) : null}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client receives
            </p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {PARTNER_SKU.clientGets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Explicitly out
            </p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {PARTNER_SKU.explicitlyOut.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pre-flight checklist</CardTitle>
          <CardDescription className="text-xs">Complete before marking a deal as partner track</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {PARTNER_CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="mt-0.5 shrink-0 text-[9px]">
                  ops
                </Badge>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
