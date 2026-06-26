'use client';

import { useEffect, useState } from 'react';
import type { EngagementTiersOverrides, PublicEngagementTierId } from '@goldspire/commercial';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Textarea,
  useToast,
} from '@goldspire/ui';
import { RotateCcw, Save } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { marketingSiteUrl } from '@/lib/marketing-site-url';

const TIER_IDS: PublicEngagementTierId[] = ['clone', 'template', 'blueprint'];

type TierDraft = {
  name: string;
  blurb: string;
  weeksLabel: string;
  startsAtEuros: string;
  bulletsText: string;
  featured: boolean;
  featuredBadge: string;
};

function mergedToDraft(tier: {
  name: string;
  blurb: string;
  weeksLabel: string;
  startsAtMinorUnits: number;
  bullets: readonly string[];
  featured?: boolean;
  featuredBadge?: string;
}): TierDraft {
  return {
    name: tier.name,
    blurb: tier.blurb,
    weeksLabel: tier.weeksLabel,
    startsAtEuros: String(Math.round(tier.startsAtMinorUnits / 100)),
    bulletsText: tier.bullets.join('\n'),
    featured: tier.featured ?? false,
    featuredBadge: tier.featuredBadge ?? '',
  };
}

function draftToOverride(d: TierDraft): NonNullable<EngagementTiersOverrides[PublicEngagementTierId]> {
  const euros = Number.parseInt(d.startsAtEuros.replace(/[^\d]/g, ''), 10);
  return {
    name: d.name.trim(),
    blurb: d.blurb.trim(),
    weeksLabel: d.weeksLabel.trim(),
    startsAtMinorUnits: Number.isFinite(euros) ? euros * 100 : undefined,
    bullets: d.bulletsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
    featured: d.featured,
    featuredBadge: d.featuredBadge.trim() ? d.featuredBadge.trim().slice(0, 40) : undefined,
  };
}

export function OfferingsEditorPanel() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const q = trpc.marketing.offeringsEditor.useQuery();
  const saveMut = trpc.marketing.saveEngagementTierOverrides.useMutation({
    onSuccess: () => {
      toast({ title: 'Public pricing saved', description: 'goldspire-web /pricing will reflect changes.', tone: 'success' });
      void utils.marketing.offeringsEditor.invalidate();
      void utils.marketing.engagementTiers.invalidate();
    },
    onError: (e) => toast({ title: 'Save failed', description: e.message, tone: 'danger' }),
  });
  const resetMut = trpc.marketing.resetEngagementTierOverrides.useMutation({
    onSuccess: () => {
      toast({ title: 'Reset to code defaults', tone: 'success' });
      void utils.marketing.offeringsEditor.invalidate();
      void utils.marketing.engagementTiers.invalidate();
    },
    onError: (e) => toast({ title: 'Reset failed', description: e.message, tone: 'danger' }),
  });

  const [drafts, setDrafts] = useState<Record<PublicEngagementTierId, TierDraft> | null>(null);

  useEffect(() => {
    if (!q.data) return;
    const next = {} as Record<PublicEngagementTierId, TierDraft>;
    for (const t of q.data.merged) {
      next[t.id] = mergedToDraft(t);
    }
    setDrafts(next);
  }, [q.data]);

  if (q.isLoading || !drafts || !q.data) {
    return <p className="text-sm text-muted-foreground">Loading offerings…</p>;
  }

  function setTier(id: PublicEngagementTierId, patch: Partial<TierDraft>) {
    setDrafts((prev) => (prev ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));
  }

  function resetTierToDefault(id: PublicEngagementTierId) {
    const def = q.data!.defaults.find((t) => t.id === id);
    if (def) setTier(id, mergedToDraft(def));
  }

  function handleSave() {
    if (!drafts || !q.data) return;
    const overrides: EngagementTiersOverrides = {};
    for (const id of TIER_IDS) {
      const def = q.data.defaults.find((t) => t.id === id)!;
      const d = drafts[id];
      const patch = draftToOverride(d);
      const changed =
        (patch.name ?? def.name) !== def.name ||
        (patch.blurb ?? def.blurb) !== def.blurb ||
        (patch.weeksLabel ?? def.weeksLabel) !== def.weeksLabel ||
        (patch.startsAtMinorUnits ?? def.startsAtMinorUnits) !== def.startsAtMinorUnits ||
        (patch.featured ?? def.featured ?? false) !== (def.featured ?? false) ||
        (patch.featuredBadge ?? def.featuredBadge ?? '') !== (def.featuredBadge ?? '') ||
        JSON.stringify(patch.bullets ?? def.bullets) !== JSON.stringify(def.bullets);
      if (changed) overrides[id] = patch;
    }
    saveMut.mutate({ overrides });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Edits apply to the public site <strong className="text-foreground">/pricing</strong> page. Code defaults live in{' '}
          <code className="text-xs">@goldspire/commercial</code> — overrides are stored in{' '}
          <code className="text-xs">marketing_content_override</code>. Deal Desk tiers (solo / growth / enterprise) are separate.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`${marketingSiteUrl()}/pricing`} target="_blank" rel="noopener noreferrer">
              Preview /pricing
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={resetMut.isPending}
            onClick={() => resetMut.mutate()}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset all
          </Button>
          <Button size="sm" className="gap-1.5" disabled={saveMut.isPending} onClick={handleSave}>
            <Save className="h-3.5 w-3.5" />
            {saveMut.isPending ? 'Saving…' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {TIER_IDS.map((id) => {
          const merged = q.data.merged.find((t) => t.id === id)!;
          const d = drafts[id];
          const hasOverride = Boolean(q.data.overrides[id]);
          return (
            <Card key={id} className="border-primary/10">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{merged.eyebrow}</CardTitle>
                  {hasOverride ? <Badge variant="secondary">Overridden</Badge> : <Badge variant="outline">Default</Badge>}
                </div>
                <CardDescription>{merged.startsAtLabel} · {merged.weeksLabel}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField label="Name" htmlFor={`${id}-name`}>
                  <Input id={`${id}-name`} value={d.name} onChange={(e) => setTier(id, { name: e.target.value })} />
                </FormField>
                <FormField label="Blurb" htmlFor={`${id}-blurb`}>
                  <Textarea id={`${id}-blurb`} rows={2} value={d.blurb} onChange={(e) => setTier(id, { blurb: e.target.value })} />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="From (€)" htmlFor={`${id}-price`}>
                    <Input id={`${id}-price`} inputMode="numeric" value={d.startsAtEuros} onChange={(e) => setTier(id, { startsAtEuros: e.target.value })} />
                  </FormField>
                  <FormField label="Timeline" htmlFor={`${id}-weeks`}>
                    <Input id={`${id}-weeks`} value={d.weeksLabel} onChange={(e) => setTier(id, { weeksLabel: e.target.value })} />
                  </FormField>
                </div>
                <FormField label="Bullets (one per line)" htmlFor={`${id}-bullets`}>
                  <Textarea id={`${id}-bullets`} rows={5} value={d.bulletsText} onChange={(e) => setTier(id, { bulletsText: e.target.value })} />
                </FormField>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={d.featured}
                    onChange={(e) => setTier(id, { featured: e.target.checked })}
                    className="rounded border-border"
                  />
                  Featured on public site (ring + primary CTA)
                </label>
                {d.featured ? (
                  <FormField
                    label="Highlight pill"
                    htmlFor={`${id}-pill`}
                    description="Short positioning label — not “social proof”. Leave empty to hide the pill."
                  >
                    <Input
                      id={`${id}-pill`}
                      value={d.featuredBadge}
                      onChange={(e) => setTier(id, { featuredBadge: e.target.value })}
                      maxLength={40}
                      placeholder="e.g. Beyond a clone"
                    />
                  </FormField>
                ) : null}
                <Button type="button" variant="ghost" size="sm" onClick={() => resetTierToDefault(id)}>
                  Reset tier to code default
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
