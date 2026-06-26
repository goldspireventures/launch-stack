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
  CommandPanel,
  LoadingState,
  PageFlowCallout,
  formatMinorUnits,
} from '@goldspire/ui';
import { ArrowRight, CreditCard, ExternalLink, Handshake, Layers, LayoutTemplate } from 'lucide-react';
import { marketingSiteUrl } from '@/lib/marketing-site-url';
import { StudioPageHeader } from '@/components/studio-page-header';
import { trpc } from '@/lib/trpc';

const LAYERS = [
  {
    id: 'public-tiers',
    layer: 1,
    title: 'Public engagement tiers',
    surface: 'Marketing /pricing',
    editHref: '/catalog/templates?tab=offerings',
    publicHref: '/pricing',
    description:
      'Clone, template, and blueprint cards prospects see before they contact you. Drives enquiry tier metadata and convert defaults.',
    icon: CreditCard,
  },
  {
    id: 'template-catalog',
    layer: 2,
    title: 'Template catalog pricing',
    surface: 'Marketing /templates',
    editHref: '/catalog/templates?tab=template-copy',
    publicHref: '/templates',
    description:
      'Per-SKU “starts at” and typical weeks on each product template. Public site shows shipped + beta only; planned stays internal.',
    icon: LayoutTemplate,
  },
  {
    id: 'deal-desk',
    layer: 3,
    title: 'Deal desk snapshot',
    surface: 'Console /deals/[id]',
    editHref: '/deals',
    publicHref: null,
    description:
      'Fee and milestones for this client after convert. May diverge from public tiers after negotiation — always label which layer you changed.',
    icon: Handshake,
  },
] as const;

export default function CommercialHubPage() {
  const tiersQ = trpc.marketing.engagementTiers.useQuery();
  const templatesQ = trpc.catalog.listTemplates.useQuery();

  const templates = templatesQ.data ?? [];
  const shipped = templates.filter((t) => t.status === 'shipped').length;
  const beta = templates.filter((t) => t.status === 'beta').length;
  const planned = templates.filter((t) => t.status === 'planned').length;

  return (
    <div className="space-y-8">
      <StudioPageHeader
        eyebrow="Studio · Commercial"
        title="Commercial hub"
        description="Three pricing layers — public tiers, template catalog, and deal desk. Edit the right surface; run sync before launches."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/playbooks">Pricing playbook</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`${marketingSiteUrl()}/pricing`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                View public pricing
              </a>
            </Button>
          </div>
        }
      />

      <PageFlowCallout variant="muted" focusLine="Public site vs deal terms">
        Converting an enquiry snapshots public-tier economics onto the deal. After negotiation, change fee and milestones
        on the deal only — the marketing /pricing page may no longer match.
      </PageFlowCallout>

      {tiersQ.isLoading || templatesQ.isLoading ? (
        <LoadingState label="Loading commercial data" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {LAYERS.map((layer) => {
              const Icon = layer.icon;
              return (
                <Card key={layer.id} className="flex flex-col border-border/80">
                  <CardHeader className="pb-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        Layer {layer.layer}
                      </Badge>
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base">{layer.title}</CardTitle>
                    <CardDescription className="text-xs">{layer.surface}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-4">
                    <p className="text-sm text-muted-foreground">{layer.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="default">
                        <Link href={layer.editHref}>
                          Edit in Console
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {layer.publicHref ? (
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={`${marketingSiteUrl()}${layer.publicHref}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Public page
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <CommandPanel
            title="Live public tiers"
            description="Merged from code defaults + Studio overrides (Catalog → Public tiers)."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Tier</th>
                    <th className="pb-2 pr-4 font-medium">Starts at</th>
                    <th className="pb-2 pr-4 font-medium">Weeks</th>
                    <th className="pb-2 font-medium">Public</th>
                  </tr>
                </thead>
                <tbody>
                  {(tiersQ.data ?? []).map((tier) => (
                    <tr key={tier.id} className="border-b border-border/40">
                      <td className="py-2.5 pr-4 font-medium">{tier.name}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{tier.startsAtLabel}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{tier.weeksLabel}</td>
                      <td className="py-2.5">
                        <a
                          href={`${marketingSiteUrl()}/contact?tier=${tier.id}`}
                          className="text-primary underline-offset-2 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Pre-filled contact
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CommandPanel>

          <CommandPanel
            title="Template catalog (internal)"
            description={`${shipped} shipped · ${beta} beta · ${planned} planned (planned hidden on public site)`}
          >
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link href="/catalog/templates">Open catalog</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/catalog/templates?tab=pricing">Tier cards & milestones</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/blueprints">
                  <Layers className="mr-1.5 h-3.5 w-3.5" />
                  Blueprints
                </Link>
              </Button>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {templates.slice(0, 8).map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatMinorUnits(t.pricing.startsAtPriceCents, 'EUR')} · {t.status}
                  </span>
                  <Link
                    href={`/blueprints?highlight=${encodeURIComponent(t.blueprint)}`}
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Blueprint
                  </Link>
                </li>
              ))}
              {templates.length > 8 ? (
                <li className="text-xs text-muted-foreground">+{templates.length - 8} more in catalog</li>
              ) : null}
            </ul>
          </CommandPanel>
        </>
      )}

      <CommandPanel
        title="Pre-launch sync"
        description="Run from repo root before publishing pricing or template copy changes."
      >
        <pre className="overflow-x-auto rounded-md border bg-muted/40 px-4 py-3 font-mono text-xs">
          pnpm audit:commercial-sync
        </pre>
        <p className="mt-3 text-xs text-muted-foreground">
          Validates public tiers and shipped/beta template list prices against code defaults in{' '}
          <code className="rounded bg-muted px-1">@goldspire/commercial</code> and{' '}
          <code className="rounded bg-muted px-1">@goldspire/blueprints</code>.
        </p>
      </CommandPanel>
    </div>
  );
}
