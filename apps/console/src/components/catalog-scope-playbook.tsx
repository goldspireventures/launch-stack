'use client';

import Link from 'next/link';
import {
  AS_IS_CLONE_DEFINITION_V0,
  CLONE_SCOPE_GUARDRAILS_V0,
  DATING_DELIVERY_SKUS,
  DATING_STORE_LISTING_ADDON_MINOR,
  ENGAGEMENT_SCOPE_LAYERS_V0,
  REFERENCE_BLUEPRINT_DEMOS_V0,
  STUDIO_METRIC_V0_PRIMARY,
  STUDIO_REVENUE_SKUS_V0,
  formatEngagementPrice,
} from '@goldspire/commercial';
import { GOLDEN_PATHS } from '@goldspire/blueprints';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@goldspire/ui';
import { ArrowRight, Layers, Map, Package } from 'lucide-react';
import { marketingSiteUrl } from '@/lib/marketing-site-url';

/**
 * Operator playbook: scope model, revenue SKUs, clone guardrails, and what to ship next.
 * Lives under Catalog → Templates as the "Scope & SKUs" tab (not editable marketing tiers).
 */
export function CatalogScopePlaybook() {
  return (
    <div className="space-y-8">
      <Card className="border-primary/25 bg-primary/[0.04]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="h-4 w-4 text-primary" />
            Why this tab exists
          </CardTitle>
          <CardDescription>
            This is the <strong className="text-foreground">internal playbook</strong> — proposal language, SKUs, and
            guardrails that should match Deal Desk exports and the public site. To change what prospects <em>see</em>{' '}
            on <code className="rounded bg-muted px-1">/pricing</code>, use{' '}
            <Link href="/catalog/templates?tab=offerings" className="text-primary underline-offset-2 hover:underline">
              Catalog → Templates → Public tiers
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            Primary studio metric (v0)
          </CardTitle>
          <CardDescription>Track manually in Revenue & ops until automated rollups land.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-medium text-foreground">{STUDIO_METRIC_V0_PRIMARY.label}</p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">How:</span> {STUDIO_METRIC_V0_PRIMARY.howToCompute}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Cadence:</span> {STUDIO_METRIC_V0_PRIMARY.reviewCadence}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Read:</span> {STUDIO_METRIC_V0_PRIMARY.targetNote}
          </p>
          <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
            Revenue & ops <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What to sell & build next (studio view)</CardTitle>
          <CardDescription>
            Opinionated priorities for productized delivery — align presets, seeds, and reference apps before opening a
            new Tier 1 clone SKU.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Keep strongest (live Tier 1)</p>
            <ul className="ml-5 mt-1 list-disc space-y-1">
              <li>
                <strong className="text-foreground">Dating</strong> on <code className="text-xs">social_matching</code>{' '}
                — four Tier 1 arms (web / as-is / companion / native); see Dating delivery SKUs below.
              </li>
              <li>
                <strong className="text-foreground">Clinic & salon booking</strong> on{' '}
                <code className="text-xs">multi_staff_booking</code> — Nova Care + booking-web; good second factory line
                (high intent buyers, clear calendar ROI).
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Next Tier 1 candidates (after one more flagship pass each)</p>
            <ul className="ml-5 mt-1 list-disc space-y-1">
              <li>
                <strong className="text-foreground">B2B control plane</strong> — high repeatability; needs a dedicated
                client-shaped reference app (not only Goldspire internal surfaces) before you sell fixed-price clone.
              </li>
              <li>
                <strong className="text-foreground">Vertical AI agent</strong> — pick one narrow job (e.g. support
                triage); ship evals + tools + one reference tenant before catalog “shipped”.
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Tier 2 / funded invention first</p>
            <ul className="ml-5 mt-1 list-disc space-y-1">
              <li>
                <strong className="text-foreground">Mentorship</strong> on existing social_matching foundation.
              </li>
              <li>
                <strong className="text-foreground">Community</strong> and <strong>marketplace</strong> — keep as
                roadmap templates until scaffold matures and you have a seeded reference tenant story.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Golden paths (smoke before prospects)</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Six live demos + studio surfaces</CardTitle>
            <CardDescription>
              Run <code className="rounded bg-muted px-1">pnpm smoke:golden-paths</code> with dev stack up. Registry:{' '}
              <code className="rounded bg-muted px-1">packages/blueprints/src/golden-paths.ts</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {GOLDEN_PATHS.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                  <span className="font-medium text-foreground">{p.marketingName}</span>
                  <Badge variant={p.tier === 'tier1_clone' ? 'default' : 'outline'} className="text-[10px]">
                    {p.tier === 'tier1_clone' ? 'Tier 1' : 'Catalog live'}
                  </Badge>
                  <code className="text-xs text-muted-foreground">{p.referenceAppFolder}</code>
                  <span className="text-xs text-muted-foreground">· {p.smokeRoutes.join(', ')}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Reference apps vs Tier 1 deliverable</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monorepo demos</CardTitle>
            <CardDescription>
              Sales-quality proof — only rows marked Tier 1 eligible ship on a clone SOW without a change order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {REFERENCE_BLUEPRINT_DEMOS_V0.map((demo) => (
                <li key={demo.appFolder} className="rounded-md border border-border/60 bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{demo.marketingName}</span>
                    <Badge variant={demo.tier1CloneEligible ? 'default' : 'outline'} className="text-[10px]">
                      {demo.tier1CloneEligible ? 'Tier 1 clone' : 'Reference only'}
                    </Badge>
                    <code className="text-xs text-muted-foreground">{demo.appFolder}</code>
                  </div>
                  <p className="mt-1 text-muted-foreground">{demo.role}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Dating delivery SKUs (Tier 1)</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Four arms — one template</CardTitle>
            <CardDescription>
              Deal Desk presets:{' '}
              {DATING_DELIVERY_SKUS.map((s) => (
                <Link
                  key={s.id}
                  href={`/deals/new?preset=${s.presetSlug}`}
                  className="mr-2 text-primary underline-offset-2 hover:underline"
                >
                  {s.shortLabel}
                </Link>
              ))}
              · Store listing add-on from {formatEngagementPrice(DATING_STORE_LISTING_ADDON_MINOR, 'EUR')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {DATING_DELIVERY_SKUS.map((sku) => (
              <div key={sku.id} className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm">
                <p className="font-medium text-foreground">
                  {sku.shortLabel}{' '}
                  <span className="text-primary">{formatEngagementPrice(sku.totalFeeMinorUnits, 'EUR')}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sku.weeksMin}–{sku.weeksMax} wks · mobile: {sku.mobileScope}
                </p>
                <p className="mt-2 text-muted-foreground">{sku.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{AS_IS_CLONE_DEFINITION_V0.label}</CardTitle>
            <CardDescription>{AS_IS_CLONE_DEFINITION_V0.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {AS_IS_CLONE_DEFINITION_V0.explicitlyOut.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Three-layer scope model</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Same story as the public “How we scope” section —{' '}
          <a
            href={`${marketingSiteUrl().replace(/\/$/, '')}/how-we-work#how-we-scope`}
            className="text-primary underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            open on marketing site
          </a>
          .
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {ENGAGEMENT_SCOPE_LAYERS_V0.map((L) => (
            <Card key={L.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-primary" />
                  {L.headline}
                </CardTitle>
                <CardDescription className="text-xs capitalize text-muted-foreground">{L.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{L.description}</p>
                <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs">
                  <p className="font-medium text-foreground">Typical clone</p>
                  <p className="mt-1">{L.cloneIncludes}</p>
                  <p className="mt-2 font-medium text-foreground">Boundary</p>
                  <p className="mt-1">{L.cloneBoundary}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Revenue streams (v0 SKUs)</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {STUDIO_REVENUE_SKUS_V0.map((sku) => (
            <Card key={sku.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{sku.label}</CardTitle>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">
                    {sku.id}
                  </Badge>
                </div>
                <CardDescription className="text-xs">{sku.proposalLine}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Band: </span>
                  {sku.suggestedBandEur}
                </p>
                <p>
                  <span className="text-muted-foreground">Typical duration: </span>
                  {sku.typicalDuration}
                </p>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Client gets</p>
                  <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                    {sku.clientGets.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Explicitly out</p>
                  <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                    {sku.explicitlyOut.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                {sku.notesForOps ? (
                  <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Ops: </span>
                    {sku.notesForOps}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Clone / floor scope guardrails</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paste into SOW or Deal Desk notes</CardTitle>
            <CardDescription>
              Internal checklist — mirrored in proposal Markdown exports under “Clone / floor scope guardrails”.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              {CLONE_SCOPE_GUARDRAILS_V0.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
