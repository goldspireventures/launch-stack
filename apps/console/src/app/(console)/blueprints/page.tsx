'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Copy, ExternalLink, Sparkles } from 'lucide-react';
import {
  listBlueprints,
  listTemplatesByBlueprint,
  type BlueprintDefinition} from '@goldspire/blueprints';
import {
  BLUEPRINT_MODIFIERS,
  type BlueprintQuoteKind} from '@goldspire/commercial';
import { StudioPageHeader } from '@/components/studio-page-header';
import { StudioDialogBody, StudioDialogFooter } from '@/components/studio-page-shell';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ProductTypeBadge,
  SectionCard,
  StatusBadge,
  Stagger,
  StaggerItem,
  formatMinorUnits} from '@goldspire/ui';

export default function BlueprintsPage() {
  const searchParams = useSearchParams();
  const highlight = searchParams?.get('highlight')?.toLowerCase() ?? null;
  const blueprints = listBlueprints();
  const [stampOpen, setStampOpen] = React.useState<BlueprintDefinition | null>(null);
  const cardRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    if (!highlight) return;
    const el = cardRefs.current[highlight];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight, blueprints.length]);

  return (
    <div className="space-y-6">
      <StudioPageHeader
        title="Blueprints"
        description="The studio's reusable product templates. Each blueprint has a working reference app you can open locally, and a CLI generator that stamps out a new client product."
        eyebrow="Studio · Catalog"
      />

      <Stagger step={0.04} initialDelay={0.04} className="grid gap-4 md:grid-cols-2">
        {blueprints.map((b) => {
          // Pricing lives in @goldspire/commercial/catalog (single source of truth).
          // Falls back to the blueprint's own legacy price hint if the catalog
          // doesn't have a modifier for this kind (e.g. brand-new blueprints).
          const mod = BLUEPRINT_MODIFIERS[b.kind as BlueprintQuoteKind] as
            | (typeof BLUEPRINT_MODIFIERS)[BlueprintQuoteKind]
            | undefined;
          const prototypeCents = mod?.prototypePriceCents ?? b.prototypePriceCents;
          const retainerCents = mod?.retainerPriceCents ?? b.retainerPriceCents;
          const effortLabel = mod ? `×${mod.effortMultiplier.toFixed(2)}` : null;
          return (
            <StaggerItem key={b.kind}>
            <Card
              ref={(node) => {
                cardRefs.current[b.kind] = node;
              }}
              className={`p-6 transition-shadow hover:shadow-md ${
                highlight === b.kind ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ProductTypeBadge kind={b.kind} />
                    <StatusBadge
                      status={
                        b.maturity === 'production'
                          ? 'live'
                          : b.maturity === 'beta'
                            ? 'staging'
                            : 'draft'
                      }
                    />
                  </div>
                  <h3 className="text-lg font-semibold">{b.name}</h3>
                  <p className="text-sm text-muted-foreground">{b.tagline}</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{b.description}</p>

              <div className="mt-4 grid grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Prototype</p>
                  <p className="font-medium">{formatMinorUnits(prototypeCents, 'EUR')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Retainer</p>
                  <p className="font-medium">
                    {formatMinorUnits(retainerCents, 'EUR')}/mo
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Build time</p>
                  <p className="font-medium">
                    {b.estimatedWeeks.min}–{b.estimatedWeeks.max} wks
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground" title="Effort multiplier vs baseline blueprint in the unified quote calculator.">
                    Quote effort
                  </p>
                  <p className="font-medium">
                    {effortLabel ?? (
                    <Link href="/catalog/templates?tab=pricing" className="text-primary underline-offset-2 hover:underline">
                      see Templates & pricing
                    </Link>
                  )}
                  </p>
                </div>
              </div>

              {(() => {
                const templates = listTemplatesByBlueprint(b.kind);
                if (templates.length === 0) return null;
                return (
                  <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Templates · {templates.length}
                      </p>
                      <Link
                        href="/catalog/templates"
                        className="inline-flex items-center gap-1 text-[11px] text-primary underline-offset-2 hover:underline"
                      >
                        View catalog <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <ul className="space-y-1 text-xs">
                      {templates.map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: t.brand.defaultAccentHex }}
                              aria-hidden
                            />
                            <span className="font-medium">{t.name}</span>
                            <span className="text-muted-foreground">— {t.tagline}</span>
                          </span>
                          <span
                            className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                              t.status === 'shipped'
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                : t.status === 'beta'
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                  : 'border-slate-400/30 bg-slate-500/10 text-slate-300'
                            }`}
                          >
                            {t.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {b.clientNotes.length > 0 && (
                <details className="mt-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">
                    Sales talking points ({b.clientNotes.length})
                  </summary>
                  <ul className="ml-4 mt-2 list-disc space-y-1">
                    {b.clientNotes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                  <p className="ml-4 mt-2 text-[11px]">
                    Static per-blueprint talking points (defined in code). For client-specific notes, use a{' '}
                    <a href="/deals" className="text-primary underline-offset-2 hover:underline">
                      Deal
                    </a>{' '}
                    record.
                  </p>
                </details>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setStampOpen(b)} className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Stamp new product
                </Button>
                <Button asChild size="sm" variant="secondary" className="gap-1.5">
                  <a href={b.demoUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open local demo
                  </a>
                </Button>
                <CopyButton text={b.localDevCommand} label="Copy dev command" size="sm" variant="ghost" />
              </div>
            </Card>
            </StaggerItem>
          );
        })}
      </Stagger>

      <SectionCard
        title="How blueprints become products"
        description="A blueprint is a template. A product is one instance of a blueprint for one tenant. The CLI handles the stamping; this page just gives you the commands."
      >
        <ol className="ml-5 list-decimal space-y-2 text-sm text-muted-foreground">
          <li>
            Pick a blueprint above and click <strong>Stamp new product</strong>. The dialog gives you a
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">goldspire new</code>
            command to run locally.
          </li>
          <li>
            Running that command copies the blueprint&apos;s reference app into <code>apps/&lt;slug&gt;-web</code>,
            rewrites the package name and port, and inserts a new tenant + product + deployment row.
          </li>
          <li>
            The new app shows up immediately on the <a className="text-primary underline-offset-2 hover:underline" href="/apps">Apps grid</a> as a local deployment.
            Wire it to a Vercel project and the production row goes live.
          </li>
        </ol>
      </SectionCard>

      <StampDialog blueprint={stampOpen} onClose={() => setStampOpen(null)} />
    </div>
  );
}

function StampDialog({
  blueprint,
  onClose}: {
  blueprint: BlueprintDefinition | null;
  onClose: () => void;
}) {
  const [tenantSlug, setTenantSlug] = React.useState('');
  const [productName, setProductName] = React.useState('');

  React.useEffect(() => {
    if (blueprint) {
      setTenantSlug('');
      setProductName('');
    }
  }, [blueprint]);

  if (!blueprint) return null;

  const safeSlug = tenantSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'newco';
  const safeName = productName.trim() || blueprint.name;
  const command = `pnpm goldspire new ${safeSlug} --blueprint=${blueprint.kind} --name=${shellQuote(safeName)}`;

  return (
    <Dialog open={!!blueprint} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[min(90vh,720px)] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Stamp a new {blueprint.name} product</DialogTitle>
          <DialogDescription>
            The Goldspire CLI copies the {blueprint.name} reference app, rewrites the package name, and
            registers tenant + product + deployment rows.
          </DialogDescription>
        </DialogHeader>

        <StudioDialogBody className="space-y-4 px-6">
          <div className="space-y-1.5">
            <Label htmlFor="tenant-slug">Tenant slug</Label>
            <Input
              id="tenant-slug"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="e.g. heartline, novacare, bazaar"
            />
            <p className="text-xs text-muted-foreground">Used for the URL, the package name, and the DB tenant.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-name">Product display name</Label>
            <Input
              id="product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={blueprint.name}
            />
          </div>

          <div className="rounded-md border bg-muted/40 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Run this in your shell</Label>
              <Badge variant="outline" className="text-[10px]">v1</Badge>
            </div>
            <pre className="overflow-x-auto rounded bg-background px-3 py-2 text-xs font-mono">{command}</pre>
          </div>

        </StudioDialogBody>
        <StudioDialogFooter>
          <p className="mb-3 text-xs text-muted-foreground">
            This stamps a <strong>new app type</strong>. To onboard a <strong>client</strong> on an existing
            blueprint, use{' '}
            <a href="/onboard" className="text-primary underline-offset-2 hover:underline">
              /onboard
            </a>{' '}
            instead.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <CopyButton text={command} label="Copy command" size="sm" />
          </div>
        </StudioDialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function shellQuote(value: string): string {
  if (!/[\s'"=]/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function CopyButton({
  text,
  label,
  size = 'default',
  variant = 'secondary'}: {
  text: string;
  label: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
}) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className="gap-1.5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? 'Copied' : label}
    </Button>
  );
}
