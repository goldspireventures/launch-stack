'use client';

import * as React from 'react';
import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import {
  Button,
  Card,
  LoadingState,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useDatingProduct } from '@/lib/product';
import { appConfig } from '@/app.config';
import { pravatarUrl } from '@/lib/dating-display';

export default function LikesPage() {
  const product = useDatingProduct();
  const productId = product.data?.id;
  const likesQ = trpc.dating.whoLikedMe.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  const outboundQ = trpc.dating.outboundLikes.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );

  const plusPlan = appConfig.plans.find((p) => p.tier === 'plus');
  const plusName = plusPlan?.name ?? 'Heartline Plus';

  if (product.isLoading || likesQ.isLoading || outboundQ.isLoading) {
    return <LoadingState />;
  }

  const data = likesQ.data;
  const outbound = outboundQ.data ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Likes"
        description="See who already liked you, and review people you’ve sent a like to."
        eyebrow={<Sparkles className="inline h-3 w-3" />}
      />

      <Tabs defaultValue="inbound" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="inbound">Liked you</TabsTrigger>
          <TabsTrigger value="outbound">You liked</TabsTrigger>
        </TabsList>

        <TabsContent value="inbound" className="outline-none">
          {!data ? null : data.gated ? (
            <GatedLikesInbox count={data.count} plusName={plusName} />
          ) : (
            <Card>
              <ul className="divide-y">
                {data.users.length === 0 && (
                  <li className="px-5 py-6 text-sm text-muted-foreground">
                    Nobody has liked you yet. Freshen up your photos and prompts.
                  </li>
                )}
                {data.users.map((u) => (
                  <li key={u.fromUserId} className="flex items-center gap-3 px-5 py-3">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-primary/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.primaryPhotoUrl ?? pravatarUrl(u.fromUserId)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        Liked you {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <Link href="/discover">View in Discover</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="outbound" className="outline-none">
          <Card>
            <ul className="divide-y">
              {outbound.length === 0 ? (
                <li className="px-5 py-6 text-sm text-muted-foreground">
                  You haven’t liked anyone yet. Head to Discover to start.
                </li>
              ) : (
                outbound.map((row) => (
                  <li key={`${row.toUserId}-${String(row.createdAt)}`} className="flex items-center gap-3 px-5 py-3">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={row.primaryPhotoUrl ?? pravatarUrl(row.toUserId)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.action === 'super_like' ? 'Super like' : 'Like'} ·{' '}
                        {new Date(row.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/discover">Discover</Link>
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>

      {!data?.gated && data && data.users.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          <Lock className="mr-1 inline h-3 w-3" /> Full photos unlocked by your {plusName} access.
        </p>
      )}
    </div>
  );
}

function GatedLikesInbox({ count, plusName }: { count: number; plusName: string }) {
  const n = Math.min(count || 8, 12);
  const placeholders = Array.from({ length: Math.max(n, 4) }, (_, i) => i);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-6">
        <div className="mb-4 text-center">
          <p className="text-lg font-semibold">
            {count} {count === 1 ? 'person likes' : 'people like'} you
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upgrade to {plusName} to reveal their profiles and match faster.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {placeholders.map((i) => (
            <div
              key={i}
              className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted ring-1 ring-border/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pravatarUrl(`ghost-${i}`)}
                alt=""
                className="h-full w-full scale-110 object-cover blur-xl brightness-75"
              />
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-background/90 to-transparent p-2">
                <span className="text-[10px] font-medium text-muted-foreground">Hidden</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/premium">See who likes you · Upgrade</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
