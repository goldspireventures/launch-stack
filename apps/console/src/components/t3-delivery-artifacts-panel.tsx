'use client';

import { useState } from 'react';
import { Button, CommandPanel, useToast } from '@goldspire/ui';
import { Copy, FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function T3DeliveryArtifactsPanel({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<'discovery' | 'architecture' | null>(null);
  const q = trpc.studioDeals.t3DeliveryArtifacts.useQuery(
    { dealId },
    { enabled: dealId.length === 26 },
  );

  if (q.isLoading) {
    return <p className="text-xs text-muted-foreground">Loading Tier 3 artifact drafts…</p>;
  }

  if (q.isError || !q.data) {
    return null;
  }

  async function copy(which: 'discovery' | 'architecture', text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copied', description: `${which} draft ready to paste.`, tone: 'success' });
  }

  return (
    <CommandPanel
      title={
        <span className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Tier 3 · Discovery & architecture drafts
        </span>
      }
      description="Generate scope + architecture markdown for client review. Lock gates in the runbook when both parties sign."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(['discovery', 'architecture'] as const).map((key) => (
          <div key={key} className="space-y-2 rounded-md border border-border/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium capitalize">{key}</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copy(key, q.data![key])}
              >
                <Copy className="mr-1 h-3 w-3" />
                {copied === key ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-2 text-[10px] leading-relaxed whitespace-pre-wrap">
              {q.data[key].slice(0, 1200)}
              {q.data[key].length > 1200 ? '\n…' : ''}
            </pre>
          </div>
        ))}
      </div>
    </CommandPanel>
  );
}
