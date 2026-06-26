'use client';

import * as React from 'react';
import { trpc } from '@/lib/trpc';
import { useFlag } from '@/lib/use-flag';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

/**
 * Live chat: Supabase Realtime on `message` inserts when configured;
 * otherwise faster polling when the realtime pack flag is on.
 */
export function useRealtimeMessages(threadId: string | undefined) {
  const realtimeOn = useFlag('feature.dating_realtime_chat', false);
  const utils = trpc.useUtils();
  const sb = getSupabaseBrowser();

  React.useEffect(() => {
    if (!threadId || !realtimeOn) return;

    if (sb) {
      const channel = sb
        .channel(`thread:${threadId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message',
            filter: `thread_id=eq.${threadId}`,
          },
          () => {
            void utils.messages.threadMessages.invalidate({ threadId });
            void utils.messages.threads.invalidate();
          },
        )
        .subscribe();
      return () => {
        void sb.removeChannel(channel);
      };
    }

    const ms = 4_000;
    const id = setInterval(() => {
      void utils.messages.threadMessages.invalidate({ threadId });
      void utils.messages.threads.invalidate();
    }, ms);
    return () => clearInterval(id);
  }, [threadId, realtimeOn, sb, utils.messages.threadMessages, utils.messages.threads]);

  return { realtimeOn, supabaseReady: Boolean(sb) };
}
