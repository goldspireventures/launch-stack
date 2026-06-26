'use client';

import * as React from 'react';
import Link from 'next/link';
import { ExternalLink, Shield } from 'lucide-react';
import { env } from '@goldspire/config/env';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Textarea,
  Badge,
  useToast,
} from '@goldspire/ui';
import {
  SUPPORT_ACCESS_DURATION_OPTIONS,
  SUPPORT_ACCESS_SCOPE_LABEL,
  type SupportAccessScope,
} from '@goldspire/commercial';
import { trpc } from '@/lib/trpc';

export function TenantSupportAccessPanel({
  tenantId,
  tenantSlug,
  tenantName,
  personaId,
}: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  personaId: string | null;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const statusQ = trpc.supportAccess.studioAccessStatus.useQuery({ tenantId });
  const historyQ = trpc.supportAccess.listForTenant.useQuery({ tenantId });
  const scopesQ = trpc.supportAccess.scopes.useQuery();

  const [reason, setReason] = React.useState('');
  const [scope, setScope] = React.useState<SupportAccessScope>('support');
  const [durationMinutes, setDurationMinutes] = React.useState(60);

  const request = trpc.supportAccess.requestAccess.useMutation({
    onSuccess: () => {
      void utils.supportAccess.listForTenant.invalidate({ tenantId });
      void utils.supportAccess.studioAccessStatus.invalidate({ tenantId });
      toast({ title: 'Request sent', description: 'Client will approve in their Admin.', tone: 'success' });
      setReason('');
    },
    onError: (e) => toast({ title: 'Request failed', description: e.message, tone: 'danger' }),
  });

  const allowed = statusQ.data?.allowed;
  const session = statusQ.data?.session ?? historyQ.data?.activeSession;

  const adminUrl =
    allowed && session
      ? `${env.NEXT_PUBLIC_ADMIN_URL}/api/active-tenant?${new URLSearchParams({
          slug: tenantSlug,
          next: '/dashboard',
          ...(personaId ? { persona: personaId } : {}),
        }).toString()}`
      : null;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" />
          Client Admin access
        </CardTitle>
        <CardDescription>
          Admin is for {tenantName} — not Studio. Request time-bound access; they approve in their Admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allowed && adminUrl ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
            <p className="font-medium text-emerald-200">Active support session</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Expires {session?.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'soon'} ·{' '}
              {SUPPORT_ACCESS_SCOPE_LABEL[(session?.scope as SupportAccessScope) ?? 'support']}
            </p>
            <Button asChild size="sm" className="mt-3">
              <a href={adminUrl}>
                Enter client Admin
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        ) : (
          <>
            <FormField label="Why do you need access?" required>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. UAT moderation queue after launch — need to verify reports flow."
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Scope">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as SupportAccessScope)}
                >
                  {(scopesQ.data?.scopes ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Duration">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={String(durationMinutes)}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                >
                  {SUPPORT_ACCESS_DURATION_OPTIONS.map((d) => (
                    <option key={d.minutes} value={d.minutes}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <Button
              size="sm"
              disabled={request.isPending || reason.trim().length < 10}
              onClick={() =>
                request.mutate({ tenantId, reason, scope, durationMinutes })
              }
            >
              Request support access
            </Button>
          </>
        )}

        {historyQ.data?.requests?.length ? (
          <div className="border-t border-border/60 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent requests
            </p>
            <ul className="space-y-2 text-xs">
              {historyQ.data.requests.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()} — {r.scope}
                  </span>
                  <Badge variant="outline">{r.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-[11px] text-muted-foreground">
          Manage portfolio, deals, and stamping in{' '}
          <Link href="/build?tab=tenants" className="text-primary hover:underline">
            Studio Console
          </Link>
          . Never share your studio login with clients.
        </p>
      </CardContent>
    </Card>
  );
}
