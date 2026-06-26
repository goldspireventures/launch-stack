import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, inArray, lt, or } from 'drizzle-orm';
import { z } from 'zod';
import { db as rootDb, insertStudioDealActivity, schema } from '@goldspire/db';
import { env } from '@goldspire/config/env';
import { getClientPortalOrigin } from '@goldspire/config/client-portal-urls';
import {
  createStudioDealPaymentCheckout,
  generateDeployWebhookSecret,
  issueStudioDealPortalLink,
  notifyStudioDesk,
  prepareDealForClientPortal,
  notifyClientTimelineUpdate,
  notifyClientPortalInvite,
  settleStudioDealPaymentLine,
  sha256HexUtf8,
} from '@goldspire/payments';
import {
  MILESTONE_STATUSES,
  DEAL_PRESETS,
  buildCommercialPlan,
  commercialPlanToMarkdown,
  computeDealHealthScore,
  computeDealAttention,
  createStudioDealInputSchema,
  getDealPresetBySlug,
  getDealPresetById,
  inferDeliveryPresetIdFromDeal,
  canAcknowledgeFactoryStep,
  isFactoryAckStepId,
  t3ArtifactDraftFromPreset,
  primaryDealAttentionPerDeal,
  studioDealPlanInputSchema,
  updateStudioDealInputSchema,
  type MilestoneState,
  type MilestoneStateEntry,
  type MilestoneStatus,
} from '@goldspire/commercial';
import { logAudit } from '@goldspire/audit';
import { router, studioProcedure, requireModule } from '../trpc';
import { NotFoundError } from '@goldspire/platform';
import {
  buildDealRunbookPayload,
  persistRunbookBlockerAndNotify,
  scanActiveDealRunbookBlockers,
} from '../lib/studio-delivery-runbook';
import { launchStudioDeal, launchT1InputSchema } from '../lib/launch-studio-t1';

type StudioDealRow = typeof schema.studioDeal.$inferSelect;

/** Never expose deploy webhook secret hash to the browser. */
function sanitizeStudioDealRow(row: StudioDealRow) {
  const { deployWebhookSecretHash, ...rest } = row;
  return { ...rest, deployHookConfigured: Boolean(deployWebhookSecretHash) };
}

const studioDealsProcedure = studioProcedure.use(requireModule('module.studio_deals'));

const milestoneStatusSchema = z.enum(MILESTONE_STATUSES);

const updateMilestoneSchema = z.object({
  dealId: z.string().length(26),
  milestoneKey: z.string().min(1).max(40),
  status: milestoneStatusSchema.optional(),
  dueAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const studioDealsRouter = router({
  launchT1: studioDealsProcedure.input(launchT1InputSchema).mutation(async ({ ctx, input }) => {
    return launchStudioDeal({ db: ctx.db, actor: { id: ctx.user.id, role: ctx.user.role }, input });
  }),

  launchDeal: studioDealsProcedure.input(launchT1InputSchema).mutation(async ({ ctx, input }) => {
    return launchStudioDeal({ db: ctx.db, actor: { id: ctx.user.id, role: ctx.user.role }, input });
  }),

  listPresets: studioDealsProcedure.query(() => {
    return DEAL_PRESETS.map((p) => ({
      id: p.id,
      slug: p.slug,
      label: p.label,
      description: p.description,
      newDealHref: `/deals/new?preset=${p.slug}`,
      stampTenantHref: `/onboard?blueprint=${encodeURIComponent(p.blueprintKind)}&template=${encodeURIComponent(p.productTemplateId)}`,
    }));
  }),

  cloneRunbook: studioDealsProcedure
    .input(z.object({ dealId: z.string().length(26) }))
    .query(async ({ ctx, input }) => {
      const [deal] = await ctx.db
        .select()
        .from(schema.studioDeal)
        .where(eq(schema.studioDeal.id, input.dealId))
        .limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);

      const [portalToken] = await ctx.db
        .select({ id: schema.studioDealPortalToken.id })
        .from(schema.studioDealPortalToken)
        .where(eq(schema.studioDealPortalToken.dealId, input.dealId))
        .limit(1);

      const lines = await ctx.db
        .select({ status: schema.studioDealPaymentLine.status })
        .from(schema.studioDealPaymentLine)
        .where(eq(schema.studioDealPaymentLine.dealId, input.dealId));

      const payload = await buildDealRunbookPayload(ctx.db, deal, {
        portalTokenIssued: Boolean(portalToken),
        hasPaidLine: lines.some((l) => l.status === 'paid'),
      });

      await persistRunbookBlockerAndNotify(ctx.db, deal, payload);

      return {
        presetId: payload.presetId,
        title: payload.title,
        steps: payload.steps,
        phases: payload.phases,
        doneCount: payload.doneCount,
        totalCount: payload.totalCount,
        percent: payload.percent,
        blocker: payload.blocker,
        nextStep: payload.nextStep,
      };
    }),

  /** Markdown drafts for Tier 3 discovery + architecture gates. */
  t3DeliveryArtifacts: studioDealsProcedure
    .input(z.object({ dealId: z.string().length(26) }))
    .query(async ({ ctx, input }) => {
      const [deal] = await ctx.db
        .select()
        .from(schema.studioDeal)
        .where(eq(schema.studioDeal.id, input.dealId))
        .limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);
      const presetId = inferDeliveryPresetIdFromDeal(deal);
      if (presetId !== 'tier3_blueprint') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'T3 artifact drafts apply to Tier 3 blueprint deals only.',
        });
      }
      const preset =
        (deal.dealPresetSlug ? getDealPresetBySlug(deal.dealPresetSlug) : null) ??
        getDealPresetById('tier3_blueprint');
      if (!preset) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing Tier 3 preset on deal.' });
      }
      return t3ArtifactDraftFromPreset(preset, {
        title: deal.title,
        clientName: deal.clientName,
        weeksMin: deal.weeksMin,
        weeksMax: deal.weeksMax,
        totalFeeMinorUnits: deal.totalFeeMinorUnits,
        currency: deal.currency,
        notes: deal.notes,
      });
    }),

  /** Cron / manual: scan pipeline deals and send 48h blocker alerts. */
  scanRunbookBlockers: studioDealsProcedure.mutation(async ({ ctx }) => {
    const alerts = await scanActiveDealRunbookBlockers(ctx.db);
    return { ok: true as const, alertsSent: alerts };
  }),

  acknowledgeChecklistItem: studioDealsProcedure
    .input(
      z.object({
        dealId: z.string().length(26),
        stepId: z.string().min(1).max(64),
        acknowledged: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [deal] = await ctx.db
        .select()
        .from(schema.studioDeal)
        .where(eq(schema.studioDeal.id, input.dealId))
        .limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);

      if (!isFactoryAckStepId(input.stepId)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown checklist step: ${input.stepId}` });
      }

      if (input.acknowledged) {
        const [portalToken] = await ctx.db
          .select({ id: schema.studioDealPortalToken.id })
          .from(schema.studioDealPortalToken)
          .where(eq(schema.studioDealPortalToken.dealId, input.dealId))
          .limit(1);
        const lines = await ctx.db
          .select({ status: schema.studioDealPaymentLine.status })
          .from(schema.studioDealPaymentLine)
          .where(eq(schema.studioDealPaymentLine.dealId, input.dealId));
        const payload = await buildDealRunbookPayload(ctx.db, deal, {
          portalTokenIssued: Boolean(portalToken),
          hasPaidLine: lines.some((l) => l.status === 'paid'),
        });
        const gate = canAcknowledgeFactoryStep(payload.steps, input.stepId);
        if (!gate.allowed && gate.blockedBy) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Complete “${gate.blockedBy.label}” before marking this step done.`,
          });
        }
      }

      const next = { ...(deal.factoryRunbookAcks ?? {}) };
      if (input.acknowledged) next[input.stepId] = true;
      else delete next[input.stepId];

      await ctx.db
        .update(schema.studioDeal)
        .set({ factoryRunbookAcks: next, updatedAt: new Date() })
        .where(eq(schema.studioDeal.id, input.dealId));

      return { ok: true as const };
    }),

  /** @deprecated Use acknowledgeChecklistItem */
  acknowledgeRunbookStep: studioDealsProcedure
    .input(
      z.object({
        dealId: z.string().length(26),
        stepId: z.literal('app_scaffolded'),
        acknowledged: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [deal] = await ctx.db
        .select()
        .from(schema.studioDeal)
        .where(eq(schema.studioDeal.id, input.dealId))
        .limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);
      const next = { ...(deal.factoryRunbookAcks ?? {}) };
      if (input.acknowledged) next[input.stepId] = true;
      else delete next[input.stepId];
      await ctx.db
        .update(schema.studioDeal)
        .set({ factoryRunbookAcks: next, updatedAt: new Date() })
        .where(eq(schema.studioDeal.id, input.dealId));
      return { ok: true as const };
    }),

  /** Preview milestone splits without persisting. */
  previewPlan: studioDealsProcedure.input(studioDealPlanInputSchema).mutation(({ input }) => {
    return buildCommercialPlan(input);
  }),

  list: studioDealsProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          cursor: z
            .object({
              createdAt: z.string().datetime(),
              id: z.string().length(26),
            })
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;
      const cursorWhere = cursor
        ? or(
            lt(schema.studioDeal.createdAt, new Date(cursor.createdAt)),
            and(
              eq(schema.studioDeal.createdAt, new Date(cursor.createdAt)),
              lt(schema.studioDeal.id, cursor.id),
            ),
          )
        : undefined;
      const rows = await ctx.db
        .select()
        .from(schema.studioDeal)
        .where(cursorWhere)
        .orderBy(desc(schema.studioDeal.createdAt), desc(schema.studioDeal.id))
        .limit(limit + 1);
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];
      return {
        rows: page.map(sanitizeStudioDealRow),
        nextCursor:
          hasMore && last
            ? { createdAt: last.createdAt.toISOString(), id: last.id }
            : null,
      };
    }),

  /** Kanban columns for Deal Desk board view (draft / pipeline / won / lost). */
  pipelineBoard: studioDealsProcedure
    .input(z.object({ limitPerColumn: z.number().int().min(1).max(150).default(80) }).optional())
    .query(async ({ ctx, input }) => {
    const cap = input?.limitPerColumn ?? 80;
    const rows = await ctx.db
      .select()
      .from(schema.studioDeal)
      .where(inArray(schema.studioDeal.status, ['draft', 'pipeline', 'won', 'lost']))
      .orderBy(desc(schema.studioDeal.updatedAt))
      .limit(cap * 4);
    const sanitized = rows.map(sanitizeStudioDealRow);
    return {
      draft: sanitized.filter((d) => d.status === 'draft'),
      pipeline: sanitized.filter((d) => d.status === 'pipeline'),
      won: sanitized.filter((d) => d.status === 'won'),
      lost: sanitized.filter((d) => d.status === 'lost'),
    };
  }),

  byId: studioDealsProcedure.input(z.object({ id: z.string().length(26) })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select()
      .from(schema.studioDeal)
      .where(eq(schema.studioDeal.id, input.id))
      .limit(1);
    if (!row) throw new NotFoundError('studio_deal', input.id);
    const deal = sanitizeStudioDealRow(row);

    const [portalToken] = await ctx.db
      .select({ dealId: schema.studioDealPortalToken.dealId })
      .from(schema.studioDealPortalToken)
      .where(eq(schema.studioDealPortalToken.dealId, input.id))
      .limit(1);
    const paymentLines = await ctx.db
      .select({ status: schema.studioDealPaymentLine.status })
      .from(schema.studioDealPaymentLine)
      .where(eq(schema.studioDealPaymentLine.dealId, input.id));
    const hasPaidLine = paymentLines.some((l) => l.status === 'paid');
    const hasPendingPayment = paymentLines.some(
      (l) => l.status === 'pending' || l.status === 'processing',
    );
    const intake = row.clientIntake as Record<string, unknown> | null;
    const intakeSubmitted =
      typeof intake?.submittedAt === 'string' && intake.submittedAt.length > 0;
    const presetId = inferDeliveryPresetIdFromDeal({
      dealPresetSlug: row.dealPresetSlug,
      intakeTemplateId: row.intakeTemplateId,
      totalFeeMinorUnits: row.totalFeeMinorUnits,
      weeksMin: row.weeksMin,
      weeksMax: row.weeksMax,
      engagementKind: row.engagementKind,
    });
    const attention = primaryDealAttentionPerDeal(
      computeDealAttention({
        dealId: row.id,
        title: row.title,
        status: row.status,
        clientContactEmail: row.clientContactEmail,
        dealAcceptedAt: row.dealAcceptedAt,
        intakeTemplateId: row.intakeTemplateId,
        intakeSubmitted,
        linkedTenantId: row.linkedTenantId,
        stagingUrl: row.stagingUrl,
        deployHookConfigured: Boolean(row.deployWebhookSecretHash),
        portalTokenIssued: Boolean(portalToken),
        hasPaidLine,
        hasPendingPayment,
        factoryRunbookAcks: (row.factoryRunbookAcks ?? {}) as Record<string, boolean>,
        deliveryPresetId: presetId,
        engagementKind: row.engagementKind,
        renewalDueAt: row.renewalDueAt,
      }),
    );
    const primary = attention[0] ?? null;
    const milestones = row.planSnapshot?.milestones ?? [];
    const milestonesDone = milestones.filter(
      (m) => row.milestoneState?.[m.key]?.status === 'done',
    ).length;
    const health = computeDealHealthScore({
      status: row.status,
      primaryAttentionPriority: primary?.priority ?? null,
      milestonesDone,
      milestonesTotal: milestones.length,
      hasPaidLine,
      dealAcceptedAt: row.dealAcceptedAt,
      linkedTenantId: row.linkedTenantId,
      stagingUrl: row.stagingUrl,
    });

    return { ...deal, health, primaryAttention: primary };
  }),

  create: studioDealsProcedure.input(createStudioDealInputSchema).mutation(async ({ ctx, input }) => {
    const { title, clientName, notes, linkedTenantId, intakeTemplateId, dealPresetSlug, ...planInput } =
      input;
    const planSnapshot = buildCommercialPlan(planInput);
    const [row] = await ctx.db
      .insert(schema.studioDeal)
      .values({
        title,
        clientName,
        engagementKind: planInput.engagementKind,
        clientRisk: planInput.clientRisk,
        subcontracting: planInput.subcontracting,
        weeksMin: planInput.weeksMin,
        weeksMax: planInput.weeksMax,
        totalFeeMinorUnits: planInput.totalFeeMinorUnits,
        currency: planInput.currency,
        status: 'pipeline',
        planSnapshot,
        notes: notes ?? null,
        linkedTenantId: linkedTenantId ?? null,
        intakeTemplateId: intakeTemplateId ?? 'none',
        dealPresetSlug: dealPresetSlug ?? null,
        createdByUserId: ctx.user.id,
      })
      .returning();
    if (!row) throw new Error('failed to create studio deal');
    return sanitizeStudioDealRow(row);
  }),

  update: studioDealsProcedure.input(updateStudioDealInputSchema).mutation(async ({ ctx, input }) => {
    const { id, ...patch } = input;
    const [existing] = await ctx.db
      .select({ id: schema.studioDeal.id })
      .from(schema.studioDeal)
      .where(eq(schema.studioDeal.id, id))
      .limit(1);
    if (!existing) throw new NotFoundError('studio_deal', id);

    const setPayload: Partial<typeof schema.studioDeal.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (patch.title !== undefined) setPayload.title = patch.title;
    if (patch.clientName !== undefined) setPayload.clientName = patch.clientName;
    if (patch.notes !== undefined) setPayload.notes = patch.notes;
    if (patch.status !== undefined) setPayload.status = patch.status;
    if (patch.linkedTenantId !== undefined) setPayload.linkedTenantId = patch.linkedTenantId;
    if (patch.clientContactEmail !== undefined) {
      setPayload.clientContactEmail = patch.clientContactEmail === '' ? null : patch.clientContactEmail;
    }
    if (patch.stagingUrl !== undefined) {
      setPayload.stagingUrl = patch.stagingUrl === '' || patch.stagingUrl === null ? null : patch.stagingUrl;
    }
    if (patch.clientDeliveryFocus !== undefined) {
      setPayload.clientDeliveryFocus =
        patch.clientDeliveryFocus === '' || patch.clientDeliveryFocus === null
          ? null
          : patch.clientDeliveryFocus;
    }
    if (patch.intakeTemplateId !== undefined) setPayload.intakeTemplateId = patch.intakeTemplateId;
    if (patch.nextDemoAt !== undefined) setPayload.nextDemoAt = patch.nextDemoAt;
    if (patch.nextDemoUrl !== undefined) {
      setPayload.nextDemoUrl =
        patch.nextDemoUrl === '' || patch.nextDemoUrl === null ? null : patch.nextDemoUrl;
    }
    if (patch.renewalDueAt !== undefined) setPayload.renewalDueAt = patch.renewalDueAt;
    if (patch.dealPresetSlug !== undefined) setPayload.dealPresetSlug = patch.dealPresetSlug;

    const [row] = await ctx.db
      .update(schema.studioDeal)
      .set(setPayload)
      .where(eq(schema.studioDeal.id, id))
      .returning();
    if (!row) throw new NotFoundError('studio_deal', id);
    return sanitizeStudioDealRow(row);
  }),

  markdown: studioDealsProcedure.input(z.object({ id: z.string().length(26) })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select()
      .from(schema.studioDeal)
      .where(eq(schema.studioDeal.id, input.id))
      .limit(1);
    if (!row) throw new NotFoundError('studio_deal', input.id);
    return commercialPlanToMarkdown(row.title, row.clientName, row.planSnapshot, row.notes);
  }),

  /**
   * Patch one milestone's workflow state. Only the fields in the input are
   * touched; missing fields preserve their current value. Status transitions
   * to `done` / `skipped` stamp completedAt + completedById automatically;
   * transitioning back to `pending` / `in_progress` clears them.
   *
   * Audit-logs every change with the before/after snapshot of that milestone.
   */
  updateMilestone: studioDealsProcedure
    .input(updateMilestoneSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(schema.studioDeal)
        .where(eq(schema.studioDeal.id, input.dealId))
        .limit(1);
      if (!existing) throw new NotFoundError('studio_deal', input.dealId);

      const knownKeys = new Set(existing.planSnapshot.milestones.map((m) => m.key));
      if (!knownKeys.has(input.milestoneKey)) {
        throw new Error(`UNKNOWN_MILESTONE_KEY:${input.milestoneKey}`);
      }

      const prevState: MilestoneState = existing.milestoneState ?? {};
      const prevEntry: MilestoneStateEntry = prevState[input.milestoneKey] ?? { status: 'pending' };

      const nextStatus: MilestoneStatus = input.status ?? prevEntry.status;
      const isTerminal = nextStatus === 'done' || nextStatus === 'skipped';
      const wasTerminal = prevEntry.status === 'done' || prevEntry.status === 'skipped';

      const nextEntry: MilestoneStateEntry = {
        status: nextStatus,
        dueAt:
          input.dueAt === null
            ? undefined
            : (input.dueAt ?? prevEntry.dueAt),
        notes:
          input.notes === null
            ? undefined
            : (input.notes ?? prevEntry.notes),
        completedAt:
          isTerminal
            ? wasTerminal && prevEntry.completedAt
              ? prevEntry.completedAt
              : new Date().toISOString()
            : undefined,
        completedById:
          isTerminal
            ? wasTerminal && prevEntry.completedById
              ? prevEntry.completedById
              : ctx.user.id
            : undefined,
      };

      const nextState: MilestoneState = { ...prevState, [input.milestoneKey]: nextEntry };

      const [row] = await ctx.db
        .update(schema.studioDeal)
        .set({ milestoneState: nextState, updatedAt: new Date() })
        .where(eq(schema.studioDeal.id, input.dealId))
        .returning();
      if (!row) throw new NotFoundError('studio_deal', input.dealId);

      await logAudit({
        tenantId: existing.linkedTenantId ?? null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'studio_deal_milestone_updated',
        entityType: 'studio_deal',
        entityId: existing.id,
        metadata: {
          milestoneKey: input.milestoneKey,
          before: prevEntry,
          after: nextEntry,
        },
      });

      await insertStudioDealActivity(ctx.db, {
        dealId: input.dealId,
        kind: 'milestone_updated',
        source: 'console',
        actorUserId: ctx.user.id,
        payload: {
          milestoneKey: input.milestoneKey,
          status: nextStatus,
          notesPreview:
            nextEntry.notes && String(nextEntry.notes).trim().length > 0
              ? String(nextEntry.notes).trim().slice(0, 280)
              : undefined,
        },
      });

      return sanitizeStudioDealRow(row);
    }),

  /**
   * Activity feed for one deal. Returns deal-scoped audit rows newest-first
   * so the detail page can show "Alex marked 'kickoff' as done · 2h ago".
   */
  activity: studioDealsProcedure
    .input(z.object({ id: z.string().length(26), limit: z.number().int().min(1).max(100).default(40) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: schema.auditLog.id,
          action: schema.auditLog.action,
          metadata: schema.auditLog.metadata,
          actorId: schema.auditLog.actorId,
          actorRole: schema.auditLog.actorRole,
          createdAt: schema.auditLog.createdAt,
        })
        .from(schema.auditLog)
        .where(
          and(eq(schema.auditLog.entityId, input.id), eq(schema.auditLog.entityType, 'studio_deal')),
        )
        .orderBy(desc(schema.auditLog.createdAt))
        .limit(input.limit);

      const actorIds = [...new Set(rows.map((r) => r.actorId).filter((id): id is string => Boolean(id)))];
      const actors = actorIds.length
        ? await ctx.db
            .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email })
            .from(schema.user)
            .where(inArray(schema.user.id, actorIds))
        : [];
      const actorById = new Map(actors.map((a) => [a.id, a]));

      const paymentLineIds = new Set<string>();
      for (const r of rows) {
        if (r.action === 'studio_deal_payment_settled' || r.action === 'studio_deal_checkout_started') {
          const md = r.metadata as Record<string, unknown> | null;
          const pid = md?.paymentLineId;
          if (typeof pid === 'string' && pid.length === 26) paymentLineIds.add(pid);
        }
      }

      const paymentLineById = new Map<
        string,
        { label: string; amountMinorUnits: number; currency: string; milestoneKey: string }
      >();
      if (paymentLineIds.size > 0) {
        const lines = await ctx.db
          .select({
            id: schema.studioDealPaymentLine.id,
            label: schema.studioDealPaymentLine.label,
            amountMinorUnits: schema.studioDealPaymentLine.amountMinorUnits,
            currency: schema.studioDealPaymentLine.currency,
            milestoneKey: schema.studioDealPaymentLine.milestoneKey,
          })
          .from(schema.studioDealPaymentLine)
          .where(
            and(
              eq(schema.studioDealPaymentLine.dealId, input.id),
              inArray(schema.studioDealPaymentLine.id, [...paymentLineIds]),
            ),
          );
        for (const line of lines) {
          paymentLineById.set(line.id, {
            label: line.label,
            amountMinorUnits: line.amountMinorUnits,
            currency: line.currency,
            milestoneKey: line.milestoneKey,
          });
        }
      }

      return rows.map((r) => {
        const md = (r.metadata ?? {}) as Record<string, unknown>;
        const pid = md.paymentLineId;
        const paymentLine =
          (r.action === 'studio_deal_payment_settled' || r.action === 'studio_deal_checkout_started') &&
          typeof pid === 'string'
            ? (paymentLineById.get(pid) ?? null)
            : null;

        return {
          id: r.id,
          action: r.action,
          metadata: r.metadata,
          createdAt: r.createdAt,
          actorId: r.actorId,
          actorName: r.actorId
            ? (actorById.get(r.actorId)?.name ?? actorById.get(r.actorId)?.email ?? 'Operator')
            : 'System',
          actorRole: r.actorRole,
          paymentLine,
        };
      });
    }),

  /**
   * Client-visible delivery timeline (portal + structured console events).
   * Distinct from `activity` (raw audit log).
   */
  dealTimeline: studioDealsProcedure
    .input(z.object({ dealId: z.string().length(26), limit: z.number().int().min(1).max(120).default(60) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(schema.studioDealActivity)
        .where(eq(schema.studioDealActivity.dealId, input.dealId))
        .orderBy(desc(schema.studioDealActivity.createdAt))
        .limit(input.limit);

      const actorIds = [...new Set(rows.map((r) => r.actorUserId).filter((id): id is string => Boolean(id)))];
      const actors = actorIds.length
        ? await ctx.db
            .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email })
            .from(schema.user)
            .where(inArray(schema.user.id, actorIds))
        : [];
      const actorById = new Map(actors.map((a) => [a.id, a]));

      return rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        source: r.source,
        payload: r.payload,
        createdAt: r.createdAt,
        actorLabel:
          r.kind === 'client_note' || (r.source === 'portal' && r.kind !== 'studio_note')
            ? 'Client'
            : r.actorUserId
              ? (actorById.get(r.actorUserId)?.name ?? actorById.get(r.actorUserId)?.email ?? 'Operator')
              : 'System',
      }));
    }),

  appendDealTimelineNote: studioDealsProcedure
    .input(
      z.object({
        dealId: z.string().length(26),
        message: z.string().trim().min(1).max(2000),
        notifyClient: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [deal] = await ctx.db
        .select({
          id: schema.studioDeal.id,
          title: schema.studioDeal.title,
          clientContactEmail: schema.studioDeal.clientContactEmail,
        })
        .from(schema.studioDeal)
        .where(eq(schema.studioDeal.id, input.dealId))
        .limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);

      await insertStudioDealActivity(ctx.db, {
        dealId: input.dealId,
        kind: 'studio_note',
        source: 'console',
        actorUserId: ctx.user.id,
        payload: { text: input.message },
      });

      if (input.notifyClient !== false && deal.clientContactEmail) {
        const portalOrigin = getClientPortalOrigin();
        void notifyClientTimelineUpdate({
          dealTitle: deal.title,
          clientEmail: deal.clientContactEmail,
          message: input.message,
          portalUrl: `${portalOrigin}/deal/${deal.id}`,
        });
      }

      return { ok: true as const };
    }),

  paymentLines: studioDealsProcedure
    .input(z.object({ dealId: z.string().length(26) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(schema.studioDealPaymentLine)
        .where(eq(schema.studioDealPaymentLine.dealId, input.dealId))
        .orderBy(asc(schema.studioDealPaymentLine.sortOrder));
    }),

  syncPaymentSchedule: studioDealsProcedure
    .input(z.object({ dealId: z.string().length(26) }))
    .mutation(async ({ ctx, input }) => {
      await prepareDealForClientPortal(ctx.db, input.dealId);
      return ctx.db
        .select()
        .from(schema.studioDealPaymentLine)
        .where(eq(schema.studioDealPaymentLine.dealId, input.dealId))
        .orderBy(asc(schema.studioDealPaymentLine.sortOrder));
    }),

  createPortalLink: studioDealsProcedure
    .input(
      z.object({
        dealId: z.string().length(26),
        expiresInDays: z.number().int().min(1).max(90).optional(),
        /** Omit for full client bundle; pass `['view','note']` for read-only links. */
        scopes: z
          .array(z.enum(['view', 'accept', 'pay', 'intake', 'note']))
          .min(1)
          .optional(),
        /** Email portal URL to deal.clientContactEmail when present. */
        emailClient: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [deal] = await ctx.db
        .select()
        .from(schema.studioDeal)
        .where(eq(schema.studioDeal.id, input.dealId))
        .limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);
      const { url, rawToken: raw, expiresAt } = await issueStudioDealPortalLink({
        db: ctx.db,
        dealId: deal.id,
        expiresInDays: input.expiresInDays,
        scopes: input.scopes,
      });
      await logAudit({
        tenantId: deal.linkedTenantId ?? null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'studio_deal_portal_token_issued',
        entityType: 'studio_deal',
        entityId: deal.id,
        metadata: {
          expiresAt: expiresAt?.toISOString() ?? null,
          scopes: input.scopes ?? null,
        },
      });
      const email = deal.clientContactEmail?.trim();
      let emailed = false;
      if (input.emailClient && email && email.includes('@')) {
        void notifyClientPortalInvite({
          dealTitle: deal.title,
          clientEmail: email,
          portalUrl: url,
        });
        emailed = true;
      }
      void notifyStudioDesk({
        db: ctx.db,
        kind: 'studio_deal_portal_issued',
        subject: `Portal link issued · ${deal.title}`,
        body: emailed
          ? `Portal emailed to ${email}.`
          : `Share the client portal URL with ${deal.clientName}.`,
        consolePath: `/engagements/${deal.id}`,
        tags: { dealId: deal.id },
      });
      return { url, rawToken: raw, expiresAt, emailed };
    }),

  rotateDeployWebhookSecret: studioDealsProcedure
    .input(z.object({ dealId: z.string().length(26) }))
    .mutation(async ({ ctx, input }) => {
      const [deal] = await ctx.db
        .select()
        .from(schema.studioDeal)
        .where(eq(schema.studioDeal.id, input.dealId))
        .limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);

      const raw = generateDeployWebhookSecret();
      const hash = sha256HexUtf8(raw);
      await ctx.db
        .update(schema.studioDeal)
        .set({ deployWebhookSecretHash: hash, updatedAt: new Date() })
        .where(eq(schema.studioDeal.id, deal.id));

      const base = env.NEXT_PUBLIC_CONSOLE_URL.replace(/\/$/, '');
      const endpoint = `${base}/api/webhooks/studio-deal-deploy`;
      const curl = [
        `curl -X POST "${endpoint}?dealId=${deal.id}" \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -H "X-Studio-Deploy-Secret: ${raw}" \\`,
        `  -d '{"url":"https://staging.example.com","commitSha":"optional-git-sha"}'`,
      ].join('\n');

      await logAudit({
        tenantId: deal.linkedTenantId ?? null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'studio_deal_deploy_hook_rotated',
        entityType: 'studio_deal',
        entityId: deal.id,
        metadata: {},
      });

      return { secret: raw, endpoint, curl };
    }),

  createPaymentCheckout: studioDealsProcedure
    .input(
      z.object({
        dealId: z.string().length(26),
        paymentLineId: z.string().length(26),
        /** Embed in Stripe success/cancel URLs so the client returns to an authenticated portal session. */
        portalReturnToken: z.string().min(16),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [deal] = await ctx.db
        .select()
        .from(schema.studioDeal)
        .where(eq(schema.studioDeal.id, input.dealId))
        .limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);
      const [line] = await ctx.db
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
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'That installment is not awaiting payment.' });
      }

      const base = getClientPortalOrigin();
      const successUrl = `${base}/deal/${deal.id}?token=${encodeURIComponent(input.portalReturnToken)}&stripe_session={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${base}/deal/${deal.id}?token=${encodeURIComponent(input.portalReturnToken)}&canceled=1`;

      const checkout = await createStudioDealPaymentCheckout({
        dealId: deal.id,
        paymentLineId: line.id,
        amountMinorUnits: line.amountMinorUnits,
        currency: line.currency,
        productName: `${deal.title} · ${line.label}`,
        successUrl,
        cancelUrl,
      });

      await ctx.db
        .update(schema.studioDealPaymentLine)
        .set({
          status: 'processing',
          stripeCheckoutSessionId: checkout.sessionId,
          updatedAt: new Date(),
        })
        .where(eq(schema.studioDealPaymentLine.id, line.id));

      await logAudit({
        tenantId: deal.linkedTenantId ?? null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'studio_deal_checkout_started',
        entityType: 'studio_deal',
        entityId: deal.id,
        metadata: { paymentLineId: line.id, provider: checkout.provider },
      });

      return checkout;
    }),

  markPaymentLinePaidManual: studioDealsProcedure
    .input(z.object({ dealId: z.string().length(26), paymentLineId: z.string().length(26) }))
    .mutation(async ({ ctx, input }) => {
      const ref = `manual:${ctx.user.id}:${Date.now()}`;
      const result = await settleStudioDealPaymentLine({
        db: rootDb,
        dealId: input.dealId,
        paymentLineId: input.paymentLineId,
        externalPaidRef: ref,
        actorUserId: ctx.user.id,
        dealActivitySource: 'console',
      });
      const [deal] = await ctx.db
        .select()
        .from(schema.studioDeal)
        .where(eq(schema.studioDeal.id, input.dealId))
        .limit(1);
      await logAudit({
        tenantId: deal?.linkedTenantId ?? null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'studio_deal_payment_settled',
        entityType: 'studio_deal',
        entityId: input.dealId,
        metadata: { paymentLineId: input.paymentLineId, source: 'manual', alreadyApplied: result.alreadyApplied },
      });
      return result;
    }),

  /**
   * Rebuild `planSnapshot` and top-level fee columns from new commercial inputs,
   * clear milestone workflow, delete all installment rows, and recreate pending
   * lines from the new plan (via `prepareDealForClientPortal`).
   *
   * **Safety:** blocked while any payment line is `paid` or `processing` (waived
   * lines are removed with the delete). Portal acceptance timestamp is not cleared.
   */
  regenerateCommercialPlan: studioDealsProcedure
    .input(
      z.object({
        dealId: z.string().length(26),
        planInput: studioDealPlanInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [deal] = await ctx.db
        .select()
        .from(schema.studioDeal)
        .where(eq(schema.studioDeal.id, input.dealId))
        .limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);

      const lines = await ctx.db
        .select({ status: schema.studioDealPaymentLine.status })
        .from(schema.studioDealPaymentLine)
        .where(eq(schema.studioDealPaymentLine.dealId, input.dealId));

      const blocked = lines.some((l) => l.status === 'paid' || l.status === 'processing');
      if (blocked) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Cannot regenerate while any installment is paid or processing. Settle or reset those rows first.',
        });
      }

      const planSnapshot = buildCommercialPlan(input.planInput);

      await ctx.db.delete(schema.studioDealPaymentLine).where(eq(schema.studioDealPaymentLine.dealId, input.dealId));

      await ctx.db
        .update(schema.studioDeal)
        .set({
          planSnapshot,
          engagementKind: input.planInput.engagementKind,
          clientRisk: input.planInput.clientRisk,
          subcontracting: input.planInput.subcontracting,
          weeksMin: input.planInput.weeksMin,
          weeksMax: input.planInput.weeksMax,
          totalFeeMinorUnits: input.planInput.totalFeeMinorUnits,
          currency: input.planInput.currency,
          milestoneState: {},
          updatedAt: new Date(),
        })
        .where(eq(schema.studioDeal.id, input.dealId));

      await prepareDealForClientPortal(ctx.db, input.dealId);

      await insertStudioDealActivity(ctx.db, {
        dealId: input.dealId,
        kind: 'studio_note',
        source: 'console',
        actorUserId: ctx.user.id,
        payload: {
          text: `Commercial plan regenerated — ${input.planInput.weeksMin}–${input.planInput.weeksMax} wk, ${input.planInput.totalFeeMinorUnits} minor units ${input.planInput.currency}. Milestone workflow reset; installments recreated from the new plan.`,
        },
      });

      await logAudit({
        tenantId: deal.linkedTenantId ?? null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'studio_deal_plan_regenerated',
        entityType: 'studio_deal',
        entityId: input.dealId,
        metadata: {
          totalFeeMinorUnits: input.planInput.totalFeeMinorUnits,
          engagementKind: input.planInput.engagementKind,
          currency: input.planInput.currency,
        },
      });

      const [row] = await ctx.db.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
      if (!row) throw new NotFoundError('studio_deal', input.dealId);
      return sanitizeStudioDealRow(row);
    }),

  /** When STUDIO_DEAL_DEV_RESET_ENABLED=true — clears paid/processing lines for Stripe/portal retests. */
  devRetestToolsEnabled: studioDealsProcedure.query(() => ({
    enabled: env.STUDIO_DEAL_DEV_RESET_ENABLED === 'true',
  })),

  resetDealForRetesting: studioDealsProcedure
    .input(
      z.object({
        dealId: z.string().length(26),
        /** Type exactly to confirm (prevents mis-clicks). */
        confirm: z.literal('RESET-DEAL-FOR-RETEST'),
        clearMilestoneWorkflow: z.boolean().default(true),
        clearDealAcceptance: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (env.STUDIO_DEAL_DEV_RESET_ENABLED !== 'true') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Deal reset is disabled. Set STUDIO_DEAL_DEV_RESET_ENABLED=true on the server and restart.',
        });
      }

      const [deal] = await ctx.db.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
      if (!deal) throw new NotFoundError('studio_deal', input.dealId);

      const linesReset = await ctx.db
        .update(schema.studioDealPaymentLine)
        .set({
          status: 'pending',
          stripeCheckoutSessionId: null,
          stripePaymentIntentId: null,
          externalPaidRef: null,
          paidAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.studioDealPaymentLine.dealId, input.dealId),
            inArray(schema.studioDealPaymentLine.status, ['paid', 'processing']),
          ),
        )
        .returning({ id: schema.studioDealPaymentLine.id });

      const dealSet: Partial<typeof schema.studioDeal.$inferInsert> = { updatedAt: new Date() };
      if (input.clearMilestoneWorkflow) dealSet.milestoneState = {};
      if (input.clearDealAcceptance) dealSet.dealAcceptedAt = null;
      if (input.clearMilestoneWorkflow || input.clearDealAcceptance) {
        await ctx.db.update(schema.studioDeal).set(dealSet).where(eq(schema.studioDeal.id, input.dealId));
      } else {
        await ctx.db
          .update(schema.studioDeal)
          .set({ updatedAt: new Date() })
          .where(eq(schema.studioDeal.id, input.dealId));
      }

      await logAudit({
        tenantId: deal.linkedTenantId ?? null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'studio_deal_reset_for_retesting',
        entityType: 'studio_deal',
        entityId: input.dealId,
        metadata: {
          linesReset: linesReset.length,
          clearMilestoneWorkflow: input.clearMilestoneWorkflow,
          clearDealAcceptance: input.clearDealAcceptance,
        },
      });

      const [row] = await ctx.db.select().from(schema.studioDeal).where(eq(schema.studioDeal.id, input.dealId)).limit(1);
      if (!row) throw new NotFoundError('studio_deal', input.dealId);
      return { linesReset: linesReset.length, deal: sanitizeStudioDealRow(row) };
    }),
});
