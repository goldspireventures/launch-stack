'use client';

import { useParams } from 'next/navigation';
import { ChatWindow, LoadingState } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function ThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId ?? '';
  const me = trpc.users.me.useQuery();
  const messagesQ = trpc.messages.threadMessages.useQuery(
    { threadId, limit: 100 },
    { enabled: !!threadId },
  );
  const utils = trpc.useUtils();
  const send = trpc.messages.send.useMutation({
    async onSuccess() {
      await utils.messages.threadMessages.invalidate({ threadId });
      await utils.messages.threads.invalidate();
    },
  });

  if (me.isLoading || messagesQ.isLoading) return <LoadingState />;
  if (!me.data) return <p className="text-sm text-muted-foreground">Not authenticated.</p>;

  const messages = (messagesQ.data?.items ?? []).map((m) => ({
    id: m.id,
    senderId: m.senderId,
    body: m.body,
    createdAt: m.createdAt,
  }));

  return (
    <div className="mx-auto h-[calc(100vh-9rem)] max-w-3xl">
      <ChatWindow
        currentUserId={me.data.id}
        messages={messages}
        onSend={async (body) => {
          await send.mutateAsync({ tenantId: me.data!.tenantId, threadId, body, metadata: {} });
        }}
        emptyHint="You matched. Be the one to say hi."
      />
    </div>
  );
}
