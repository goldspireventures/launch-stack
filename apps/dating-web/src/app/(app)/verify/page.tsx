'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  LoadingState,
  PageHeader,
  Textarea,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { useModule } from '@/lib/use-flag';
import { VerificationBadge } from '@/components/verification-badge';

export default function VerifyPage() {
  const moduleOn = useModule('module.dating_verification', false);
  const product = useDatingProduct();
  const productId = product.data?.id;
  const { toast } = useToast();
  const statusQ = trpc.dating.verificationStatus.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId && moduleOn },
  );
  const submit = trpc.dating.submitVerification.useMutation();
  const [note, setNote] = React.useState('');

  if (!moduleOn) {
    return (
      <p className="text-sm text-muted-foreground">
        Verification is not enabled.{' '}
        <Link href="/profile" className="text-primary underline">
          Profile
        </Link>
      </p>
    );
  }

  if (product.isLoading || statusQ.isLoading) return <LoadingState label="Loading verification…" />;

  const v = statusQ.data?.verification ?? { status: 'none' as const };

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Get verified"
        description="Vetted members earn a badge after a quick review. This keeps Heartline thoughtful and safe."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-medium">Status</span>
            </div>
            <VerificationBadge status={v.status} />
          </div>
          {v.status === 'none' || v.status === 'rejected' ? (
            <>
              <Textarea
                placeholder="Optional note for moderators (e.g. link to LinkedIn)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <Button
                disabled={!productId || submit.isPending}
                onClick={async () => {
                  await submit.mutateAsync({ productId: productId!, note: note || undefined });
                  await statusQ.refetch();
                  toast({ title: 'Submitted for review', tone: 'success' });
                }}
              >
                Submit for verification
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {v.status === 'pending'
                ? 'Your profile is in the review queue. Most reviews complete within 24 hours.'
                : 'You are verified. Your badge appears on your profile and in discover.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
