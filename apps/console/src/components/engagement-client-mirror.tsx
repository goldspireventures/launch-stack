'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingState,
  cn,
  useToast,
} from '@goldspire/ui';
import { Eye, Link2, Mail, RefreshCw } from 'lucide-react';
import { readDealPortalUrl, storeDealPortalUrl } from '@/lib/deal-portal-session';
import { trpc } from '@/lib/trpc';

/**
 * Operator view of what the client sees — live portal preview + one-tap invite.
 */
export function EngagementClientMirror({ dealId, clientEmail }: { dealId: string; clientEmail?: string | null }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const portalUrl = readDealPortalUrl(dealId);
  const previewQ = trpc.studio.portalPreview.useQuery({ dealId }, { staleTime: 30_000 });

  const portalMut = trpc.studioDeals.createPortalLink.useMutation({
    onSuccess: (res) => {
      storeDealPortalUrl(dealId, res.url);
      void utils.studio.portalPreview.invalidate({ dealId });
      toast({
        title: clientEmail ? 'Portal link sent' : 'Portal link issued',
        description: clientEmail
          ? `Emailed ${clientEmail} and copied to clipboard.`
          : 'Copied to clipboard — add client email on the deal to auto-send.',
        tone: 'success',
      });
      void navigator.clipboard.writeText(res.url);
    },
    onError: (e) => toast({ title: 'Portal failed', description: e.message, tone: 'danger' }),
  });

  return (
    <Card className="studio-panel studio-gold-glow overflow-hidden border-primary/20">
      <CardHeader className="border-b border-border/50 bg-gradient-to-br from-primary/[0.06] to-transparent pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-primary" />
              Client mirror
            </CardTitle>
            <CardDescription className="text-xs">Live portal preview — what they see right now</CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 text-[9px] uppercase tracking-wide">
            Sync ~30s
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 text-xs">
        {clientEmail ? (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-medium text-foreground">{clientEmail}</span>
          </p>
        ) : (
          <p className="rounded-md border border-dashed border-border/60 px-2 py-1.5 text-[11px] text-muted-foreground">
            Add client email on the deal to send portal invites automatically.
          </p>
        )}

        {previewQ.isLoading ? (
          <LoadingState />
        ) : previewQ.data ? (
          <div className="space-y-2 rounded-lg border border-primary/15 bg-background/60 p-3">
            <div className="flex flex-wrap items-center gap-1">
              <Badge className="text-[9px] uppercase">{previewQ.data.nextAction}</Badge>
              <span className="text-[10px] text-muted-foreground">· {previewQ.data.defaultTab}</span>
            </div>
            <p className="text-sm font-medium leading-snug text-foreground">{previewQ.data.nextActionTitle}</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{previewQ.data.nextActionBody}</p>
            {previewQ.data.milestones.length > 0 ? (
              <ul className="mt-2 space-y-1 border-t border-border/40 pt-2">
                {previewQ.data.milestones.slice(0, 4).map((m) => (
                  <li key={m.key} className="flex justify-between gap-2 text-[10px]">
                    <span className="text-muted-foreground">{m.title}</span>
                    <span className={cn('font-medium capitalize', m.status === 'done' && 'text-primary')}>
                      {m.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {(previewQ.data.deliverySignoffs?.length ?? 0) > 0 ? (
              <ul className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Delivery sign-offs
                </p>
                {previewQ.data.deliverySignoffs.map((s) => (
                  <li key={s.stepId} className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span
                      className={cn(
                        'font-medium',
                        s.complete ? 'text-emerald-500' : 'text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {s.complete
                        ? 'Complete'
                        : `Client ${s.clientSigned ? '✓' : '—'} · Studio ${s.operatorSigned ? '✓' : '—'}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {portalUrl ? (
          <p className="break-all rounded-md border border-border/50 bg-muted/20 p-2 font-mono text-[10px] leading-relaxed">
            {portalUrl}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            size="sm"
            className="h-8 flex-1 text-xs"
            disabled={portalMut.isPending}
            onClick={() => portalMut.mutate({ dealId, emailClient: true })}
          >
            {portalMut.isPending ? (
              <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="mr-1 h-3.5 w-3.5" />
            )}
            {portalUrl ? 'Resend invite' : 'Issue portal'}
          </Button>
          {portalUrl ? (
            <Button asChild size="sm" variant="outline" className="h-8 flex-1 text-xs">
              <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                Open as client
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
