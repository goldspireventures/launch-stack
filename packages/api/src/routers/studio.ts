import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { and, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import { db, schema } from '@goldspire/db';
import { hasRealProvider, env } from '@goldspire/config/env';
import { buildSalesDemoPortalUrl, STUDIO_SALES_DEMO_DEAL_ID } from '@goldspire/config/studio-sales-demo';
import {
  computeDealAttention,
  computePortfolioChurnRate,
  inferDeliveryPresetIdFromDeal,
  mergeTemplateAcceptingClones,
  primaryDealAttentionPerDeal,
  STUDIO_DELIVERY_PHASES,
  CONSOLE_SURFACE_GUIDE,
  STUDIO_POLICY_DOCS,
  RUNBOOK_BLOCKER_THRESHOLD_MS,
  sumPortfolioMrrMinor,
  studioConsoleCapabilities,
  studioHasCapability,
  ENQUIRY_PIPELINE_STATUSES,
} from '@goldspire/commercial';
import { deliverStudioTeamInvite } from '../lib/studio-team-invite';
import { withCachedJson } from '@goldspire/platform';
import { scanActiveDealRunbookBlockers } from '../lib/studio-delivery-runbook';
import { buildStudioDeskPulse } from '../lib/studio-desk-pulse';
import { listStudioEngagements } from '../lib/list-studio-engagements';
import { buildStudioEconomicsInsight } from '../lib/studio-economics';
import { buildStudioPortalPreview } from '../lib/studio-portal-preview';
import { getStudioEngagement } from '../lib/get-studio-engagement';
import { moveStudioEngagement } from '../lib/move-studio-engagement';
import { buildStudioCharterPayload } from '@goldspire/commercial';
import { buildVentureActionQueue } from './studio-lab';
import { STUDIO_PLAYBOOKS, playbookFromOverride } from '@goldspire/commercial';
import { getClientPortalOrigin } from '@goldspire/config/client-portal-urls';
import { logAudit } from '@goldspire/audit';
import {
  router,
  studioProcedure,
  studioBillingProcedure,
  studioCommercialProcedure,
  studioTeamProcedure,
} from '../trpc';
import { NotFoundError } from '@goldspire/platform';
import { PLATFORM_CAPABILITY_KEYS } from '@goldspire/access';
import { ROLES } from '@goldspire/config';
import { getStudioTenantSlug } from '@goldspire/config/studio-tenant';
import { buildLaunchReadiness } from '../lib/build-launch-readiness';
import { CONSOLE_STUDIO_PROFILE_KEY } from '../lib/studio-console-profile';

const studioProfileSchema = z.object({
  studioName: z.string().min(1).max(120),
  logoUrl: z.string().url().or(z.literal('')),
  primaryContactEmail: z.string().email(),
  supportEmail: z.string().email(),
  supportPhone: z.string().max(40),
  postalAddress: z.string().max(500),
  /** Slack or generic JSON webhook for Deal Desk ops alerts. */
  deskWebhookUrl: z.string().url().or(z.literal('')).default(''),
  deskAlertsEnabled: z.boolean().default(true),
  /** Round-robin pool for new enquiries (`assignedToUserId` on submit). */
  leadAssigneeUserIds: z.array(z.string().length(26)).max(24).default([]),
  leadAssignRoundRobinIndex: z.number().int().min(0).default(0),
  /** If enabled, kickoff payment auto-stamps the preset tenant (when possible). */
  autoStampOnKickoff: z.boolean().default(true),
  /** When converting an enquiry, issue portal link + email client (default on). */
  autoIssuePortalOnConvert: z.boolean().default(true),
  /** After auto-stamp, ensure deploy webhook secret exists for CI. */
  autoRotateDeployHookOnStamp: z.boolean().default(true),
  /** Per shipped template: false = waitlist on marketing + Desk warning on convert. */
  templateAcceptingClones: z.record(z.string(), z.boolean()).optional(),
});

export type ConsoleStudioProfile = z.infer<typeof studioProfileSchema>;

function defaultStudioProfile(tenantName: string): ConsoleStudioProfile {
  return {
    studioName: tenantName,
    logoUrl: '',
    primaryContactEmail: 'hello@goldspire.dev',
    supportEmail: 'hello@goldspire.dev',
    supportPhone: '',
    postalAddress: '',
    deskWebhookUrl: '',
    deskAlertsEnabled: true,
    leadAssigneeUserIds: [],
    leadAssignRoundRobinIndex: 0,
    autoStampOnKickoff: true,
    autoIssuePortalOnConvert: true,
    autoRotateDeployHookOnStamp: true,
    templateAcceptingClones: undefined,
  };
}

const DESK_PULSE_CACHE_KEY = 'studio:deskPulse:v1';
const DESK_PULSE_CACHE_TTL_SEC = 45;

async function portfolioMrrMinor(queryDb: typeof db): Promise<number> {
  const rows = await queryDb
    .select({
      plan: schema.subscription.plan,
      tenantId: schema.subscription.tenantId,
      amountMinorUnits: schema.subscription.amountMinorUnits,
      billingInterval: schema.subscription.billingInterval,
    })
    .from(schema.subscription)
    .where(inArray(schema.subscription.status, ['active', 'trialing']));
  return sumPortfolioMrrMinor(rows);
}

async function portfolioChurnRate(queryDb: typeof db): Promise<number | null> {
  const rows = await queryDb
    .select({
      status: schema.subscription.status,
      canceledAt: schema.subscription.canceledAt,
    })
    .from(schema.subscription);
  return computePortfolioChurnRate(rows);
}

export const studioRouter = router({
  /**
   * Studio identity + ops profile stored on the studio's own tenant row
   * (`slug = 'goldspire'`) under `metadata.consoleStudioProfile`.
   *
   * Rationale: no new tables; `metadata` is already JSON and tenant-scoped.
   * The Goldspire tenant is the canonical home for studio-internal records.
   */
  profileGet: studioProcedure.query(async ({ ctx }) => {
    const [t] = await ctx.db
      .select()
      .from(schema.tenant)
      .where(eq(schema.tenant.slug, getStudioTenantSlug()))
      .limit(1);
    if (!t) throw new NotFoundError('tenant', getStudioTenantSlug());
    const raw = (t.metadata as Record<string, unknown>)[CONSOLE_STUDIO_PROFILE_KEY];
    const parsed = studioProfileSchema.safeParse(raw);
    const base = parsed.success ? parsed.data : defaultStudioProfile(t.name);
    return {
      tenantId: t.id,
      profile: {
        ...base,
        templateAcceptingClones: mergeTemplateAcceptingClones(base.templateAcceptingClones),
      },
    };
  }),

  profileUpdate: studioProcedure.input(studioProfileSchema).mutation(async ({ ctx, input }) => {
    const canRoute = studioHasCapability(ctx.user.role, 'settings.routing');
    const canProfile = studioHasCapability(ctx.user.role, 'settings.profile');
    if (!canProfile && !canRoute) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Requires settings.profile or settings.routing',
      });
    }
    const [t] = await ctx.db
      .select()
      .from(schema.tenant)
      .where(eq(schema.tenant.slug, getStudioTenantSlug()))
      .limit(1);
    if (!t) throw new NotFoundError('tenant', getStudioTenantSlug());
    const raw = (t.metadata as Record<string, unknown>)[CONSOLE_STUDIO_PROFILE_KEY];
    const existing = studioProfileSchema.safeParse(raw);
    const prior = existing.success ? existing.data : defaultStudioProfile(t.name);
    const merged: ConsoleStudioProfile = {
      studioName: canProfile ? input.studioName : prior.studioName,
      logoUrl: canProfile ? input.logoUrl : prior.logoUrl,
      primaryContactEmail: canProfile ? input.primaryContactEmail : prior.primaryContactEmail,
      supportEmail: canProfile ? input.supportEmail : prior.supportEmail,
      supportPhone: canProfile ? input.supportPhone : prior.supportPhone,
      postalAddress: canProfile ? input.postalAddress : prior.postalAddress,
      deskWebhookUrl: canRoute ? input.deskWebhookUrl : prior.deskWebhookUrl,
      deskAlertsEnabled: canRoute ? input.deskAlertsEnabled : prior.deskAlertsEnabled,
      leadAssigneeUserIds: canRoute ? input.leadAssigneeUserIds : prior.leadAssigneeUserIds,
      leadAssignRoundRobinIndex: canRoute
        ? input.leadAssignRoundRobinIndex
        : prior.leadAssignRoundRobinIndex,
      autoStampOnKickoff: canRoute ? input.autoStampOnKickoff : prior.autoStampOnKickoff,
      autoIssuePortalOnConvert: canRoute
        ? input.autoIssuePortalOnConvert
        : prior.autoIssuePortalOnConvert ?? true,
      autoRotateDeployHookOnStamp: canRoute
        ? input.autoRotateDeployHookOnStamp
        : prior.autoRotateDeployHookOnStamp ?? true,
      templateAcceptingClones: canRoute
        ? input.templateAcceptingClones
        : prior.templateAcceptingClones,
    };
    const meta = { ...(t.metadata as Record<string, unknown>), [CONSOLE_STUDIO_PROFILE_KEY]: merged };
    const [row] = await ctx.db
      .update(schema.tenant)
      .set({ metadata: meta, updatedAt: new Date() })
      .where(eq(schema.tenant.id, t.id))
      .returning();
    if (!row) throw new NotFoundError('tenant', t.id);
    await logAudit({
      tenantId: row.id,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'studio_console_profile_updated',
      entityType: 'tenant',
      entityId: row.id,
      metadata: { keys: Object.keys(merged) },
    });
    return { tenantId: row.id, profile: merged };
  }),

  /** Production launch gates for solo-founder operating model. */
  launchReadiness: studioProcedure.query(async ({ ctx }) => {
    return buildLaunchReadiness(ctx.db);
  }),

  integrationsCatalog: studioProcedure.query(() => {
    const upstashLive = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
    return [
      {
        id: 'supabase',
        name: 'Supabase',
        mode: hasRealProvider.auth ? ('real' as const) : ('mock' as const),
        hasReal: hasRealProvider.auth,
        envKeys: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
        docsUrl: 'https://supabase.com/docs',
      },
      {
        id: 'stripe',
        name: 'Stripe',
        mode: hasRealProvider.payments ? 'real' : 'mock',
        hasReal: hasRealProvider.payments,
        envKeys: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
        docsUrl: 'https://stripe.com/docs',
      },
      {
        id: 'resend',
        name: 'Resend',
        mode: hasRealProvider.email ? 'real' : 'mock',
        hasReal: hasRealProvider.email,
        envKeys: ['RESEND_API_KEY', 'EMAIL_FROM'],
        docsUrl: 'https://resend.com/docs',
      },
      {
        id: 'inngest',
        name: 'Inngest',
        mode: hasRealProvider.jobs ? 'real' : 'mock',
        hasReal: hasRealProvider.jobs,
        envKeys: ['INNGEST_EVENT_KEY', 'INNGEST_SIGNING_KEY'],
        docsUrl: 'https://www.inngest.com/docs',
      },
      {
        id: 'posthog',
        name: 'PostHog',
        mode: hasRealProvider.analytics ? 'real' : 'mock',
        hasReal: hasRealProvider.analytics,
        envKeys: ['POSTHOG_API_KEY', 'NEXT_PUBLIC_POSTHOG_KEY'],
        docsUrl: 'https://posthog.com/docs',
      },
      {
        id: 'sentry',
        name: 'Sentry',
        mode: hasRealProvider.errors ? 'real' : 'mock',
        hasReal: hasRealProvider.errors,
        envKeys: ['SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN'],
        docsUrl: 'https://docs.sentry.io',
      },
      {
        id: 'openai',
        name: 'OpenAI',
        mode: env.AI_PROVIDER === 'openai' && !!env.OPENAI_API_KEY ? 'real' : 'mock',
        hasReal: env.AI_PROVIDER === 'openai' && !!env.OPENAI_API_KEY,
        envKeys: ['OPENAI_API_KEY', 'AI_PROVIDER'],
        docsUrl: 'https://platform.openai.com/docs',
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        mode: env.AI_PROVIDER === 'anthropic' && !!env.ANTHROPIC_API_KEY ? 'real' : 'mock',
        hasReal: env.AI_PROVIDER === 'anthropic' && !!env.ANTHROPIC_API_KEY,
        envKeys: ['ANTHROPIC_API_KEY', 'AI_PROVIDER'],
        docsUrl: 'https://docs.anthropic.com',
      },
      {
        id: 'upstash',
        name: 'Upstash Redis',
        mode: upstashLive ? 'real' : 'mock',
        hasReal: upstashLive,
        envKeys: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
        docsUrl: 'https://upstash.com/docs/redis/overall/getstarted',
      },
    ] as const;
  }),

  /** Studio Console RBAC summary for settings / onboarding staff. */
  teamAccess: studioProcedure.query(async ({ ctx }) => {
    const [studioTenant] = await ctx.db
      .select({ id: schema.tenant.id, name: schema.tenant.name })
      .from(schema.tenant)
      .where(eq(schema.tenant.slug, getStudioTenantSlug()))
      .limit(1);
    if (!studioTenant) throw new NotFoundError('tenant', getStudioTenantSlug());

    const team = await ctx.db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.user.role,
        status: schema.user.status,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .where(
        and(
          eq(schema.user.tenantId, studioTenant.id),
          inArray(schema.user.role, ['STUDIO_OWNER', 'STUDIO_STAFF']),
        ),
      )
      .orderBy(schema.user.name);

    const capabilities = studioConsoleCapabilities(ctx.user.role);

    return {
      studioTenantId: studioTenant.id,
      studioName: studioTenant.name,
      currentUser: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
      },
      team,
      capabilities,
      enquiryPipeline: ENQUIRY_PIPELINE_STATUSES,
      rules: {
        openPromotesNewToReviewing: true,
        claimUnassignedOnOpen: true,
        convertSetsConverted: true,
      },
    };
  }),

  /** Invite a studio operator (owner-only). */
  inviteTeamMember: studioTeamProcedure
    .input(
      z.object({
        email: z.string().email().max(320),
        name: z.string().min(1).max(120).optional(),
        role: z.enum(['STUDIO_OWNER', 'STUDIO_STAFF']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.role === 'STUDIO_OWNER' && ctx.user.role !== 'STUDIO_OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only studio owners can invite other owners.',
        });
      }

      const [studioTenant] = await ctx.db
        .select({ id: schema.tenant.id, slug: schema.tenant.slug })
        .from(schema.tenant)
        .where(eq(schema.tenant.slug, getStudioTenantSlug()))
        .limit(1);
      if (!studioTenant) throw new NotFoundError('tenant', getStudioTenantSlug());

      const email = input.email.trim().toLowerCase();
      const [existing] = await ctx.db
        .select({ id: schema.user.id, status: schema.user.status, role: schema.user.role })
        .from(schema.user)
        .where(and(eq(schema.user.tenantId, studioTenant.id), eq(schema.user.email, email)))
        .limit(1);

      if (existing?.status === 'active') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This email already belongs to an active team member.',
        });
      }

      const reinvitable =
        existing &&
        (existing.status === 'deleted' ||
          existing.status === 'invited' ||
          existing.status === 'suspended');

      if (existing && !reinvitable) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot invite this email while account status is "${existing.status}".`,
        });
      }

      const inviteMeta: Record<string, unknown> = {
        invitedByUserId: ctx.user.id,
        invitedAt: new Date().toISOString(),
      };
      if (existing) inviteMeta.reinvited = true;

      const rows = reinvitable
        ? await ctx.db
            .update(schema.user)
            .set({
              name: input.name ?? email.split('@')[0] ?? 'Operator',
              role: input.role,
              status: 'invited',
              authUserId: null,
              metadata: inviteMeta,
              updatedAt: new Date(),
            })
            .where(eq(schema.user.id, existing!.id))
            .returning()
        : await ctx.db
            .insert(schema.user)
            .values({
              tenantId: studioTenant.id,
              email,
              name: input.name ?? email.split('@')[0] ?? 'Operator',
              role: input.role,
              status: 'invited',
              metadata: inviteMeta,
            })
            .returning();

      const created = rows[0];
      if (!created) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not create invite.' });
      }

      const delivery = await deliverStudioTeamInvite({
        email,
        tenantSlug: studioTenant.slug,
      });

      await logAudit({
        tenantId: studioTenant.id,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'studio_team_invited',
        entityType: 'user',
        entityId: created.id,
        metadata: { email, role: input.role, deliveryMode: delivery.mode },
      });

      return {
        userId: created.id,
        email,
        role: input.role,
        status: created.status,
        delivery,
      };
    }),

  /** Revoke a pending invite (owner-only). */
  cancelTeamInvite: studioTeamProcedure
    .input(z.object({ userId: z.string().length(26) }))
    .mutation(async ({ ctx, input }) => {

      const [studioTenant] = await ctx.db
        .select({ id: schema.tenant.id })
        .from(schema.tenant)
        .where(eq(schema.tenant.slug, getStudioTenantSlug()))
        .limit(1);
      if (!studioTenant) throw new NotFoundError('tenant', getStudioTenantSlug());

      const [target] = await ctx.db
        .select()
        .from(schema.user)
        .where(and(eq(schema.user.id, input.userId), eq(schema.user.tenantId, studioTenant.id)))
        .limit(1);
      if (!target) throw new NotFoundError('user', input.userId);
      if (target.status !== 'invited') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only pending invites can be cancelled.',
        });
      }
      if (target.id === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot cancel your own account.' });
      }

      await ctx.db
        .update(schema.user)
        .set({ status: 'deleted', updatedAt: new Date() })
        .where(eq(schema.user.id, input.userId));

      await logAudit({
        tenantId: studioTenant.id,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'studio_team_invite_cancelled',
        entityType: 'user',
        entityId: input.userId,
        metadata: { email: target.email },
      });

      return { ok: true as const };
    }),

  /** Studio operators eligible for enquiry round-robin (goldspire tenant). */
  listLeadAssignees: studioProcedure.query(async ({ ctx }) => {
    const [studioTenant] = await ctx.db
      .select({ id: schema.tenant.id })
      .from(schema.tenant)
      .where(eq(schema.tenant.slug, getStudioTenantSlug()))
      .limit(1);
    if (!studioTenant) return [];
    return ctx.db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.user.role,
      })
      .from(schema.user)
      .where(
        and(
          eq(schema.user.tenantId, studioTenant.id),
          inArray(schema.user.role, ['STUDIO_OWNER', 'STUDIO_STAFF']),
        ),
      )
      .orderBy(schema.user.name);
  }),

  /** Aggregated SaaS-style billing signals for the Console settings surface. */
  billingSummary: studioBillingProcedure.query(async ({ ctx }) => {
    const [totalMrrMinor, churnRate, [activeSubs], [trialingTenants]] = await Promise.all([
      portfolioMrrMinor(ctx.db),
      portfolioChurnRate(ctx.db),
      ctx.db
        .select({ c: sql<number>`count(*)::int` })
        .from(schema.subscription)
        .where(inArray(schema.subscription.status, ['active', 'trialing'])),
      ctx.db
        .select({ c: sql<number>`count(*)::int` })
        .from(schema.tenant)
        .where(eq(schema.tenant.status, 'trial')),
    ]);
    return {
      totalMrrMinor,
      activeSubscriptions: activeSubs?.c ?? 0,
      churnRate,
      trialingTenants: trialingTenants?.c ?? 0,
    };
  }),

  /** Full business pulse for the action-first Desk (Option A). */
  deskPulse: studioProcedure.query(async ({ ctx }) => {
    const pulse = await withCachedJson(DESK_PULSE_CACHE_KEY, DESK_PULSE_CACHE_TTL_SEC, () =>
      buildStudioDeskPulse(ctx.db),
    );
    let merged = pulse;
    if (studioHasCapability(ctx.user.role, 'lab.manage')) {
      const [labQueue, [inFlightRow]] = await Promise.all([
        buildVentureActionQueue(ctx.db, 8),
        ctx.db
          .select({ c: sql<number>`count(*)::int` })
          .from(schema.studioVenture)
          .where(
            and(
              isNull(schema.studioVenture.archivedAt),
              inArray(schema.studioVenture.status, ['active', 'exploring']),
            ),
          ),
      ]);
      merged = {
        ...pulse,
        actionQueue: [...pulse.actionQueue, ...labQueue]
          .sort((a, b) => a.priority - b.priority)
          .slice(0, 24),
        lab: {
          inFlight: inFlightRow?.c ?? 0,
          needsAttention: labQueue.length,
        },
      };
    }
    if (studioHasCapability(ctx.user.role, 'billing.read')) return merged;
    return {
      ...merged,
      portfolio: { ...merged.portfolio, mrrMinor: null },
      revenue: {
        paidMonthMinor: null,
        paidMonthCount: null,
        paidAllTimeMinor: null,
        outstandingMinor: null,
        pendingPaymentLines: null,
      },
    };
  }),

  playbooksList: studioProcedure.query(async ({ ctx }) => {
    const keys = STUDIO_PLAYBOOKS.map((p) => p.key);
    const rows =
      keys.length > 0
        ? await ctx.db
            .select()
            .from(schema.marketingContentOverride)
            .where(inArray(schema.marketingContentOverride.key, keys))
        : [];
    const byKey = new Map(rows.map((r) => [r.key, r.payload]));
    return STUDIO_PLAYBOOKS.map((seed) => playbookFromOverride(seed, byKey.get(seed.key)));
  }),

  playbookGet: studioProcedure
    .input(z.object({ key: z.string().min(1).max(80) }))
    .query(async ({ ctx, input }) => {
      const seed = STUDIO_PLAYBOOKS.find((p) => p.key === input.key);
      if (!seed) throw new NotFoundError('playbook', input.key);
      const [row] = await ctx.db
        .select()
        .from(schema.marketingContentOverride)
        .where(eq(schema.marketingContentOverride.key, input.key))
        .limit(1);
      return playbookFromOverride(seed, row?.payload);
    }),

  playbookUpsert: studioCommercialProcedure
    .input(
      z.object({
        key: z.string().min(1).max(80),
        title: z.string().min(1).max(200),
        bodyMarkdown: z.string().max(80_000),
        tags: z.array(z.string().max(40)).max(12).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const seed = STUDIO_PLAYBOOKS.find((p) => p.key === input.key);
      if (!seed) throw new NotFoundError('playbook', input.key);
      const payload = {
        title: input.title,
        bodyMarkdown: input.bodyMarkdown,
        tags: input.tags ?? seed.tags,
      };
      await ctx.db
        .insert(schema.marketingContentOverride)
        .values({
          key: input.key,
          payload,
          updatedByUserId: ctx.user.id,
        })
        .onConflictDoUpdate({
          target: schema.marketingContentOverride.key,
          set: { payload, updatedByUserId: ctx.user.id, updatedAt: new Date() },
        });
      await logAudit({
        tenantId: null,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'studio_playbook_updated',
        entityType: 'marketing_content_override',
        entityId: input.key,
        metadata: { key: input.key },
      });
      return playbookFromOverride(seed, payload);
    }),

  overview: studioProcedure.query(async ({ ctx }) => {
    const greetingName = ctx.persona?.name ?? ctx.user.name ?? 'there';

    // All seven queries are independent; running them sequentially was the
    // single biggest contributor to a slow "Studio overview" load
    // (~6 × pooler round-trip on a cold connection). Parallelizing typically
    // brings this down to a single round-trip's worth of latency.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      [tenantCount],
      deploymentRows,
      mrrMinor,
      [openDealsRow],
      [newLeadsRow],
      recentActivity,
      staleTrials,
      badDeployments,
      newLeadRows,
      activeDealRows,
    ] = await Promise.all([
      ctx.db
        .select({ c: sql<number>`count(*)::int` })
        .from(schema.tenant)
        .where(isNull(schema.tenant.archivedAt)),
      ctx.db
        .select({
          healthStatus: schema.productDeployment.healthStatus,
          environment: schema.productDeployment.environment,
        })
        .from(schema.productDeployment)
        .where(isNull(schema.productDeployment.archivedAt)),
      portfolioMrrMinor(ctx.db),
      ctx.db
        .select({ c: sql<number>`count(*)::int` })
        .from(schema.studioDeal)
        .where(inArray(schema.studioDeal.status, ['draft', 'pipeline'])),
      ctx.db
        .select({ c: sql<number>`count(*)::int` })
        .from(schema.marketingLead)
        .where(eq(schema.marketingLead.status, 'new')),
      ctx.db
        .select({
          id: schema.auditLog.id,
          action: schema.auditLog.action,
          entityType: schema.auditLog.entityType,
          createdAt: schema.auditLog.createdAt,
          tenantId: schema.auditLog.tenantId,
          tenantName: schema.tenant.name,
          tenantSlug: schema.tenant.slug,
        })
        .from(schema.auditLog)
        .leftJoin(schema.tenant, eq(schema.auditLog.tenantId, schema.tenant.id))
        .orderBy(desc(schema.auditLog.createdAt))
        .limit(10),
      ctx.db
        .select({
          id: schema.tenant.id,
          name: schema.tenant.name,
          slug: schema.tenant.slug,
          createdAt: schema.tenant.createdAt,
        })
        .from(schema.tenant)
        .where(and(eq(schema.tenant.status, 'trial'), lte(schema.tenant.createdAt, cutoff))),
      ctx.db
        .select({
          tenantId: schema.productDeployment.tenantId,
          name: schema.productDeployment.name,
          healthStatus: schema.productDeployment.healthStatus,
          updatedAt: schema.productDeployment.updatedAt,
          tenantName: schema.tenant.name,
          tenantSlug: schema.tenant.slug,
        })
        .from(schema.productDeployment)
        .leftJoin(schema.tenant, eq(schema.productDeployment.tenantId, schema.tenant.id))
        .where(
          and(
            isNull(schema.productDeployment.archivedAt),
            inArray(schema.productDeployment.healthStatus, ['down', 'degraded']),
            gte(schema.productDeployment.updatedAt, weekAgo),
          ),
        )
        .limit(20),
      ctx.db
        .select({
          id: schema.marketingLead.id,
          name: schema.marketingLead.name,
          email: schema.marketingLead.email,
          templateInterest: schema.marketingLead.templateInterest,
          createdAt: schema.marketingLead.createdAt,
        })
        .from(schema.marketingLead)
        .where(eq(schema.marketingLead.status, 'new'))
        .orderBy(desc(schema.marketingLead.createdAt))
        .limit(8),
      ctx.db
        .select({
          id: schema.studioDeal.id,
          title: schema.studioDeal.title,
          status: schema.studioDeal.status,
          clientContactEmail: schema.studioDeal.clientContactEmail,
          dealAcceptedAt: schema.studioDeal.dealAcceptedAt,
          intakeTemplateId: schema.studioDeal.intakeTemplateId,
          clientIntake: schema.studioDeal.clientIntake,
          linkedTenantId: schema.studioDeal.linkedTenantId,
          stagingUrl: schema.studioDeal.stagingUrl,
          deployWebhookSecretHash: schema.studioDeal.deployWebhookSecretHash,
          factoryRunbookAcks: schema.studioDeal.factoryRunbookAcks,
          totalFeeMinorUnits: schema.studioDeal.totalFeeMinorUnits,
          weeksMin: schema.studioDeal.weeksMin,
          weeksMax: schema.studioDeal.weeksMax,
          engagementKind: schema.studioDeal.engagementKind,
          renewalDueAt: schema.studioDeal.renewalDueAt,
        })
        .from(schema.studioDeal)
        .where(inArray(schema.studioDeal.status, ['draft', 'pipeline']))
        .orderBy(desc(schema.studioDeal.updatedAt))
        .limit(40),
    ]);

    const activeDeployments = deploymentRows.filter(
      (d) => d.environment === 'production' && d.healthStatus === 'ok',
    ).length;

    const attention: { tenantId: string; name: string; slug: string; reason: string }[] = [];
    const seen = new Set<string>();
    for (const t of staleTrials) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      attention.push({
        tenantId: t.id,
        name: t.name,
        slug: t.slug,
        reason: 'Trial tenant older than 14 days',
      });
    }
    for (const d of badDeployments) {
      if (!d.tenantId || seen.has(d.tenantId)) continue;
      seen.add(d.tenantId);
      attention.push({
        tenantId: d.tenantId,
        name: d.tenantName ?? d.name,
        slug: d.tenantSlug ?? '',
        reason: `Deployment health: ${d.healthStatus}`,
      });
    }

    const portalOrigin = getClientPortalOrigin();

    const activeDealIds = activeDealRows.map((d) => d.id);
    const [portalTokenRows, paymentLineRows] =
      activeDealIds.length > 0
        ? await Promise.all([
            ctx.db
              .select({ dealId: schema.studioDealPortalToken.dealId })
              .from(schema.studioDealPortalToken)
              .where(inArray(schema.studioDealPortalToken.dealId, activeDealIds)),
            ctx.db
              .select({
                dealId: schema.studioDealPaymentLine.dealId,
                status: schema.studioDealPaymentLine.status,
              })
              .from(schema.studioDealPaymentLine)
              .where(inArray(schema.studioDealPaymentLine.dealId, activeDealIds)),
          ])
        : [[], []];

    const portalIssued = new Set(portalTokenRows.map((r) => r.dealId));
    const paymentsByDeal = new Map<string, { paid: boolean; pending: boolean }>();
    for (const line of paymentLineRows) {
      const cur = paymentsByDeal.get(line.dealId) ?? { paid: false, pending: false };
      if (line.status === 'paid') cur.paid = true;
      if (line.status === 'pending' || line.status === 'processing') cur.pending = true;
      paymentsByDeal.set(line.dealId, cur);
    }

    void scanActiveDealRunbookBlockers(ctx.db).catch(() => undefined);

    const dealAttention = primaryDealAttentionPerDeal(
      activeDealRows.flatMap((deal) => {
        const intake = deal.clientIntake as Record<string, unknown> | null;
        const intakeSubmitted =
          typeof intake?.submittedAt === 'string' && intake.submittedAt.length > 0;
        const pay = paymentsByDeal.get(deal.id) ?? { paid: false, pending: false };
        const acks = (deal.factoryRunbookAcks ?? {}) as Record<string, boolean>;
        const presetId = inferDeliveryPresetIdFromDeal(deal);
        return computeDealAttention({
          dealId: deal.id,
          title: deal.title,
          status: deal.status,
          clientContactEmail: deal.clientContactEmail,
          dealAcceptedAt: deal.dealAcceptedAt,
          intakeTemplateId: deal.intakeTemplateId,
          intakeSubmitted,
          linkedTenantId: deal.linkedTenantId,
          stagingUrl: deal.stagingUrl,
          deployHookConfigured: Boolean(deal.deployWebhookSecretHash),
          portalTokenIssued: portalIssued.has(deal.id),
          hasPaidLine: pay.paid,
          hasPendingPayment: pay.pending,
          factoryRunbookAcks: acks,
          deliveryPresetId: presetId,
          engagementKind: deal.engagementKind,
          renewalDueAt: deal.renewalDueAt,
        });
      }),
    ).slice(0, 12);

    const deskQueue = [
      ...newLeadRows.map((lead) => ({
        type: 'lead' as const,
        id: lead.id,
        title: lead.name,
        label: lead.templateInterest
          ? `New enquiry · ${lead.templateInterest}`
          : 'New enquiry',
        href: '/leads',
        priority: 5,
        subtitle: lead.email,
      })),
      ...dealAttention.map((item) => ({
        type: 'deal' as const,
        id: item.dealId,
        title: item.title,
        label: item.label,
        href: item.href,
        priority: item.priority,
        kind: item.kind,
        subtitle: null as string | null,
      })),
    ]
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 16);

    const canBilling = studioHasCapability(ctx.user.role, 'billing.read');

    return {
      greetingName,
      kpis: {
        tenants: tenantCount?.c ?? 0,
        activeDeployments,
        mrrMinor: canBilling ? mrrMinor : null,
        openDeals: openDealsRow?.c ?? 0,
      },
      desk: {
        newLeads: newLeadsRow?.c ?? 0,
        openDeals: openDealsRow?.c ?? 0,
        salesDemoDealId: STUDIO_SALES_DEMO_DEAL_ID,
        salesDemoPortalUrl: buildSalesDemoPortalUrl(portalOrigin),
        queue: deskQueue,
      },
      recentActivity,
      attentionTenants: attention.slice(0, 8),
    };
  }),

  /** Static delivery lifecycle for Console /delivery guide page. */
  deliveryGuide: studioProcedure.query(() => ({
    phases: STUDIO_DELIVERY_PHASES,
    surfaces: CONSOLE_SURFACE_GUIDE,
    policies: STUDIO_POLICY_DOCS,
    hubDocPath: 'docs/studio/internal-delivery-lifecycle.md',
    runbookBlockerThresholdHours: RUNBOOK_BLOCKER_THRESHOLD_MS / (60 * 60 * 1000),
  })),

  scanRunbookBlockers: studioProcedure.mutation(async ({ ctx }) => {
    const alertsSent = await scanActiveDealRunbookBlockers(ctx.db);
    return { ok: true as const, alertsSent };
  }),

  /** Dynamic capability overrides (see docs/platform/access-control.md). */
  accessPolicyOverrides: studioProcedure.query(async ({ ctx }) => {
    const { loadAccessPolicyOverrides } = await import('../lib/load-access-policy-overrides');
    return loadAccessPolicyOverrides(ctx.db);
  }),

  /** All override rows for Console editor (studio owner). */
  accessPolicyOverridesList: studioProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'STUDIO_OWNER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Studio owner only' });
    }
    return ctx.db
      .select()
      .from(schema.accessPolicyOverride)
      .orderBy(desc(schema.accessPolicyOverride.updatedAt));
  }),

  upsertAccessPolicyOverride: studioProcedure
    .input(
      z.object({
        id: z.string().length(26).optional(),
        tenantId: z.string().length(26).nullable().optional(),
        role: z.enum(ROLES).nullable().optional(),
        grantCapabilities: z.array(z.enum(PLATFORM_CAPABILITY_KEYS)).max(32),
        denyCapabilities: z.array(z.enum(PLATFORM_CAPABILITY_KEYS)).max(32),
        enabled: z.boolean(),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'STUDIO_OWNER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Studio owner only' });
      }

      const values = {
        tenantId: input.tenantId ?? null,
        role: input.role ?? null,
        grantCapabilities: input.grantCapabilities,
        denyCapabilities: input.denyCapabilities,
        enabled: input.enabled,
        note: input.note ?? null,
        createdByUserId: ctx.user.id,
        updatedAt: new Date(),
      };

      let row: typeof schema.accessPolicyOverride.$inferSelect;
      if (input.id) {
        const [updated] = await ctx.db
          .update(schema.accessPolicyOverride)
          .set(values)
          .where(eq(schema.accessPolicyOverride.id, input.id))
          .returning();
        if (!updated) throw new NotFoundError('access_policy_override', input.id);
        row = updated;
      } else {
        const [inserted] = await ctx.db
          .insert(schema.accessPolicyOverride)
          .values(values)
          .returning();
        if (!inserted) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Insert failed' });
        }
        row = inserted;
      }

      await logAudit({
        tenantId: values.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: input.id ? 'access_policy_override_updated' : 'access_policy_override_created',
        entityType: 'access_policy_override',
        entityId: row.id,
        metadata: {
          role: row.role,
          tenantId: row.tenantId,
          grantCount: row.grantCapabilities.length,
          denyCount: row.denyCapabilities.length,
          enabled: row.enabled,
        },
      });

      return row;
    }),

  deleteAccessPolicyOverride: studioProcedure
    .input(z.object({ id: z.string().length(26) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'STUDIO_OWNER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Studio owner only' });
      }
      const [deleted] = await ctx.db
        .delete(schema.accessPolicyOverride)
        .where(eq(schema.accessPolicyOverride.id, input.id))
        .returning();
      if (!deleted) throw new NotFoundError('access_policy_override', input.id);

      await logAudit({
        tenantId: deleted.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'access_policy_override_deleted',
        entityType: 'access_policy_override',
        entityId: deleted.id,
        metadata: { role: deleted.role, tenantId: deleted.tenantId },
      });

      return { ok: true as const };
    }),

  /** Unified client pipeline (leads + deals) for Console OS. */
  listEngagements: studioProcedure
    .input(
      z
        .object({
          column: z
            .enum(['all', 'inbound', 'qualified', 'proposal', 'delivery', 'handover', 'won'])
            .default('all'),
          search: z.string().trim().max(80).optional(),
          limit: z.number().int().min(1).max(120).default(80),
          hideTest: z.boolean().default(true),
          filter: z.enum(['all', 'needs_attention', 'stale_sla']).default('all'),
          perColumnCap: z.number().int().min(5).max(60).default(24),
        })
        .default({ column: 'all', limit: 80 }),
    )
    .query(async ({ ctx, input }) => {
      return listStudioEngagements(ctx.db, {
        column: input.column,
        search: input.search,
        limit: input.limit,
        hideTest: input.hideTest,
        filter: input.filter,
        perColumnCap: input.perColumnCap,
      });
    }),

  /** Remove Playwright/smoke enquiries (studio owner only). */
  pruneTestEnquiries: studioProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'STUDIO_OWNER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Studio owner only.' });
    }
    const rows = await ctx.db.select({ id: schema.marketingLead.id, name: schema.marketingLead.name, email: schema.marketingLead.email }).from(schema.marketingLead);
    const toDelete = rows.filter((r) => {
      const n = r.name.toLowerCase();
      const e = r.email.toLowerCase();
      return n.startsWith('e2e visitor') || n.includes('e2e visitor') || e.includes('@e2e.') || e.endsWith('@example.com');
    });
    if (toDelete.length === 0) return { deleted: 0 };
    await ctx.db.delete(schema.marketingLead).where(
      inArray(
        schema.marketingLead.id,
        toDelete.map((r) => r.id),
      ),
    );
    return { deleted: toDelete.length };
  }),

  /** Business charter — offer ladder, stop lines, gaps (Configure). */
  studioCharter: studioProcedure.query(() => buildStudioCharterPayload()),

  getEngagement: studioProcedure
    .input(z.object({ kind: z.enum(['lead', 'deal']), id: z.string().length(26) }))
    .query(async ({ ctx, input }) => getStudioEngagement(ctx.db, input)),

  moveEngagement: studioProcedure
    .input(
      z.object({
        kind: z.enum(['lead', 'deal']),
        id: z.string().length(26),
        column: z.enum(['inbound', 'qualified', 'proposal', 'delivery', 'handover', 'won']),
      }),
    )
    .mutation(async ({ ctx, input }) => moveStudioEngagement(ctx.db, input)),

  portalPreview: studioProcedure
    .input(z.object({ dealId: z.string().length(26) }))
    .query(async ({ ctx, input }) => buildStudioPortalPreview(ctx.db, input.dealId)),

  economicsInsight: studioBillingProcedure
    .input(z.object({ months: z.number().int().min(1).max(24).default(12) }).optional())
    .query(async ({ ctx, input }) => buildStudioEconomicsInsight(ctx.db, input?.months ?? 12)),

  logTimeEntry: studioProcedure
    .input(
      z.object({
        dealId: z.string().length(26).optional(),
        leadId: z.string().length(26).optional(),
        minutes: z.number().int().min(5).max(24 * 60),
        note: z.string().trim().max(500).optional(),
        loggedAt: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.dealId && !input.leadId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'dealId or leadId required.' });
      }
      const [row] = await ctx.db
        .insert(schema.studioTimeEntry)
        .values({
          dealId: input.dealId ?? null,
          leadId: input.leadId ?? null,
          minutes: input.minutes,
          note: input.note ?? null,
          loggedByUserId: ctx.user.id,
          loggedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
        })
        .returning();
      return { ok: true as const, entry: row };
    }),

  listTimeEntries: studioProcedure
    .input(
      z.object({
        dealId: z.string().length(26).optional(),
        leadId: z.string().length(26).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const filters = [];
      if (input.dealId) filters.push(eq(schema.studioTimeEntry.dealId, input.dealId));
      if (input.leadId) filters.push(eq(schema.studioTimeEntry.leadId, input.leadId));
      return ctx.db
        .select()
        .from(schema.studioTimeEntry)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(schema.studioTimeEntry.loggedAt))
        .limit(input.limit);
    }),
});
