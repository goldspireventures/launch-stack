'use client';

import { AlertTriangle } from 'lucide-react';
import { Badge, Button } from '@goldspire/ui';
import { SUPPORT_ACCESS_SCOPE_LABEL, type SupportAccessScope } from '@goldspire/commercial';
import { trpc } from '@/lib/trpc';

export function SupportModeBanner() {
  const sessionQ = trpc.supportAccess.activeSessionForTenant.useQuery();
  const revoke = trpc.supportAccess.revokeSession.useMutation({
    onSuccess: () => void sessionQ.refetch(),
  });

  const session = sessionQ.data?.session;
  if (!session) return null;

  const scopeLabel =
    SUPPORT_ACCESS_SCOPE_LABEL[session.scope as SupportAccessScope] ?? session.scope;
  const expires = new Date(session.expiresAt).toLocaleString();

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div>
          <p className="font-medium text-foreground">
            Goldspire support session active
            <Badge variant="outline" className="ml-2 text-[10px]">
              {scopeLabel}
            </Badge>
          </p>
          <p className="text-xs text-muted-foreground">Expires {expires}. All actions are audited.</p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={revoke.isPending}
        onClick={() => revoke.mutate({ sessionId: session.id })}
      >
        End session
      </Button>
    </div>
  );
}
