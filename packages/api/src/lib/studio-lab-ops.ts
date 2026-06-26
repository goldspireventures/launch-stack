import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import { env } from '@goldspire/config/env';
import { getStudioTenantSlug } from '@goldspire/config/studio-tenant';
import {
  buildVenturePortfolioAlerts,
  ventureEffectiveMrrMinor,
} from '@goldspire/commercial';
import type { VentureIntegrationState } from '@goldspire/commercial';
import { notifyStudioDesk } from '@goldspire/payments';
import { logger } from '@goldspire/platform';
import { loadTenantMrrMap } from './venture-economics';

const PROBE_TIMEOUT_MS = 8_000;
const LAB_DIGEST_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function probeUrlForDeployment(row: {
  environment: string;
  url: string | null;
  localDevUrl: string | null;
}): string | null {
  if (row.environment === 'production' && row.url?.startsWith('http')) return row.url;
  if (row.localDevUrl?.startsWith('http')) return row.localDevUrl;
  if (row.url?.startsWith('http')) return row.url;
  return null;
}

async function probeUrl(url: string): Promise<'ok' | 'degraded' | 'down'> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Goldspire-Lab-Health-Probe/1.0' },
    });
    if (res.status >= 500) return 'down';
    if (res.status >= 400) return 'degraded';
    return 'ok';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

export type LabHealthProbeResult = {
  deploymentId: string;
  ventureId: string | null;
  status: 'ok' | 'degraded' | 'down';
  url: string;
};

/**
 * Server-side health probes for ventures with linked deployments.
 * Updates `product_deployment` and venture `integration_state.lastHealthProbe`.
 */
export async function probeVentureLinkedDeployments(db: Database): Promise<LabHealthProbeResult[]> {
  const ventures = await db
    .select({
      id: schema.studioVenture.id,
      linkedDeploymentId: schema.studioVenture.linkedDeploymentId,
      integrationState: schema.studioVenture.integrationState,
    })
    .from(schema.studioVenture)
    .where(
      and(isNull(schema.studioVenture.archivedAt), isNotNull(schema.studioVenture.linkedDeploymentId)),
    );

  const results: LabHealthProbeResult[] = [];
  const depIds = [
    ...new Set(
      ventures.map((v) => v.linkedDeploymentId).filter((id): id is string => Boolean(id)),
    ),
  ];
  if (depIds.length === 0) return results;

  const deps = await db
    .select()
    .from(schema.productDeployment)
    .where(isNull(schema.productDeployment.archivedAt));

  const depById = new Map(deps.map((d) => [d.id, d]));

  for (const v of ventures) {
    const depId = v.linkedDeploymentId;
    if (!depId) continue;
    const dep = depById.get(depId);
    if (!dep) continue;
    const url = probeUrlForDeployment(dep);
    if (!url) continue;

    const status = await probeUrl(url);
    const at = new Date().toISOString();

    await db
      .update(schema.productDeployment)
      .set({
        healthStatus: status,
        lastHealthCheckAt: new Date(),
        lastHealthMessage: `Lab probe: ${status}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.productDeployment.id, depId));

    const prev = (v.integrationState ?? {}) as VentureIntegrationState;
    await db
      .update(schema.studioVenture)
      .set({
        integrationState: {
          ...prev,
          lastHealthProbe: { status, at, deploymentId: depId },
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.studioVenture.id, v.id));

    results.push({ deploymentId: depId, ventureId: v.id, status, url });
  }

  return results;
}

/**
 * Refresh integration_state from tenant MRR, manual MRR, and KPI-derived analytics.
 */
export async function syncVentureIntegrations(db: Database): Promise<number> {
  const tenantMrrMap = await loadTenantMrrMap(db);
  const rows = await db
    .select()
    .from(schema.studioVenture)
    .where(isNull(schema.studioVenture.archivedAt));

  const now = new Date().toISOString();
  let updated = 0;

  for (const v of rows) {
    const prev = (v.integrationState ?? {}) as VentureIntegrationState;
    const next: VentureIntegrationState = { ...prev };

    if (v.linkedTenantId) {
      const minor = tenantMrrMap.get(v.linkedTenantId);
      if (minor != null) {
        next.tenantMrr = {
          minor,
          currency: (v.manualMrrCurrency ?? 'eur').toLowerCase(),
          syncedAt: now,
        };
      }
    }

    if (v.manualMrrMinor != null) {
      next.stripe = {
        reportedMrrMinor: v.manualMrrMinor,
        syncedAt: now,
        source: 'manual',
      };
      next.appStore = {
        reportedMrrMinor: v.manualMrrMinor,
        syncedAt: now,
      };
    }

    const mauMetric = (v.metrics ?? []).find(
      (m) => m.key === 'mau' || m.label.toLowerCase().includes('mau'),
    );
    const mauParsed = mauMetric ? Number.parseInt(mauMetric.value.replace(/[^\d]/g, ''), 10) : NaN;
    next.analytics = {
      mau: Number.isFinite(mauParsed) ? mauParsed : null,
      syncedAt: now,
      provider: env.POSTHOG_API_KEY ? 'posthog_configured' : 'kpi_manual',
    };

    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      await db
        .update(schema.studioVenture)
        .set({ integrationState: next, updatedAt: new Date() })
        .where(eq(schema.studioVenture.id, v.id));
      updated += 1;
    }
  }

  return updated;
}

const CONSOLE_STUDIO_PROFILE_KEY = 'consoleStudioProfile';

function parseLastLabDigest(metadata: Record<string, unknown> | null | undefined): number | null {
  const raw = metadata?.[CONSOLE_STUDIO_PROFILE_KEY];
  if (!raw || typeof raw !== 'object') return null;
  const at = (raw as Record<string, unknown>).lastLabDigestAt;
  if (typeof at !== 'string') return null;
  const ms = Date.parse(at);
  return Number.isNaN(ms) ? null : ms;
}

async function markLabDigestSent(db: Database): Promise<void> {
  const [t] = await db
    .select({ id: schema.tenant.id, metadata: schema.tenant.metadata })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, getStudioTenantSlug()))
    .limit(1);
  if (!t) return;
  const meta = (t.metadata ?? {}) as Record<string, unknown>;
  const profile = (meta[CONSOLE_STUDIO_PROFILE_KEY] ?? {}) as Record<string, unknown>;
  await db
    .update(schema.tenant)
    .set({
      metadata: {
        ...meta,
        [CONSOLE_STUDIO_PROFILE_KEY]: {
          ...profile,
          lastLabDigestAt: new Date().toISOString(),
        },
      },
    })
    .where(eq(schema.tenant.id, t.id));
}

/**
 * Digest critical Lab alerts to Desk email/webhook (respects 6h cooldown on goldspire tenant metadata).
 */
export async function scanAndDispatchLabPortfolioAlerts(db: Database): Promise<number> {
  const [tenantRow] = await db
    .select({ metadata: schema.tenant.metadata })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, getStudioTenantSlug()))
    .limit(1);

  const lastAt = parseLastLabDigest(tenantRow?.metadata as Record<string, unknown> | undefined);
  if (lastAt != null && Date.now() - lastAt < LAB_DIGEST_COOLDOWN_MS) {
    logger.info('[lab-ops] digest skipped — cooldown');
    return 0;
  }

  const ventures = await db
    .select()
    .from(schema.studioVenture)
    .where(isNull(schema.studioVenture.archivedAt));

  const tenantMrrMap = await loadTenantMrrMap(db);
  const depRows = await db.select().from(schema.productDeployment);
  const depHealth = new Map(depRows.map((d) => [d.id, d.healthStatus]));

  const alerts = buildVenturePortfolioAlerts(
    ventures.map((v) => ({
      id: v.id,
      name: v.name,
      status: v.status,
      runwayMonths: v.runwayMonths,
      metrics: v.metrics ?? [],
      manualMrrMinor: v.manualMrrMinor,
      linkedTenantId: v.linkedTenantId,
      monthlyCostsMinor: v.monthlyCostsMinor,
      linkedTenantMrrMinor: v.linkedTenantId
        ? (tenantMrrMap.get(v.linkedTenantId) ?? null)
        : null,
      deploymentHealth: v.linkedDeploymentId
        ? (depHealth.get(v.linkedDeploymentId) ?? null)
        : null,
      nextAction: v.nextAction,
      nextActionDue: v.nextActionDue,
      lastTouchedAt: v.lastTouchedAt,
      priority: v.priority,
    })),
  );

  const critical = alerts.filter((a) =>
    ['health_down', 'costs_exceed_mrr', 'runway_low'].includes(a.kind),
  );
  if (critical.length === 0) return 0;

  const body = critical
    .slice(0, 12)
    .map((a) => `• ${a.ventureName}: ${a.message}`)
    .join('\n');

  await notifyStudioDesk({
    kind: 'lab_portfolio_digest',
    subject: `Lab portfolio — ${critical.length} alert${critical.length === 1 ? '' : 's'}`,
    body,
    consolePath: '/lab',
    tags: { count: String(critical.length) },
    db,
  });

  await markLabDigestSent(db);
  return critical.length;
}

/** Webhook ingest: match venture by slug or stripe_account_hint, update MRR + integration state. */
export async function applyVentureRevenueWebhook(
  db: Database,
  input: { ventureSlug?: string; stripeHint?: string; mrrMinor: number; currency?: string },
): Promise<{ ventureId: string; slug: string } | null> {
  const slug = input.ventureSlug?.trim();
  const hint = input.stripeHint?.trim();
  if (!slug && !hint) return null;

  const [row] = await db
    .select()
    .from(schema.studioVenture)
    .where(
      slug
        ? eq(schema.studioVenture.slug, slug)
        : eq(schema.studioVenture.stripeAccountHint, hint!),
    )
    .limit(1);
  if (!row) return null;

  const now = new Date().toISOString();
  const prev = (row.integrationState ?? {}) as VentureIntegrationState;
  const currency = (input.currency ?? row.manualMrrCurrency ?? 'eur').toLowerCase();

  await db
    .update(schema.studioVenture)
    .set({
      manualMrrMinor: input.mrrMinor,
      manualMrrCurrency: currency,
      integrationState: {
        ...prev,
        stripe: { reportedMrrMinor: input.mrrMinor, syncedAt: now, source: 'webhook' },
      },
      lastTouchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.studioVenture.id, row.id));

  return { ventureId: row.id, slug: row.slug };
}

/** Full Lab cron pass: probe → sync → alert digest. */
export async function runLabPortfolioCron(db: Database): Promise<{
  probed: number;
  integrationsSynced: number;
  alertsSent: number;
}> {
  const probed = (await probeVentureLinkedDeployments(db)).length;
  const integrationsSynced = await syncVentureIntegrations(db);
  const alertsSent = await scanAndDispatchLabPortfolioAlerts(db);
  return { probed, integrationsSynced, alertsSent };
}
