'use client';

import * as React from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, useToast } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export function EngagementTimeLog({
  dealId,
  leadId,
}: {
  dealId?: string;
  leadId?: string;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [minutes, setMinutes] = React.useState('60');
  const [note, setNote] = React.useState('');

  const log = trpc.studio.logTimeEntry.useMutation({
    onSuccess: async () => {
      toast({ title: 'Time logged', tone: 'success' });
      setNote('');
      await utils.studio.economicsInsight.invalidate();
      if (dealId) await utils.studio.listTimeEntries.invalidate({ dealId });
    },
    onError: (e) => toast({ title: 'Could not log time', description: e.message, tone: 'danger' }),
  });

  return (
    <Card className="border-border/80 bg-muted/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Engaged time</CardTitle>
        <CardDescription className="text-xs">Feeds Insight €/hour — charter primary metric</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[10px] text-muted-foreground">Minutes</label>
          <Input
            type="number"
            min={5}
            max={1440}
            className="h-8 w-24 text-xs"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-[10px] text-muted-foreground">Note (optional)</label>
          <Input
            className="h-8 text-xs"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kickoff, build, QA…"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={log.isPending}
          onClick={() => {
            const m = Number(minutes);
            if (!Number.isFinite(m) || m < 5) return;
            log.mutate({
              dealId,
              leadId,
              minutes: Math.round(m),
              note: note.trim() || undefined,
            });
          }}
        >
          Log
        </Button>
      </CardContent>
    </Card>
  );
}
