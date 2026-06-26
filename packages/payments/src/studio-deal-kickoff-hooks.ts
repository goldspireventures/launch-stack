import type { Database } from '@goldspire/db';
import { logger } from '@goldspire/platform';

export type StudioKickoffPaidHandler = (opts: { db: Database; dealId: string }) => Promise<void>;

const handlers: StudioKickoffPaidHandler[] = [];

/** Register side effects after kickoff milestone payment settles (e.g. auto-stamp). */
export function registerStudioKickoffPaidHandler(handler: StudioKickoffPaidHandler): void {
  handlers.push(handler);
}

export async function runStudioKickoffPaidHandlers(opts: {
  db: Database;
  dealId: string;
}): Promise<void> {
  for (const handler of handlers) {
    try {
      await handler(opts);
    } catch (err) {
      logger.warn('[studio-deal] kickoff paid handler failed', { err, dealId: opts.dealId });
    }
  }
}
