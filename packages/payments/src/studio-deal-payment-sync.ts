import type Stripe from 'stripe';
import { and, eq } from 'drizzle-orm';
import { schema, withSystemStudioContext, insertStudioDealActivity, type Database } from '@goldspire/db';
import type { MilestoneState, MilestoneStateEntry } from '@goldspire/commercial';
import { logger } from '@goldspire/platform';
import { notifyDealPaymentSettled } from './studio-deal-notify';
import { notifyStudioDesk } from './studio-desk-notify';
import { parseStudioDealCheckoutMetadata } from './studio-deal-payment-metadata';
import { maybeSuggestTenantStampAfterPayment } from './studio-deal-stamp-suggest';
import { runStudioKickoffPaidHandlers } from './studio-deal-kickoff-hooks';

/** Milestones that auto-complete when their linked payment line is settled (objective gates). */
const MILESTONE_KEYS_AUTO_DONE_ON_PAYMENT = new Set(['kickoff']);

export type DealPaymentNotifyPayload = {
  dealTitle: string;
  clientEmail: string | null | undefined;
  milestoneLabel: string;
  amountMinor: number;
  currency: string;
};

type SettleInnerResult = {
  alreadyApplied: boolean;
  milestoneKey: string | null;
  notify?: DealPaymentNotifyPayload;
};

/**
 * Mark a deal payment line paid and optionally advance milestone workflow.
 * Idempotent when `externalPaidRef` was already applied to the same line.
 */
export async function settleStudioDealPaymentLine(opts: {
  db: Database;
  dealId: string;
  paymentLineId: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  externalPaidRef: string;
  actorUserId?: string | null;
  /** When a line newly moves to `paid`, append a client-visible timeline row. */
  dealActivitySource?: 'portal' | 'console' | 'system';
}): Promise<{ alreadyApplied: boolean; milestoneKey: string | null }> {
  const inner = await withSystemStudioContext(opts.db, async (tx): Promise<SettleInnerResult> => {
    const [line] = await tx
      .select()
      .from(schema.studioDealPaymentLine)
      .where(
        and(
          eq(schema.studioDealPaymentLine.id, opts.paymentLineId),
          eq(schema.studioDealPaymentLine.dealId, opts.dealId),
        ),
      )
      .limit(1);
    if (!line) {
      logger.warn('[studio-deal] payment line not found', { ...opts });
      return { alreadyApplied: true, milestoneKey: null };
    }
    if (line.externalPaidRef === opts.externalPaidRef && line.status === 'paid') {
      return { alreadyApplied: true, milestoneKey: line.milestoneKey };
    }
    if (line.status === 'paid') {
      logger.info('[studio-deal] line already paid with different ref — skipping', {
        lineId: line.id,
        externalPaidRef: opts.externalPaidRef,
      });
      return { alreadyApplied: true, milestoneKey: line.milestoneKey };
    }

    const paidAt = new Date();
    await tx
      .update(schema.studioDealPaymentLine)
      .set({
        status: 'paid',
        paidAt,
        stripeCheckoutSessionId: opts.stripeSessionId ?? line.stripeCheckoutSessionId,
        stripePaymentIntentId: opts.stripePaymentIntentId ?? line.stripePaymentIntentId,
        externalPaidRef: opts.externalPaidRef,
        updatedAt: paidAt,
      })
      .where(eq(schema.studioDealPaymentLine.id, line.id));

    await insertStudioDealActivity(tx, {
      dealId: opts.dealId,
      kind: 'payment_settled',
      source: opts.dealActivitySource ?? 'system',
      actorUserId: opts.actorUserId ?? null,
      payload: {
        paymentLineId: line.id,
        milestoneKey: line.milestoneKey,
        label: line.label,
        amountMinorUnits: line.amountMinorUnits,
        currency: line.currency,
      },
    });

    const [deal] = await tx.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, opts.dealId)).limit(1);
    if (!deal) {
      return { alreadyApplied: false, milestoneKey: line.milestoneKey };
    }

    const prevState: MilestoneState = deal.milestoneState ?? {};
    let nextState: MilestoneState = prevState;

    if (MILESTONE_KEYS_AUTO_DONE_ON_PAYMENT.has(line.milestoneKey)) {
      const prevEntry: MilestoneStateEntry = prevState[line.milestoneKey] ?? { status: 'pending' };
      if (prevEntry.status !== 'done' && prevEntry.status !== 'skipped') {
        const terminal: MilestoneStateEntry = {
          status: 'done',
          completedAt: paidAt.toISOString(),
          completedById: opts.actorUserId ?? undefined,
        };
        nextState = { ...prevState, [line.milestoneKey]: { ...prevEntry, ...terminal } };
        await tx
          .update(schema.studioDeal)
          .set({ milestoneState: nextState, updatedAt: paidAt })
          .where(eq(schema.studioDeal.id, deal.id));
      }
    }

    const notify: DealPaymentNotifyPayload = {
      dealTitle: deal.title,
      clientEmail: deal.clientContactEmail,
      milestoneLabel: line.label,
      amountMinor: line.amountMinorUnits,
      currency: line.currency,
    };

    return { alreadyApplied: false, milestoneKey: line.milestoneKey, notify };
  });

  if (!inner.alreadyApplied && inner.milestoneKey === 'kickoff') {
    void maybeSuggestTenantStampAfterPayment({
      db: opts.db,
      dealId: opts.dealId,
      milestoneKey: inner.milestoneKey,
      actorUserId: opts.actorUserId ?? null,
    }).catch(() => undefined);

    void runStudioKickoffPaidHandlers({ db: opts.db, dealId: opts.dealId }).catch(() => undefined);
  }

  if (inner.notify) {
    void notifyDealPaymentSettled(inner.notify).catch(() => {
      /* logged inside notify */
    });
    void notifyStudioDesk({
      db: opts.db,
      kind: 'studio_deal_payment',
      subject: `Payment received · ${inner.notify.dealTitle}`,
      body: [
        `${inner.notify.milestoneLabel}: ${(inner.notify.amountMinor / 100).toFixed(2)} ${inner.notify.currency}`,
        inner.notify.clientEmail ? `Client: ${inner.notify.clientEmail}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      consolePath: `/deals/${opts.dealId}`,
    });
  }

  return { alreadyApplied: inner.alreadyApplied, milestoneKey: inner.milestoneKey };
}

export type StudioDealCheckoutApplyResult = 'not_studio_deal' | 'duplicate' | 'settled';

/**
 * Handle Stripe `checkout.session.completed` for studio deal one-time payments.
 * Returns whether this session was a studio-deal checkout, and whether this call newly settled the line.
 */
export async function tryApplyStudioDealCheckoutSession(
  db: Database,
  session: Stripe.Checkout.Session,
): Promise<StudioDealCheckoutApplyResult> {
  const meta = parseStudioDealCheckoutMetadata(session.metadata);
  if (!meta.dealId || !meta.paymentLineId) return 'not_studio_deal';
  if (session.mode !== 'payment') return 'not_studio_deal';

  const paidRef = `stripe_cs:${session.id}`;
  const { alreadyApplied } = await settleStudioDealPaymentLine({
    db,
    dealId: meta.dealId,
    paymentLineId: meta.paymentLineId,
    stripeSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id,
    externalPaidRef: paidRef,
    actorUserId: null,
    dealActivitySource: 'system',
  });
  return alreadyApplied ? 'duplicate' : 'settled';
}
