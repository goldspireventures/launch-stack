'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Inbox, XCircle } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  LoadingState,
  PageHeader,
  cn,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

type Filter = 'all' | 'unread' | 'mentions' | 'system';

function timeAgo(d: Date | string) {
  const t = new Date(d).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hours ago`;
  const days = Math.floor(h / 24);
  return `${days} days ago`;
}

/**
 * Feed is built in `notifications.list`: merges `notification` rows for the
 * tenant with curated `audit_log` actions so operators always see a realistic
 * stream in dev/demo (see packages/api/src/routers/notifications.ts).
 */
export default function NotificationsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Filter>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const q = trpc.notifications.list.useQuery({ limit: 50, filter });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const rows = useMemo(() => (q.data?.items ?? []).filter((i) => !dismissed.has(i.id)), [q.data?.items, dismissed]);

  if (q.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Tenant-scoped activity: in-app notifications plus high-signal audit events."
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['unread', 'Unread'],
            ['mentions', 'Mentions'],
            ['system', 'System'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={filter === key ? 'default' : 'outline'}
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              className="py-16"
              icon={Inbox}
              title="You are all caught up"
              description={
                filter === 'all'
                  ? 'No notifications or audit-derived items match this view.'
                  : `Nothing in the “${filter}” filter right now.`
              }
            />
          ) : (
            <ul className="divide-y">
              {rows.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <FeedIcon type={item.feedType} />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium leading-snug">{item.title}</p>
                        {item.source === 'audit' && (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            audit
                          </Badge>
                        )}
                      </div>
                      <p className="max-w-2xl text-sm text-muted-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
                    {item.dbNotificationId && item.readAt == null && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={markRead.isPending}
                        onClick={() => markRead.mutate({ id: item.dbNotificationId! })}
                      >
                        Mark as read
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDismissed((prev) => new Set(prev).add(item.id));
                        toast({
                          title: 'Dismissed',
                          description: 'Hidden for this session (no DB write for audit items).',
                          tone: 'default',
                        });
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FeedIcon({ type }: { type: 'info' | 'warning' | 'success' | 'urgent' }) {
  const wrap = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted/40';
  if (type === 'urgent')
    return (
      <div className={cn(wrap, 'border-destructive/30 text-destructive')}>
        <XCircle className="h-5 w-5" />
      </div>
    );
  if (type === 'warning')
    return (
      <div className={cn(wrap, 'border-warning/40 text-warning')}>
        <AlertTriangle className="h-5 w-5" />
      </div>
    );
  if (type === 'success')
    return (
      <div className={cn(wrap, 'border-success/40 text-success')}>
        <CheckCircle2 className="h-5 w-5" />
      </div>
    );
  return (
    <div className={cn(wrap, 'text-primary')}>
      <Info className="h-5 w-5" />
    </div>
  );
}
