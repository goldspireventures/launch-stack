'use client';

import * as React from 'react';
import { Copy, ExternalLink, Sparkles } from 'lucide-react';
import { listBlueprints, type BlueprintDefinition } from '@goldspire/blueprints';
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
  PageHeader,
  ProductTypeBadge,
  SectionCard,
  StatusBadge,
} from '@goldspire/ui';

/**
 * Reference apps that demonstrate each blueprint in the monorepo.
 * Mirrored from `seed.ts` so the Blueprints page can link to them
 * without a DB hit. When CLI scaffolding registers a real client
 * product, that surface shows up on the Apps page; these stay as
 * the read-only blueprint demos.
 */
const BLUEPRINT_DEMOS: Record<
  string,
  { localDevUrl: string; localDevCommand: string; repoPath: string }
> = {
  social_matching: {
    localDevUrl: 'http://localhost:3000',
    localDevCommand: 'pnpm --filter @goldspire/dating-web dev',
    repoPath: 'apps/dating-web',
  },
  multi_staff_booking: {
    localDevUrl: 'http://localhost:3010',
    localDevCommand: 'pnpm --filter @goldspire/booking-web dev',
    repoPath: 'apps/booking-web',
  },
  marketplace: {
    localDevUrl: 'http://localhost:3011',
    localDevCommand: 'pnpm --filter @goldspire/marketplace-web dev',
    repoPath: 'apps/marketplace-web',
  },
  community: {
    localDevUrl: 'http://localhost:3012',
    localDevCommand: 'pnpm --filter @goldspire/community-web dev',
    repoPath: 'apps/community-web',
  },
  vertical_ai_agent: {
    localDevUrl: 'http://localhost:3013',
    localDevCommand: 'pnpm --filter @goldspire/ai-agent-web dev',
    repoPath: 'apps/ai-agent-web',
  },
  b2b_saas_shell: {
    localDevUrl: 'http://localhost:3014',
    localDevCommand: 'pnpm --filter @goldspire/b2b-saas-web dev',
    repoPath: 'apps/b2b-saas-web',
  },
};

export default function BlueprintsPage() {
  const blueprints = listBlueprints();
  const [stampOpen, setStampOpen] = React.useState<BlueprintDefinition | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blueprints"
        description="The studio's reusable product templates. Each blueprint has a working reference app you can open locally, and a CLI generator that stamps out a new client product."
        eyebrow="Studio · Catalog"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {blueprints.map((b) => {
          const demo = BLUEPRINT_DEMOS[b.kind];
          return (
            <Card key={b.kind} className="p-6">
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

              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Prototype</p>
                  <p className="font-medium">${(b.prototypePriceCents / 100).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Retainer</p>
                  <p className="font-medium">
                    ${(b.retainerPriceCents / 100).toLocaleString()}/mo
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Build time</p>
                  <p className="font-medium">
                    {b.estimatedWeeks.min}–{b.estimatedWeeks.max} wks
                  </p>
                </div>
              </div>

              {b.clientNotes.length > 0 && (
                <details className="mt-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Client notes ({b.clientNotes.length})</summary>
                  <ul className="ml-4 mt-2 list-disc space-y-1">
                    {b.clientNotes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setStampOpen(b)} className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Stamp new product
                </Button>
                {demo && (
                  <Button asChild size="sm" variant="secondary" className="gap-1.5">
                    <a href={demo.localDevUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open local demo
                    </a>
                  </Button>
                )}
                {demo && (
                  <CopyButton
                    text={demo.localDevCommand}
                    label="Copy dev command"
                    size="sm"
                    variant="ghost"
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>

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
  onClose,
}: {
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
  const command = `pnpm goldspire new ${safeSlug} --blueprint=${blueprint.kind} --name="${safeName}"`;

  return (
    <Dialog open={!!blueprint} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Stamp a new {blueprint.name} product</DialogTitle>
          <DialogDescription>
            The Goldspire CLI copies the {blueprint.name} reference app, rewrites the package name, and
            registers tenant + product + deployment rows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            <div className="mt-2 flex justify-end">
              <CopyButton text={command} label="Copy command" size="sm" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The CLI scaffolder is read-only from this page — running it from the browser would require a
            background daemon, which we deliberately left out of v1.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CopyButton({
  text,
  label,
  size = 'default',
  variant = 'secondary',
}: {
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
