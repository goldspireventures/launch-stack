'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  FadeIn,
  LoadingState,
  PageHeader,
  SlideUp,
  Stagger,
  StaggerItem,
  Textarea,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function FeedPage() {
  const { toast } = useToast();
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
      toast({ title: 'Posted', tone: 'success' });
    },
    onError: (e) => toast({ title: 'Post failed', description: e.message, tone: 'danger' }),
  });

  const [draft, setDraft] = React.useState('');

  if (products.isLoading || spaces.isLoading) return <LoadingState />;
  if (!spaceId)
    return (
      <FadeIn>
        <div className="mx-auto max-w-2xl px-6 py-12">
          <SlideUp>
            <EmptyState
              title="Pick a space first"
              description="Open a community space URL with ?spaceId=… or seed a default space for this tenant."
              className="rounded-xl border border-dashed border-border/80 bg-muted/10 py-14"
            />
          </SlideUp>
        </div>
      </FadeIn>
    );

  const space = spaces.data?.find((s) => s.id === spaceId);

  return (
    <FadeIn>
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-12">
        <SlideUp delay={0.02}>
          <PageHeader title={space?.name ?? 'Feed'} description={space?.description ?? 'Share updates with the room.'} />
        </SlideUp>
        <SlideUp delay={0.05}>
          <Card className="border-border/80 shadow-sm">
            <CardContent className="space-y-3 p-5">
              <Textarea
                placeholder="What's on your mind?"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="resize-y"
              />
              <Button disabled={!draft.trim() || post.isPending} onClick={() => post.mutate({ spaceId, body: draft.trim() })}>
                {post.isPending ? 'Posting…' : 'Post'}
              </Button>
            </CardContent>
          </Card>
        </SlideUp>
        <Stagger step={0.04} initialDelay={0.08} className="space-y-4">
          {(feed.data ?? []).map((p) => (
            <StaggerItem key={p.id}>
              <Card className="border-border/70 transition-shadow hover:shadow-sm">
                <CardContent className="space-y-2 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString()} · {p.likeCount} likes · {p.commentCount} comments
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </FadeIn>
  );
}
