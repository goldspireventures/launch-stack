'use client';

import { ShieldAlert, UserX } from 'lucide-react';
import { Button, useToast } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useFlag } from '@/lib/use-flag';

export function TrustActions({
  productId,
  targetUserId,
  targetLabel,
  surface,
}: {
  productId: string;
  targetUserId: string;
  targetLabel: string;
  surface: 'discover' | 'profile' | 'chat';
}) {
  const blockOn = useFlag('feature.dating_block_user', false);
  const reportOn = useFlag('feature.dating_report_surfaces', false);
  const { toast } = useToast();
  const block = trpc.dating.blockUser.useMutation();
  const report = trpc.reports.create.useMutation();

  if (!blockOn && !(reportOn && surface !== 'chat')) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {blockOn && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={block.isPending}
          onClick={async () => {
            try {
              await block.mutateAsync({ productId, blockedUserId: targetUserId });
              toast({ title: `Blocked ${targetLabel}`, tone: 'success' });
            } catch (e) {
              toast({
                title: 'Block failed',
                description: e instanceof Error ? e.message : undefined,
                tone: 'danger',
              });
            }
          }}
        >
          <UserX className="mr-1.5 h-3.5 w-3.5" />
          Block
        </Button>
      )}
      {(reportOn || surface === 'chat') && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={report.isPending}
          onClick={async () => {
            try {
              await report.mutateAsync({
                targetType: 'user',
                targetId: targetUserId,
                reason: 'harassment',
                details: `Report from ${surface}`,
                metadata: { surface, productId },
              });
              toast({ title: 'Report submitted', tone: 'success' });
            } catch (e) {
              toast({
                title: 'Report failed',
                description: e instanceof Error ? e.message : undefined,
                tone: 'danger',
              });
            }
          }}
        >
          <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
          Report
        </Button>
      )}
    </div>
  );
}
