'use client';

import * as React from 'react';
import { Badge, Button, Card, LoadingState, useToast } from '@goldspire/ui';
import { Download, RefreshCw, Send } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function LabStrategyView() {
  const { toast } = useToast();
  const recs = trpc.studioLab.strategicRecommendations.useQuery();
  const exportCsv = trpc.studioLab.exportPortfolioCsv.useQuery(undefined, { enabled: false });
  const pack = trpc.studioLab.investorPackMarkdown.useQuery(undefined, { enabled: false });

  const probe = trpc.studioLab.probeLinkedDeployments.useMutation({
    onSuccess: (r) =>
      toast({ title: 'Health probe complete', description: `${r.probed} deployment(s)`, tone: 'success' }),
  });
  const sync = trpc.studioLab.syncIntegrations.useMutation({
    onSuccess: (r) =>
      toast({ title: 'Integrations synced', description: `${r.updated} venture(s) updated`, tone: 'success' }),
  });
  const alerts = trpc.studioLab.dispatchPortfolioAlerts.useMutation({
    onSuccess: (r) =>
      toast({
        title: r.alertsSent ? 'Alert digest sent' : 'No critical alerts',
        tone: r.alertsSent ? 'success' : 'default',
      }),
  });
  const cron = trpc.studioLab.runCronPass.useMutation({
    onSuccess: (r) =>
      toast({
        title: 'Lab cron pass done',
        description: `Probed ${r.probed}, synced ${r.integrationsSynced}, alerts ${r.alertsSent}`,
        tone: 'success',
      }),
  });

  const utils = trpc.useUtils();

  const handleCsv = async () => {
    const data = await utils.studioLab.exportPortfolioCsv.fetch();
    const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goldspire-lab-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV downloaded', tone: 'success' });
  };

  const handlePack = async () => {
    const data = await utils.studioLab.investorPackMarkdown.fetch();
    const blob = new Blob([data.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goldspire-lab-investor-pack-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Investor pack downloaded', tone: 'success' });
  };

  if (recs.isLoading) return <LoadingState label="Loading strategy…" />;

  const time = recs.data?.timeAllocation;

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <p className="text-sm font-medium">Portfolio operations</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Server-side health probes, integration sync, and Desk alert digest (also runs on GitHub cron every 6h).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={probe.isPending || sync.isPending}
            onClick={() => probe.mutate()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Probe deployments
          </Button>
          <Button size="sm" variant="outline" disabled={sync.isPending} onClick={() => sync.mutate()}>
            Sync integrations
          </Button>
          <Button size="sm" variant="outline" disabled={alerts.isPending} onClick={() => alerts.mutate()}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send alert digest
          </Button>
          <Button size="sm" variant="secondary" disabled={cron.isPending} onClick={() => cron.mutate()}>
            Run full cron pass
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-medium">Export</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void handleCsv()} disabled={exportCsv.isFetching}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Portfolio CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handlePack()} disabled={pack.isFetching}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Investor pack (Markdown)
          </Button>
        </div>
      </Card>

      {time && (
        <p className="text-sm text-muted-foreground">
          Founder time allocated across ventures:{' '}
          <strong className={time.valid ? 'text-foreground' : 'text-amber-600'}>{time.total}%</strong>
          {!time.valid ? ' — rebalance to ≤100%' : ''}
        </p>
      )}

      <div>
        <p className="mb-3 text-sm font-medium">Strategic recommendations</p>
        {(recs.data?.recommendations ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommendations — portfolio looks balanced.</p>
        ) : (
          <ul className="space-y-2">
            {recs.data!.recommendations.map((r) => (
              <li key={`${r.ventureId}-${r.action}`} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.ventureName}</span>
                  <Badge variant="outline">{r.action.replace(/_/g, ' ')}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{r.rationale}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
