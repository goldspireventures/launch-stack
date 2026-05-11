'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  LoadingState,
  PageHeader,
  Textarea,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function FeedPage() {
  const params = useSearchParams();
  const products = trpc.products.list.useQuery();
  const productId = products.data?.[0]?.id;
  const spaces = trpc.community.spaces.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  const spaceId = params.get('spaceId') ?? spaces.data?.[0]?.id ?? '';
  const feed = trpc.community.feed.useQuery({ spaceId }, { enabled: !!spaceId });
  const utils = trpc.useUtils();
  const post = trpc.community.createPost.useMutation({
    onSuccess: () => {
      utils.community.feed.invalidate({ spaceId });
      setDraft('');
    },
  });

  const [draft, setDraft] = React.useState('');

  if (products.isLoading || spaces.isLoading) return <LoadingState />;
  if (!spaceId)
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <EmptyState title="Pick a space first." />
      </div>
    );

  const space = spaces.data?.find((s) => s.id === spaceId);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <PageHeader title={space?.name ?? 'Feed'} description={space?.description ?? undefined} />
      <Card>
        <CardContent className="space-y-3 p-5">
          <Textarea
            placeholder="What's on your mind?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
          />
          <Button
            disabled={!draft.trim() || post.isPending}
            onClick={() => post.mutate({ spaceId, body: draft.trim() })}
          >
            {post.isPending ? 'Posting…' : 'Post'}
          </Button>
        </CardContent>
      </Card>
      {(feed.data ?? []).map((p) => (
        <Card key={p.id}>
          <CardContent className="space-y-2 p-5">
            <p className="whitespace-pre-wrap text-sm">{p.body}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(p.createdAt).toLocaleString()} · {p.likeCount} likes · {p.commentCount} comments
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
