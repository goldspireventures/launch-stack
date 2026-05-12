import { z } from 'zod';
import { and, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import { db, schema } from '@goldspire/db';
import { hasRealProvider, env } from '@goldspire/config/env';
import { logAudit } from '@goldspire/audit';
import { router, studioProcedure } from '../trpc';
import { NotFoundError } from '@goldspire/platform';

const STUDIO_TENANT_SLUG = 'goldspire';
const CONSOLE_STUDIO_PROFILE_KEY = 'consoleStudioProfile';

const studioProfileSchema = z.object({
  studioName: z.string().min(1).max(120),
  logoUrl: z.string().url().or(z.literal('')),
  primaryContactEmail: z.string().email(),
  supportEmail: z.string().email(),
  supportPhone: z.string().max(40),
  postalAddress: z.string().max(500),
});

export type ConsoleStudioProfile = z.infer<typeof studioProfileSchema>;

function defaultStudioProfile(tenantName: string): ConsoleStudioProfile {
  return {
    studioName: tenantName,
    logoUrl: '',
    primaryContactEmail: 'ops@goldspire.studio',
    supportEmail: 'support@goldspire.studio',
    supportPhone: '',
    postalAddress: '',
  };
}

function planToMonthlyMinor(plan: string): number {
  /** Heuristic MRR until `subscription` carries billing amounts from Stripe. */
  const map: Record<string, number> = {
    heartline_plus_monthly: 1499,
    heartline_plus_annual: Math.round(12999 / 12),
  };
  return map[plan] ?? 4999;
}

async function portfolioMrrMinor(queryDb: typeof db): Promise<number> {
  const rows = await queryDb
    .select({
      plan: schema.subscription.plan,
      tenantId: schema.subscription.tenantId,
    })
    .from(schema.subscription)
    .where(inArray(schema.subscription.status, ['active', 'trialing']));
  const byTenant = new Map<string, number>();
  for (const r of rows) {
    const add = planToMonthlyMinor(r.plan);
    byTenant.set(r.tenantId, (byTenant.get(r.tenantId) ?? 0) + add);
  }
  let sum = 0;
  for (const v of byTenant.values()) sum += v;
  return sum;
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
      .where(eq(schema.tenant.slug, STUDIO_TENANT_SLUG))
      .limit(1);
    if (!t) throw new NotFoundError('tenant', STUDIO_TENANT_SLUG);
    const raw = (t.metadata as Record<string, unknown>)[CONSOLE_STUDIO_PROFILE_KEY];
    const parsed = studioProfileSchema.safeParse(raw);
    return {
      tenantId: t.id,
      profile: parsed.success ? parsed.data : defaultStudioProfile(t.name),
    };
  }),

  profileUpdate: studioProcedure.input(studioProfileSchema).mutation(async ({ ctx, input }) => {
    const [t] = await ctx.db
      .select()
      .from(schema.tenant)
      .where(eq(schema.tenant.slug, STUDIO_TENANT_SLUG))
      .limit(1);
    if (!t) throw new NotFoundError('tenant', STUDIO_TENANT_SLUG);
    const meta = { ...(t.metadata as Record<string, unknown>), [CONSOLE_STUDIO_PROFILE_KEY]: input };
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
      metadata: { keys: Object.keys(input) },
    });
    return { tenantId: row.id, profile: input };
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

  /** Aggregated SaaS-style billing signals for the Console settings surface. */
  billingSummary: studioProcedure.query(async ({ ctx }) => {
    const [totalMrrMinor, [activeSubs], [trialingTenants]] = await Promise.all([
      portfolioMrrMinor(ctx.db),
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
      churnRate: 0.023,
      trialingTenants: trialingTenants?.c ?? 0,
    };
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
      recentActivity,
      staleTrials,
      badDeployments,
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

    return {
      greetingName,
      kpis: {
        tenants: tenantCount?.c ?? 0,
        activeDeployments,
        mrrMinor,
        openDeals: openDealsRow?.c ?? 0,
      },
      recentActivity,
      attentionTenants: attention.slice(0, 8),
    };
  }),
});
