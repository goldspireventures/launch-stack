'use client';

import * as React from 'react';
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
  Switch,
  useToast,
} from '@goldspire/ui';
import { PLATFORM_CAPABILITY_KEYS } from '@goldspire/access';
import { ROLES } from '@goldspire/config';
import { trpc } from '@/lib/trpc';

type OverrideRow = {
  id: string;
  tenantId: string | null;
  role: (typeof ROLES)[number] | null;
  grantCapabilities: string[];
  denyCapabilities: string[];
  enabled: boolean;
  note: string | null;
};

const EMPTY_FORM = {
  id: '' as string | undefined,
  tenantId: '',
  role: '',
  grantCapabilities: [] as string[],
  denyCapabilities: [] as string[],
  enabled: true,
  note: '',
};

function CapabilityPicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (cap: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {PLATFORM_CAPABILITY_KEYS.map((cap) => {
        const on = selected.includes(cap);
        return (
          <li key={cap}>
            <button
              type="button"
              className={`rounded-md border px-2 py-0.5 font-mono text-[10px] ${
                on ? 'border-primary bg-primary/10 text-primary' : 'border-muted bg-background'
              }`}
              onClick={() => onToggle(cap)}
            >
              {cap}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function AccessPolicyPanel() {
  const toast = useToast();
  const utils = trpc.useUtils();
  const listQ = trpc.studio.accessPolicyOverridesList.useQuery();
  const upsertMut = trpc.studio.upsertAccessPolicyOverride.useMutation({
    onSuccess: () => {
      void utils.studio.accessPolicyOverridesList.invalidate();
      void utils.studio.accessPolicyOverrides.invalidate();
      toast.toast({ title: 'Policy override saved', tone: 'success' });
      setForm(EMPTY_FORM);
      setEditing(false);
    },
    onError: (e) => toast.toast({ title: 'Save failed', description: e.message, tone: 'danger' }),
  });
  const deleteMut = trpc.studio.deleteAccessPolicyOverride.useMutation({
    onSuccess: () => {
      void utils.studio.accessPolicyOverridesList.invalidate();
      void utils.studio.accessPolicyOverrides.invalidate();
      toast.toast({ title: 'Override removed', tone: 'success' });
    },
    onError: (e) => toast.toast({ title: 'Delete failed', description: e.message, tone: 'danger' }),
  });

  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);

  function loadRow(row: OverrideRow) {
    setForm({
      id: row.id,
      tenantId: row.tenantId ?? '',
      role: row.role ?? '',
      grantCapabilities: [...row.grantCapabilities],
      denyCapabilities: [...row.denyCapabilities],
      enabled: row.enabled,
      note: row.note ?? '',
    });
    setEditing(true);
  }

  function toggleCap(list: 'grantCapabilities' | 'denyCapabilities', cap: string) {
    const current = form[list];
    const next = current.includes(cap) ? current.filter((c) => c !== cap) : [...current, cap];
    setForm({ ...form, [list]: next });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    upsertMut.mutate({
      id: form.id || undefined,
      tenantId: form.tenantId.trim() ? form.tenantId.trim() : null,
      role: form.role ? (form.role as (typeof ROLES)[number]) : null,
      grantCapabilities: form.grantCapabilities as (typeof PLATFORM_CAPABILITY_KEYS)[number][],
      denyCapabilities: form.denyCapabilities as (typeof PLATFORM_CAPABILITY_KEYS)[number][],
      enabled: form.enabled,
      note: form.note.trim() || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access policy overrides</CardTitle>
          <CardDescription>
            Grant or deny capabilities per tenant and/or role without code changes. Merged at Atlas
            and Console evaluation time — see docs/platform/access-control.md.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading overrides…</p>
          ) : (listQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No overrides yet.</p>
          ) : (
            <ul className="space-y-2">
              {(listQ.data ?? []).map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {row.role ?? 'any role'}
                      {row.tenantId ? ` · tenant ${row.tenantId.slice(0, 8)}…` : ' · global'}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.grantCapabilities.map((c) => (
                        <Badge key={`g-${c}`} variant="default" className="font-mono text-[10px]">
                          +{c}
                        </Badge>
                      ))}
                      {row.denyCapabilities.map((c) => (
                        <Badge key={`d-${c}`} variant="destructive" className="font-mono text-[10px]">
                          −{c}
                        </Badge>
                      ))}
                    </div>
                    {!row.enabled ? (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        disabled
                      </Badge>
                    ) : null}
                    {row.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">{row.note}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadRow(row as OverrideRow)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={deleteMut.isPending}
                      onClick={() => deleteMut.mutate({ id: row.id })}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editing ? 'Edit override' : 'New override'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="max-w-2xl space-y-4" onSubmit={submit}>
            <FormField label="Tenant ID" htmlFor="apo-tenant" description="Blank = all tenants.">
              <Input
                id="apo-tenant"
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                placeholder="26-char ULID or empty"
              />
            </FormField>
            <FormField label="Role" htmlFor="apo-role" description="Blank = all roles.">
              <select
                id="apo-role"
                className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="">Any role</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </FormField>
            <div>
              <p className="mb-2 text-sm font-medium">Grant capabilities</p>
              <CapabilityPicker
                selected={form.grantCapabilities}
                onToggle={(cap) => toggleCap('grantCapabilities', cap)}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Deny capabilities</p>
              <CapabilityPicker
                selected={form.denyCapabilities}
                onToggle={(cap) => toggleCap('denyCapabilities', cap)}
              />
            </div>
            <FormField label="Note" htmlFor="apo-note">
              <Input
                id="apo-note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Why this override exists"
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.enabled}
                onCheckedChange={(enabled) => setForm({ ...form, enabled })}
              />
              Enabled
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={upsertMut.isPending}>
                {upsertMut.isPending ? 'Saving…' : editing ? 'Update override' : 'Create override'}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
