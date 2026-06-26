'use client';

import * as React from 'react';
import Link from 'next/link';
import { Gift } from 'lucide-react';
import { Button, Card, CardContent, FormField, Input, LoadingState, PageHeader, useToast } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useModule } from '@/lib/use-flag';

export default function ReferralsPage() {
  const referralsOn = useModule('module.referrals', false);
  const info = trpc.dating.referralInfo.useQuery(undefined, { enabled: referralsOn });
  const apply = trpc.dating.applyReferralCode.useMutation();
  const { toast } = useToast();
  const [friendCode, setFriendCode] = React.useState('');

  if (!referralsOn) {
    return (
      <p className="text-sm text-muted-foreground">
        Referrals are not enabled.{' '}
        <Link href="/discover" className="text-primary underline">
          Discover
        </Link>
      </p>
    );
  }

  if (info.isLoading) return <LoadingState label="Loading referrals…" />;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Invite friends"
        description="Share Heartline with people you trust. Your code tracks who you brought in."
      />
      <Card className="mb-6">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2 text-primary">
            <Gift className="h-5 w-5" />
            <span className="text-sm font-medium">Your referral code</span>
          </div>
          <p className="font-mono text-2xl tracking-wider">{info.data?.code}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(info.data?.code ?? '');
              toast({ title: 'Copied', tone: 'success' });
            }}
          >
            Copy code
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <FormField label="Were you referred? Enter their code">
            <Input value={friendCode} onChange={(e) => setFriendCode(e.target.value)} placeholder="HL-…" />
          </FormField>
          <Button
            disabled={apply.isPending || friendCode.length < 4}
            onClick={async () => {
              await apply.mutateAsync({ code: friendCode.trim() });
              toast({ title: 'Referral applied', tone: 'success' });
            }}
          >
            Apply code
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
