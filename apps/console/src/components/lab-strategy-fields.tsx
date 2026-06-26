'use client';

import * as React from 'react';
import type { VentureOkr, VenturePlLine } from '@goldspire/commercial';
import { VENTURE_ECONOMICS_MODES } from '@goldspire/commercial';
import { Button, Input, cn } from '@goldspire/ui';
import { Plus, Trash2 } from 'lucide-react';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

export type LabStrategyFormState = {
  economicsMode: 'cash' | 'accrual';
  ownershipPercent: string;
  taxEntity: string;
  timeAllocationPercent: string;
  stripeAccountHint: string;
  xeroEntityUrl: string;
  plLines: VenturePlLine[];
  okrs: VentureOkr[];
};

export function defaultLabStrategyForm(venture?: {
  economicsMode?: string | null;
  ownershipPercent?: number | null;
  taxEntity?: string | null;
  timeAllocationPercent?: number | null;
  stripeAccountHint?: string | null;
  xeroEntityUrl?: string | null;
  plLines?: VenturePlLine[];
  okrs?: VentureOkr[];
}): LabStrategyFormState {
  return {
    economicsMode: (venture?.economicsMode === 'accrual' ? 'accrual' : 'cash') as 'cash' | 'accrual',
    ownershipPercent: venture?.ownershipPercent != null ? String(venture.ownershipPercent) : '',
    taxEntity: venture?.taxEntity ?? '',
    timeAllocationPercent:
      venture?.timeAllocationPercent != null ? String(venture.timeAllocationPercent) : '',
    stripeAccountHint: venture?.stripeAccountHint ?? '',
    xeroEntityUrl: venture?.xeroEntityUrl ?? '',
    plLines: venture?.plLines?.length ? venture.plLines : [],
    okrs: venture?.okrs?.length ? venture.okrs : [],
  };
}

export function labStrategyPayload(form: LabStrategyFormState) {
  return {
    economicsMode: form.economicsMode,
    ownershipPercent: form.ownershipPercent.trim()
      ? Number.parseInt(form.ownershipPercent, 10)
      : null,
    taxEntity: form.taxEntity.trim() || null,
    timeAllocationPercent: form.timeAllocationPercent.trim()
      ? Number.parseInt(form.timeAllocationPercent, 10)
      : null,
    stripeAccountHint: form.stripeAccountHint.trim() || null,
    xeroEntityUrl: form.xeroEntityUrl.trim() || null,
    plLines: form.plLines.filter((l) => l.label.trim() && l.amountMinor >= 0),
    okrs: form.okrs.filter((o) => o.objective.trim() && o.keyResult.trim()),
  };
}

export function LabStrategyFields({
  form,
  setForm,
}: {
  form: LabStrategyFormState;
  setForm: React.Dispatch<React.SetStateAction<LabStrategyFormState>>;
}) {
  const addPl = () => {
    setForm((f) => ({
      ...f,
      plLines: [
        ...f.plLines,
        {
          id: `pl-${Date.now()}`,
          kind: 'revenue',
          label: '',
          amountMinor: 0,
          currency: 'eur',
        },
      ],
    }));
  };

  const addOkr = () => {
    setForm((f) => ({
      ...f,
      okrs: [
        ...f.okrs,
        {
          id: `okr-${Date.now()}`,
          objective: '',
          keyResult: '',
          progressPercent: 0,
          quarter: 'Q2',
        },
      ],
    }));
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Strategy &amp; finance (Phases 3–4)
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-muted-foreground">Economics mode</span>
          <select
            className={cn(selectClass, 'mt-1')}
            value={form.economicsMode}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                economicsMode: e.target.value as LabStrategyFormState['economicsMode'],
              }))
            }
          >
            {VENTURE_ECONOMICS_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Ownership %</span>
          <Input
            className="mt-1"
            type="number"
            min={0}
            max={100}
            value={form.ownershipPercent}
            onChange={(e) => setForm((f) => ({ ...f, ownershipPercent: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Time allocation %</span>
          <Input
            className="mt-1"
            type="number"
            min={0}
            max={100}
            value={form.timeAllocationPercent}
            onChange={(e) => setForm((f) => ({ ...f, timeAllocationPercent: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Tax entity</span>
          <Input
            className="mt-1"
            value={form.taxEntity}
            onChange={(e) => setForm((f) => ({ ...f, taxEntity: e.target.value }))}
            placeholder="e.g. Goldspire Studio OÜ"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-muted-foreground">Stripe account hint (webhook match)</span>
          <Input
            className="mt-1 font-mono text-xs"
            value={form.stripeAccountHint}
            onChange={(e) => setForm((f) => ({ ...f, stripeAccountHint: e.target.value }))}
            placeholder="acct_… or venture slug"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-muted-foreground">Xero / accounting entity URL</span>
          <Input
            className="mt-1"
            value={form.xeroEntityUrl}
            onChange={(e) => setForm((f) => ({ ...f, xeroEntityUrl: e.target.value }))}
          />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">P&amp;L lines</span>
          <Button type="button" size="sm" variant="outline" onClick={addPl}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Line
          </Button>
        </div>
        {form.plLines.length === 0 ? (
          <p className="text-xs text-muted-foreground">Optional revenue / COGS / opex breakdown.</p>
        ) : (
          <ul className="space-y-2">
            {form.plLines.map((line, i) => (
              <li key={line.id} className="grid gap-2 rounded-md border p-2 sm:grid-cols-4">
                <select
                  className={selectClass}
                  value={line.kind}
                  onChange={(e) => {
                    const kind = e.target.value as VenturePlLine['kind'];
                    setForm((f) => {
                      const plLines = [...f.plLines];
                      plLines[i] = { ...plLines[i]!, kind };
                      return { ...f, plLines };
                    });
                  }}
                >
                  <option value="revenue">Revenue</option>
                  <option value="cogs">COGS</option>
                  <option value="opex">Opex</option>
                </select>
                <Input
                  placeholder="Label"
                  value={line.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    setForm((f) => {
                      const plLines = [...f.plLines];
                      plLines[i] = { ...plLines[i]!, label };
                      return { ...f, plLines };
                    });
                  }}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="EUR"
                  value={line.amountMinor ? String(line.amountMinor / 100) : ''}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    const amountMinor = v ? Math.round(Number.parseFloat(v) * 100) : 0;
                    setForm((f) => {
                      const plLines = [...f.plLines];
                      plLines[i] = { ...plLines[i]!, amountMinor };
                      return { ...f, plLines };
                    });
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setForm((f) => ({ ...f, plLines: f.plLines.filter((_, j) => j !== i) }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">OKRs</span>
          <Button type="button" size="sm" variant="outline" onClick={addOkr}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            OKR
          </Button>
        </div>
        {form.okrs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Quarterly objectives for this venture.</p>
        ) : (
          <ul className="space-y-2">
            {form.okrs.map((okr, i) => (
              <li key={okr.id} className="space-y-2 rounded-md border p-2">
                <Input
                  placeholder="Objective"
                  value={okr.objective}
                  onChange={(e) => {
                    const objective = e.target.value;
                    setForm((f) => {
                      const okrs = [...f.okrs];
                      okrs[i] = { ...okrs[i]!, objective };
                      return { ...f, okrs };
                    });
                  }}
                />
                <Input
                  placeholder="Key result"
                  value={okr.keyResult}
                  onChange={(e) => {
                    const keyResult = e.target.value;
                    setForm((f) => {
                      const okrs = [...f.okrs];
                      okrs[i] = { ...okrs[i]!, keyResult };
                      return { ...f, okrs };
                    });
                  }}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="w-24"
                    value={okr.progressPercent}
                    onChange={(e) => {
                      const progressPercent = Number.parseInt(e.target.value, 10) || 0;
                      setForm((f) => {
                        const okrs = [...f.okrs];
                        okrs[i] = { ...okrs[i]!, progressPercent };
                        return { ...f, okrs };
                      });
                    }}
                  />
                  <span className="self-center text-xs text-muted-foreground">% progress</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => setForm((f) => ({ ...f, okrs: f.okrs.filter((_, j) => j !== i) }))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
