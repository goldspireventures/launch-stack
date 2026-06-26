import { eq } from 'drizzle-orm';
import { db as rootDb, schema, type Database } from '@goldspire/db';
import { env } from '@goldspire/config/env';
import { logger } from '@goldspire/platform';
import { notifyStudioOpsInbox } from './studio-deal-notify';

const STUDIO_TENANT_SLUG = 'goldspire';
const CONSOLE_STUDIO_PROFILE_KEY = 'consoleStudioProfile';

export type StudioDeskAlertsConfig = {
  primaryContactEmail: string;
  deskWebhookUrl: string;
  deskAlertsEnabled: boolean;
};

function parseDeskConfig(metadata: Record<string, unknown> | null | undefined): StudioDeskAlertsConfig | null {
  const raw = metadata?.[CONSOLE_STUDIO_PROFILE_KEY];
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const email = typeof p.primaryContactEmail === 'string' ? p.primaryContactEmail.trim() : '';
  if (!email.includes('@')) return null;
  const deskWebhookUrl = typeof p.deskWebhookUrl === 'string' ? p.deskWebhookUrl.trim() : '';
  const deskAlertsEnabled = p.deskAlertsEnabled !== false;
  return { primaryContactEmail: email, deskWebhookUrl, deskAlertsEnabled };
}

export async function loadStudioDeskAlertsConfig(queryDb: Database = rootDb): Promise<StudioDeskAlertsConfig | null> {
  const [t] = await queryDb
    .select({ metadata: schema.tenant.metadata })
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, STUDIO_TENANT_SLUG))
    .limit(1);
  if (!t) return null;
  return parseDeskConfig(t.metadata as Record<string, unknown>);
}

/**
 * Ops alerts for Deal Desk — email (primary contact) + optional Slack/generic webhook.
 * Fire-and-forget; never throws to callers.
 */
export async function notifyStudioDesk(opts: {
  kind: string;
  subject: string;
  body: string;
  /** Console path, e.g. `/leads` or `/deals/abc…` */
  consolePath?: string;
  tags?: Record<string, string>;
  db?: Database;
}): Promise<void> {
  const config = await loadStudioDeskAlertsConfig(opts.db ?? rootDb);
  if (!config?.deskAlertsEnabled) return;

  const consoleBase = env.NEXT_PUBLIC_CONSOLE_URL.replace(/\/$/, '');
  const link = opts.consolePath ? `${consoleBase}${opts.consolePath}` : null;
  const fullBody = link ? `${opts.body}\n\nOpen in Console: ${link}` : opts.body;

  void notifyStudioOpsInbox({
    to: config.primaryContactEmail,
    subject: opts.subject,
    body: fullBody,
    tags: { kind: opts.kind, ...opts.tags },
  });

  const webhook = config.deskWebhookUrl;
  if (!webhook.startsWith('https://')) return;

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `*${opts.subject}*\n${fullBody}` }),
    });
    if (!res.ok) {
      logger.warn('[studio-desk] webhook non-2xx', { status: res.status, kind: opts.kind });
    }
  } catch (err) {
    logger.warn('[studio-desk] webhook failed', { err, kind: opts.kind });
  }
}

/** Fired when a delivery runbook step is incomplete for ≥48h (see runbook-blocker.ts). */
export async function notifyRunbookBlocker(opts: {
  dealId: string;
  dealTitle: string;
  stepLabel: string;
  hoursBlocked: number;
  db?: Database;
}): Promise<void> {
  await notifyStudioDesk({
    kind: 'runbook_blocker_48h',
    subject: `Runbook blocked ${opts.hoursBlocked}h — ${opts.dealTitle}`,
    body: `Delivery runbook step “${opts.stepLabel}” has been the active blocker for ${opts.hoursBlocked} hours. Open the deal Delivery tab to unblock.`,
    consolePath: `/deals/${opts.dealId}?module=delivery`,
    tags: { dealId: opts.dealId, step: opts.stepLabel },
    db: opts.db,
  });
}
