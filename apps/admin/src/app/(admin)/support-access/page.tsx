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
  LoadingState,
  Textarea,
  useToast,
} from '@goldspire/ui';
import { SUPPORT_ACCESS_SCOPE_LABEL, type SupportAccessScope } from '@goldspire/commercial';
import { PageHeader } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function SupportAccessPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const pendingQ = trpc.supportAccess.pendingForCurrentTenant.useQuery();
  const decide = trpc.supportAccess.decide.useMutation({
    onSuccess: (res) => {
      void utils.supportAccess.pendingForCurrentTenant.invalidate();
      void utils.supportAccess.activeSessionForTenant.invalidate();
      toast({
        title: res.session ? 'Access approved' : 'Request denied',
        tone: res.session ? 'success' : 'default',
      });
    },
    onError: (e) => toast({ title: 'Failed', description: e.message, tone: 'danger' }),
  });

  const [denyId, setDenyId] = React.useState<string | null>(null);
  const [denyReason, setDenyReason] = React.useState('');

  if (pendingQ.isLoading) return <LoadingState label="Loading requests" />;

  const pending = pendingQ.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support access"
        description="Goldspire may request time-bound access to help you launch. Approve only when you expect them to work in your Admin."
      />

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No pending requests. When Goldspire needs hands-on help, you will see a request here and in
            your dashboard banner.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {pending.map((req) => (
            <li key={req.id}>
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">Support access request</CardTitle>
                  <CardDescription>
                    Scope:{' '}
                    {SUPPORT_ACCESS_SCOPE_LABEL[req.scope as SupportAccessScope] ?? req.scope} ·{' '}
                    {req.durationMinutes} minutes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm whitespace-pre-wrap">{req.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested {new Date(req.createdAt).toLocaleString()}
                  </p>
                  {denyId === req.id ? (
                    <Textarea
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      placeholder="Optional reason for denial"
                      rows={2}
                    />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({ requestId: req.id, approve: true })
                      }
                    >
                      Approve
                    </Button>
                    {denyId !== req.id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDenyId(req.id)}
                      >
                        Deny…
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={decide.isPending}
                        onClick={() => {
                          decide.mutate({
                            requestId: req.id,
                            approve: false,
                            denialReason: denyReason.trim() || undefined,
                          });
                          setDenyId(null);
                          setDenyReason('');
                        }}
                      >
                        Confirm deny
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
