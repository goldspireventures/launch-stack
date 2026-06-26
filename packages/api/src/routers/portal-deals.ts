import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db, insertStudioDealActivity, schema, withSystemStudioContext, type Database } from '@goldspire/db';
import { env } from '@goldspire/config/env';
import { getClientPortalOrigin } from '@goldspire/config/client-portal-urls';
import { createStudioDealPaymentCheckout, notifyStudioDesk, settleStudioDealPaymentLine } from '@goldspire/payments';
import { stripe, stripeEnabled } from '@goldspire/platform';
import { logAudit } from '@goldspire/audit';
import { NotFoundError } from '@goldspire/platform';
import { publicRateLimitMiddleware } from '../rate-limit-middleware';
import { router, publicProcedure } from '../trpc';

const portalProcedure = publicProcedure.use(
  publicRateLimitMiddleware({ keyPrefix: 'portal', limit: 120, windowMs: 60_000 }),
);
import {
  assertPortalScope,
  buildPortalDeliverySignoffs,
  deliveryGatePartyKeys,
  inferDeliveryPresetIdFromDeal,
  isDualSignoffStepId,
  normalizePortalScopes,
  type PortalScope,
} from '@goldspire/commercial';
import {
  SOCIAL_MATCHING_INTAKE_TEMPLATE_ID,
  emptySocialMatchingIntakeEnvelope,
  intakeStatusFromEnvelope,
  parseClientIntakeEnvelope,
  socialMatchingIntakeAnswersSchema,
  socialMatchingIntakeDraftSchema,
} from '@goldspire/validation';

const portalCtx = z.object({
  dealId: z.string().length(26),
  portalToken: z.string().min(16),
});

function hashPortalToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

interface PortalTokenContext {
  tokenId: string;
  scopes: PortalScope[];
}

async function touchPortalToken(
  tx: Database,
  dealId: string,
  rawToken: string,
  requiredScope?: PortalScope,
): Promise<PortalTokenContext> {
  const h = hashPortalToken(rawToken);
  const [row] = await tx
    .select()
    .from(schema.studioDealPortalToken)
    .where(
      and(eq(schema.studioDealPortalToken.dealId, dealId), eq(schema.studioDealPortalToken.tokenHash, h)),
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or revoked client portal link.' });
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'This portal link has expired. Ask your studio contact for a fresh link.' });
  }
  const scopes = normalizePortalScopes(row.scopes);
  if (requiredScope) {
    try {
      assertPortalScope(scopes, requiredScope);
    } catch (e) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: e instanceof Error ? e.message : 'Portal link permission denied.',
      });
    }
  }
  await tx
    .update(schema.studioDealPortalToken)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.studioDealPortalToken.id, row.id));
  return { tokenId: row.id, scopes };
}

const KICKOFF_CHECKLIST = [
  'Confirm billing contact and who can approve scope changes.',
  'Share brand assets, copy decks, analytics access, and any design references.',
  'Book a kickoff call — your studio lead will propose slots after deposit clears.',
  'Grant repository / Figma / third-party access requested in the SOW.',
  'Complete the kickoff questionnaire below so engineering can start with full context.',
] as const;

function socialEnvelopeForDeal(deal: typeof schema.studioDeal.$inferSelect) {
  if (deal.intakeTemplateId !== SOCIAL_MATCHING_INTAKE_TEMPLATE_ID) return null;
  return parseClientIntakeEnvelope(deal.clientIntake) ?? emptySocialMatchingIntakeEnvelope();
}

function mergeSocialDraft(
  deal: typeof schema.studioDeal.$inferSelect,
  patch: z.infer<typeof socialMatchingIntakeDraftSchema>,
) {
  const prev = socialEnvelopeForDeal(deal);
  if (!prev) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No intake questionnaire is enabled for this deal.' });
  const now = new Date().toISOString();
  return {
    ...prev,
    answers: { ...prev.answers, ...patch },
    startedAt: prev.startedAt ?? now,
    lastSavedAt: now,
  };
}

export const portalDealsRouter = router({
  summary: portalProcedure.input(portalCtx).query(async ({ input }) => {
    return withSystemStudioContext(db, async (tx) => {
      const portal = await touchPortalToken(tx, input.dealId, input.portalToken, 'view');
      const [deal] = await tx.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);

      const lines = await tx
        .select()
        .from(schema.studioDealPaymentLine)
        .where(eq(schema.studioDealPaymentLine.dealId, input.dealId))
        .orderBy(asc(schema.studioDealPaymentLine.sortOrder));

      const plan = deal.planSnapshot;
      const milestoneState = deal.milestoneState ?? {};
      const firstUnpaid = lines.find((l) => l.status === 'pending' || l.status === 'processing');

      let nextAction: 'accept' | 'pay' | 'track' = 'track';
      if (
        !deal.dealAcceptedAt &&
        deal.status === 'pipeline' &&
        portal.scopes.includes('accept')
      ) {
        nextAction = 'accept';
      } else if (firstUnpaid && portal.scopes.includes('pay')) {
        nextAction = 'pay';
      }

      const intakeEnvelope = socialEnvelopeForDeal(deal);
      const intakeStatus = intakeEnvelope ? intakeStatusFromEnvelope(intakeEnvelope) : null;

      const timelineRows = await tx
        .select({
          id: schema.studioDealActivity.id,
          kind: schema.studioDealActivity.kind,
          source: schema.studioDealActivity.source,
          payload: schema.studioDealActivity.payload,
          createdAt: schema.studioDealActivity.createdAt,
        })
        .from(schema.studioDealActivity)
        .where(eq(schema.studioDealActivity.dealId, input.dealId))
        .orderBy(desc(schema.studioDealActivity.createdAt))
        .limit(80);

      const presetId = inferDeliveryPresetIdFromDeal(deal);
      const acks = (deal.factoryRunbookAcks ?? {}) as Record<string, boolean>;
      const deliverySignoffs = buildPortalDeliverySignoffs(presetId, acks);

      return {
        deal: {
          id: deal.id,
          title: deal.title,
          clientName: deal.clientName,
          status: deal.status,
          engagementKind: deal.engagementKind,
          weeksMin: deal.weeksMin,
          weeksMax: deal.weeksMax,
          totalFeeMinorUnits: deal.totalFeeMinorUnits,
          currency: deal.currency,
          dealAcceptedAt: deal.dealAcceptedAt,
          stagingUrl: deal.stagingUrl,
          intakeTemplateId: deal.intakeTemplateId,
          deliveryFocus: deal.clientDeliveryFocus,
          nextDemoAt: deal.nextDemoAt,
          nextDemoUrl: deal.nextDemoUrl,
          deliveryPresetId: presetId,
        },
        deliverySignoffs,
        intake:
          deal.intakeTemplateId === 'none'
            ? null
            : {
                templateId: deal.intakeTemplateId,
                status: intakeStatus,
                envelope: intakeEnvelope,
              },
        milestones: plan.milestones.map((m) => ({
          key: m.key,
          order: m.order,
          title: m.title,
          description: m.description,
          percentBps: m.percentBps,
          amountMinorUnits: m.amountMinorUnits,
          status: milestoneState[m.key]?.status ?? 'pending',
          acceptance: m.acceptance,
        })),
        paymentLines: lines.map((l) => ({
          id: l.id,
          milestoneKey: l.milestoneKey,
          sortOrder: l.sortOrder,
          label: l.label,
          amountMinorUnits: l.amountMinorUnits,
          currency: l.currency,
          status: l.status,
        })),
        nextAction,
        portalScopes: portal.scopes,
        kickoffChecklist: [...KICKOFF_CHECKLIST],
        paymentProvider: env.PAYMENT_PROVIDER,
        timeline: timelineRows.map((r) => ({
          id: r.id,
          kind: r.kind,
          source: r.source,
          payload: r.payload,
          createdAt: r.createdAt,
        })),
      };
    });
  }),

  acceptDeal: portalProcedure.input(portalCtx).mutation(async ({ input }) => {
    return withSystemStudioContext(db, async (tx) => {
      await touchPortalToken(tx, input.dealId, input.portalToken, 'accept');
      const [deal] = await tx.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);
      if (deal.status === 'draft') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This engagement has not been shared for acceptance yet.',
        });
      }
      const now = new Date();
      if (deal.dealAcceptedAt) {
        return deal;
      }
      const [row] = await tx
        .update(schema.studioDeal)
        .set({
          dealAcceptedAt: deal.dealAcceptedAt ?? now,
          status: deal.status === 'pipeline' ? 'won' : deal.status,
          updatedAt: now,
        })
        .where(eq(schema.studioDeal.id, input.dealId))
        .returning();
      if (!row) throw new NotFoundError('studio_deal', input.dealId);

      await insertStudioDealActivity(tx, {
        dealId: deal.id,
        kind: 'deal_accepted',
        source: 'portal',
        payload: {},
      });

      await logAudit({
        tenantId: deal.linkedTenantId ?? null,
        actorId: null,
        actorRole: null,
        action: 'studio_deal_client_accepted',
        entityType: 'studio_deal',
        entityId: deal.id,
        metadata: { via: 'portal' },
      });

      void notifyStudioDesk({
        db: tx,
        kind: 'studio_deal_client_accepted',
        subject: `Client accepted · ${deal.title}`,
        body: `${deal.clientName} accepted terms in the portal. Next: deposit / kickoff.`,
        consolePath: `/deals/${deal.id}`,
        tags: { dealId: deal.id },
      });

      return row;
    });
  }),

  /** Client starts checkout for one milestone payment line (Stripe or mock redirect). */
  startPayment: portalProcedure
    .input(portalCtx.extend({ paymentLineId: z.string().length(26) }))
    .mutation(async ({ input }) => {
      return withSystemStudioContext(db, async (tx) => {
        await touchPortalToken(tx, input.dealId, input.portalToken, 'pay');
        const [deal] = await tx.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
        if (!deal) throw new NotFoundError('studio_deal', input.dealId);
        const [line] = await tx
          .select()
          .from(schema.studioDealPaymentLine)
          .where(
            and(
              eq(schema.studioDealPaymentLine.id, input.paymentLineId),
              eq(schema.studioDealPaymentLine.dealId, input.dealId),
            ),
          )
          .limit(1);
        if (!line) throw new NotFoundError('studio_deal_payment_line', input.paymentLineId);
        if (line.status !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This installment is not awaiting payment.' });
        }

        const base = getClientPortalOrigin();
        const successUrl = `${base}/deal/${deal.id}?token=${encodeURIComponent(input.portalToken)}&stripe_session={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${base}/deal/${deal.id}?token=${encodeURIComponent(input.portalToken)}&canceled=1`;

        const checkout = await createStudioDealPaymentCheckout({
          dealId: deal.id,
          paymentLineId: line.id,
          amountMinorUnits: line.amountMinorUnits,
          currency: line.currency,
          productName: `${deal.title} · ${line.label}`,
          successUrl,
          cancelUrl,
        });

        await tx
          .update(schema.studioDealPaymentLine)
          .set({
            status: 'processing',
            stripeCheckoutSessionId: checkout.sessionId,
            updatedAt: new Date(),
          })
          .where(eq(schema.studioDealPaymentLine.id, line.id));

        return { url: checkout.url, provider: checkout.provider, sessionId: checkout.sessionId };
      });
    }),

  /** After Stripe redirect, server verifies the session and settles the line. */
  confirmStripeReturn: portalProcedure
    .input(
      z.object({
        dealId: z.string().length(26),
        portalToken: z.string().min(16),
        sessionId: z.string().min(10),
      }),
    )
    .mutation(async ({ input }) => {
      if (!stripeEnabled()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Stripe is not enabled in this environment.' });
      }
      return withSystemStudioContext(db, async (tx) => {
        await touchPortalToken(tx, input.dealId, input.portalToken);
        const client = stripe();
        if (!client) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe client unavailable' });
        const session = await client.checkout.sessions.retrieve(input.sessionId);
        if (session.metadata?.studioDealId !== input.dealId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'This payment session does not match this deal.' });
        }
        if (session.payment_status !== 'paid') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment is not complete yet.' });
        }
        const lineId = session.metadata?.studioDealPaymentLineId;
        if (!lineId || typeof lineId !== 'string') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing payment line on checkout session.' });
        }

        const result = await settleStudioDealPaymentLine({
          db,
          dealId: input.dealId,
          paymentLineId: lineId,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
          externalPaidRef: `stripe_cs:${session.id}`,
          actorUserId: null,
          dealActivitySource: 'portal',
        });

        if (!result.alreadyApplied) {
          await logAudit({
            tenantId: null,
            actorId: null,
            actorRole: null,
            action: 'studio_deal_payment_settled',
            entityType: 'studio_deal',
            entityId: input.dealId,
            metadata: { source: 'stripe_portal_return', paymentLineId: lineId, sessionId: session.id },
          });
        }

        return { ok: true as const };
      });
    }),

  /** Mock-mode only: settle a line from the portal without Stripe. */
  completeDemoPayment: portalProcedure
    .input(portalCtx.extend({ paymentLineId: z.string().length(26) }))
    .mutation(async ({ input }) => {
      if (env.PAYMENT_PROVIDER !== 'mock') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Demo payments are only available when PAYMENT_PROVIDER=mock.' });
      }
      return withSystemStudioContext(db, async (tx) => {
        await touchPortalToken(tx, input.dealId, input.portalToken, 'pay');
        const ref = `portal_demo:${input.paymentLineId}:${Date.now()}`;
        await settleStudioDealPaymentLine({
          db,
          dealId: input.dealId,
          paymentLineId: input.paymentLineId,
          externalPaidRef: ref,
          actorUserId: null,
          dealActivitySource: 'portal',
        });
        const [deal] = await tx.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
        await logAudit({
          tenantId: deal?.linkedTenantId ?? null,
          actorId: null,
          actorRole: null,
          action: 'studio_deal_payment_settled',
          entityType: 'studio_deal',
          entityId: input.dealId,
          metadata: { source: 'portal_demo', paymentLineId: input.paymentLineId },
        });
        return { ok: true as const };
      });
    }),

  /** Save kickoff questionnaire draft (partial answers). Allowed any time the portal token is valid. */
  intakeSaveDraft: portalProcedure
    .input(portalCtx.extend({ answers: socialMatchingIntakeDraftSchema }))
    .mutation(async ({ input }) => {
      return withSystemStudioContext(db, async (tx) => {
        await touchPortalToken(tx, input.dealId, input.portalToken, 'intake');
        const [deal] = await tx.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
        if (!deal) throw new NotFoundError('studio_deal', input.dealId);
        if (deal.intakeTemplateId !== SOCIAL_MATCHING_INTAKE_TEMPLATE_ID) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This deal does not use a client intake questionnaire.' });
        }
        const patch = socialMatchingIntakeDraftSchema.parse(input.answers);
        const merged = mergeSocialDraft(deal, patch);
        await tx
          .update(schema.studioDeal)
          .set({ clientIntake: merged as Record<string, unknown>, updatedAt: new Date() })
          .where(eq(schema.studioDeal.id, input.dealId));

        await logAudit({
          tenantId: deal.linkedTenantId ?? null,
          actorId: null,
          actorRole: null,
          action: 'studio_deal_intake_saved',
          entityType: 'studio_deal',
          entityId: deal.id,
          metadata: { via: 'portal', templateId: deal.intakeTemplateId },
        });
        return { ok: true as const };
      });
    }),

  /** Submit final kickoff questionnaire (requires engagement accepted first). */
  intakeSubmit: portalProcedure
    .input(portalCtx.extend({ answers: socialMatchingIntakeAnswersSchema }))
    .mutation(async ({ input }) => {
      const result = await withSystemStudioContext(db, async (tx) => {
        await touchPortalToken(tx, input.dealId, input.portalToken, 'intake');
        const [deal] = await tx.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
        if (!deal) throw new NotFoundError('studio_deal', input.dealId);
        if (!deal.dealAcceptedAt) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Accept the engagement before submitting the kickoff questionnaire.',
          });
        }
        if (deal.intakeTemplateId !== SOCIAL_MATCHING_INTAKE_TEMPLATE_ID) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This deal does not use a client intake questionnaire.' });
        }
        const prev = socialEnvelopeForDeal(deal)!;
        if (prev.submittedAt) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'This questionnaire was already submitted.' });
        }
        const answers = socialMatchingIntakeAnswersSchema.parse(input.answers);
        const now = new Date().toISOString();
        const next = { ...prev, answers, submittedAt: now, lastSavedAt: now };
        await tx
          .update(schema.studioDeal)
          .set({ clientIntake: next as Record<string, unknown>, updatedAt: new Date() })
          .where(eq(schema.studioDeal.id, input.dealId));

        await insertStudioDealActivity(tx, {
          dealId: deal.id,
          kind: 'intake_submitted',
          source: 'portal',
          payload: { templateId: deal.intakeTemplateId },
        });

        await logAudit({
          tenantId: deal.linkedTenantId ?? null,
          actorId: null,
          actorRole: null,
          action: 'studio_deal_intake_submitted',
          entityType: 'studio_deal',
          entityId: deal.id,
          metadata: { via: 'portal', templateId: deal.intakeTemplateId },
        });
        return { ok: true as const, dealTitle: deal.title };
      });

      void notifyStudioDesk({
        kind: 'studio_deal_intake_submitted',
        subject: `Kickoff submitted · ${result.dealTitle}`,
        body: 'Client completed the kickoff questionnaire in the portal.',
        consolePath: `/deals/${input.dealId}`,
      });

      return { ok: result.ok };
    }),

  /** Client sign-off for Tier 2/3 delivery gates (dual sign-off — client party only). */
  signDeliveryGate: portalProcedure
    .input(
      portalCtx.extend({
        stepId: z.enum([
          'blueprint_discovery_locked',
          'architecture_signed',
          'template_spec_locked',
        ]),
        acknowledged: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      return withSystemStudioContext(db, async (tx) => {
        await touchPortalToken(tx, input.dealId, input.portalToken, 'accept');
        const [deal] = await tx.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
        if (!deal) throw new NotFoundError('studio_deal', input.dealId);
        if (!deal.dealAcceptedAt) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Accept the engagement before signing delivery gates.',
          });
        }
        if (!isDualSignoffStepId(input.stepId)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid delivery gate.' });
        }
        const presetId = inferDeliveryPresetIdFromDeal(deal);
        const allowed =
          presetId === 'tier3_blueprint' ||
          (presetId === 'tier2_template' && input.stepId === 'template_spec_locked');
        if (!allowed) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This delivery sign-off does not apply to this engagement tier.',
          });
        }
        const keys = deliveryGatePartyKeys(input.stepId);
        const next = { ...(deal.factoryRunbookAcks ?? {}) };
        if (input.acknowledged) next[keys.client] = true;
        else delete next[keys.client];

        await tx
          .update(schema.studioDeal)
          .set({ factoryRunbookAcks: next, updatedAt: new Date() })
          .where(eq(schema.studioDeal.id, input.dealId));

        await insertStudioDealActivity(tx, {
          dealId: deal.id,
          kind: 'studio_note',
          source: 'portal',
          payload: {
            note: input.acknowledged
              ? `Client signed: ${input.stepId}`
              : `Client unsigned: ${input.stepId}`,
            gateStepId: input.stepId,
            party: 'client',
          },
        });

        return { ok: true as const };
      });
    }),

  /** Client-visible note on the shared deal timeline (append-only). */
  postTimelineNote: portalProcedure
    .input(portalCtx.extend({ message: z.string().trim().min(1).max(2000) }))
    .mutation(async ({ input }) => {
      return withSystemStudioContext(db, async (tx) => {
        await touchPortalToken(tx, input.dealId, input.portalToken, 'note');
        const [deal] = await tx.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
        if (!deal) throw new NotFoundError('studio_deal', input.dealId);
        await insertStudioDealActivity(tx, {
          dealId: input.dealId,
          kind: 'client_note',
          source: 'portal',
          payload: { text: input.message },
        });
        return { ok: true as const };
      });
    }),
});
