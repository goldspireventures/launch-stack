'use client';

import { useEffect, useState } from 'react';
import type { TemplateMarketingOverride } from '@goldspire/commercial';
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

type TemplateDraft = {
  name: string;
  tagline: string;
  description: string;
  startsAtEuros: string;
  typicalWeeksMin: string;
  typicalWeeksMax: string;
  heroHeadline: string;
  heroSub: string;
};

function mergedToDraft(m: {
  name: string;
  tagline: string;
  description: string;
  startsAtPriceCents: number;
  typicalWeeksMin: number;
  typicalWeeksMax: number;
  heroHeadline: string;
  heroSub: string;
}): TemplateDraft {
  return {
    name: m.name,
    tagline: m.tagline,
    description: m.description,
    startsAtEuros: String(Math.round(m.startsAtPriceCents / 100)),
    typicalWeeksMin: String(m.typicalWeeksMin),
    typicalWeeksMax: String(m.typicalWeeksMax),
    heroHeadline: m.heroHeadline,
    heroSub: m.heroSub,
  };
}

function draftToOverride(d: TemplateDraft): TemplateMarketingOverride {
  const euros = Number.parseInt(d.startsAtEuros.replace(/[^\d]/g, ''), 10);
  const wMin = Number.parseInt(d.typicalWeeksMin, 10);
  const wMax = Number.parseInt(d.typicalWeeksMax, 10);
  return {
    name: d.name.trim(),
    tagline: d.tagline.trim(),
    description: d.description.trim(),
    startsAtPriceCents: Number.isFinite(euros) ? euros * 100 : undefined,
    typicalWeeksMin: Number.isFinite(wMin) ? wMin : undefined,
    typicalWeeksMax: Number.isFinite(wMax) ? wMax : undefined,
    heroHeadline: d.heroHeadline.trim(),
    heroSub: d.heroSub.trim(),
  };
}

export function TemplateOfferingsEditorPanel() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const q = trpc.marketing.templateOfferingsEditor.useQuery();
  const saveMut = trpc.marketing.saveTemplateMarketingOverrides.useMutation({
    onSuccess: () => {
      toast({ title: 'Template copy saved', description: 'Public /templates pages will reflect changes.', tone: 'success' });
      void utils.marketing.templateOfferingsEditor.invalidate();
      void utils.marketing.templates.invalidate();
    },
    onError: (e) => toast({ title: 'Save failed', description: e.message, tone: 'danger' }),
  });
  const resetMut = trpc.marketing.resetTemplateMarketingOverrides.useMutation({
    onSuccess: () => {
      toast({ title: 'All template overrides cleared', tone: 'success' });
      void utils.marketing.templateOfferingsEditor.invalidate();
      void utils.marketing.templates.invalidate();
    },
    onError: (e) => toast({ title: 'Reset failed', description: e.message, tone: 'danger' }),
  });
  const resetOneMut = trpc.marketing.resetTemplateMarketingOverrides.useMutation({
    onSuccess: () => {
      void utils.marketing.templateOfferingsEditor.invalidate();
      void utils.marketing.templates.invalidate();
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TemplateDraft | null>(null);

  useEffect(() => {
    if (!q.data?.templates.length) return;
    const id = selectedId ?? q.data.templates[0]!.id;
    const row = q.data.templates.find((t) => t.id === id) ?? q.data.templates[0]!;
    setSelectedId(row.id);
    setDraft(mergedToDraft(row.merged));
  }, [q.data, selectedId]);

  if (q.isLoading || !q.data || !draft || !selectedId) {
    return <p className="text-sm text-muted-foreground">Loading template copy…</p>;
  }

  const row = q.data.templates.find((t) => t.id === selectedId)!;
  const hasOverride = Boolean(q.data.overrides[selectedId]);

  function handleSave() {
    if (!draft) return;
    const templateId = selectedId;
    if (!templateId) return;
    const def = row.defaults;
    const patch = draftToOverride(draft);
    const changed =
      (patch.name ?? def.name) !== def.name ||
      (patch.tagline ?? def.tagline) !== def.tagline ||
      (patch.description ?? def.description) !== def.description ||
      (patch.startsAtPriceCents ?? def.startsAtPriceCents) !== def.startsAtPriceCents ||
      (patch.typicalWeeksMin ?? def.typicalWeeksMin) !== def.typicalWeeksMin ||
      (patch.typicalWeeksMax ?? def.typicalWeeksMax) !== def.typicalWeeksMax ||
      (patch.heroHeadline ?? def.heroHeadline) !== def.heroHeadline ||
      (patch.heroSub ?? def.heroSub) !== def.heroSub;

    const overrides = { ...q.data!.overrides };
    if (changed) overrides[templateId] = patch;
    else delete overrides[templateId];
    saveMut.mutate({ overrides });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Override taglines, hero copy, and &quot;starts at&quot; pricing per product template on the public{' '}
          <strong className="text-foreground">/templates</strong> catalog.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`${marketingSiteUrl()}/templates/${selectedId}`} target="_blank" rel="noopener noreferrer">
              Preview template
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={resetMut.isPending}
            onClick={() => resetMut.mutate({})}
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

      <div className="flex flex-wrap gap-2">
        {q.data.templates.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={t.id === selectedId ? 'default' : 'outline'}
            onClick={() => {
              setSelectedId(t.id);
              setDraft(mergedToDraft(t.merged));
            }}
          >
            {t.merged.name}
          </Button>
        ))}
      </div>

      <Card className="border-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">{row.merged.name}</CardTitle>
              <CardDescription>
                {row.status} · {row.id}
              </CardDescription>
            </div>
            {hasOverride ? <Badge variant="secondary">Overridden</Badge> : <Badge variant="outline">Default</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormField label="Name" htmlFor="tpl-name">
            <Input id="tpl-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </FormField>
          <FormField label="Tagline" htmlFor="tpl-tagline">
            <Input id="tpl-tagline" value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
          </FormField>
          <FormField label="Description" htmlFor="tpl-desc">
            <Textarea
              id="tpl-desc"
              rows={4}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Starts at (€)" htmlFor="tpl-price">
              <Input
                id="tpl-price"
                inputMode="numeric"
                value={draft.startsAtEuros}
                onChange={(e) => setDraft({ ...draft, startsAtEuros: e.target.value })}
              />
            </FormField>
            <FormField label="Typical weeks (min)" htmlFor="tpl-wmin">
              <Input
                id="tpl-wmin"
                inputMode="numeric"
                value={draft.typicalWeeksMin}
                onChange={(e) => setDraft({ ...draft, typicalWeeksMin: e.target.value })}
              />
            </FormField>
            <FormField label="Typical weeks (max)" htmlFor="tpl-wmax">
              <Input
                id="tpl-wmax"
                inputMode="numeric"
                value={draft.typicalWeeksMax}
                onChange={(e) => setDraft({ ...draft, typicalWeeksMax: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Hero headline" htmlFor="tpl-hero-h">
            <Input
              id="tpl-hero-h"
              value={draft.heroHeadline}
              onChange={(e) => setDraft({ ...draft, heroHeadline: e.target.value })}
            />
          </FormField>
          <FormField label="Hero sub" htmlFor="tpl-hero-s">
            <Textarea
              id="tpl-hero-s"
              rows={2}
              value={draft.heroSub}
              onChange={(e) => setDraft({ ...draft, heroSub: e.target.value })}
            />
          </FormField>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={resetOneMut.isPending}
            onClick={() => {
              setDraft(mergedToDraft(row.defaults));
              resetOneMut.mutate({ templateId: selectedId });
              toast({ title: 'Reset to code default', tone: 'success' });
            }}
          >
            Reset template to code default
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}