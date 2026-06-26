import { and, eq, inArray, lte, or } from 'drizzle-orm';

import type { Database } from '@goldspire/db';

import { schema } from '@goldspire/db';

import { ENQUIRY_SLA_MS } from '@goldspire/commercial';

import { notifyStudioDesk } from '@goldspire/payments';



/** Per-lead cooldown so digest cron does not re-list the same row every run. */

export const STALE_LEAD_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;



function msAgo(ms: number) {

  return new Date(Date.now() - ms);

}



function isPastCooldown(metadata: Record<string, unknown> | null | undefined): boolean {

  const raw = metadata?.lastStaleAlertAt;

  if (typeof raw !== 'string') return true;

  const at = Date.parse(raw);

  if (Number.isNaN(at)) return true;

  return Date.now() - at >= STALE_LEAD_ALERT_COOLDOWN_MS;

}



/**

 * Proactive Desk digest for enquiries past SLA (complements pull-based Desk queue).

 * Sends **one** ops alert per run listing all stale rows — run on cron every 4–6h.

 * `pnpm studio:stale-enquiry-alerts`

 */

export async function scanStaleEnquiryAlerts(db: Database): Promise<number> {

  const staleNewCutoff = msAgo(ENQUIRY_SLA_MS.newFirstReply);

  const staleReviewingCutoff = msAgo(ENQUIRY_SLA_MS.reviewingDecision);

  const staleQualifiedCutoff = msAgo(ENQUIRY_SLA_MS.qualifiedConvert);



  const candidates = await db

    .select({

      id: schema.marketingLead.id,

      name: schema.marketingLead.name,

      email: schema.marketingLead.email,

      status: schema.marketingLead.status,

      metadata: schema.marketingLead.metadata,

    })

    .from(schema.marketingLead)

    .where(

      or(

        and(eq(schema.marketingLead.status, 'new'), lte(schema.marketingLead.createdAt, staleNewCutoff)),

        and(

          eq(schema.marketingLead.status, 'reviewing'),

          lte(schema.marketingLead.updatedAt, staleReviewingCutoff),

        ),

        and(

          eq(schema.marketingLead.status, 'qualified'),

          lte(schema.marketingLead.updatedAt, staleQualifiedCutoff),

        ),

      ),

    )

    .limit(80);



  const rows = candidates.filter((lead) =>

    isPastCooldown(lead.metadata as Record<string, unknown> | undefined),

  ).slice(0, 50);



  if (rows.length === 0) return 0;



  const lines = rows.map((lead) => {

    const slaLabel =

      lead.status === 'new'

        ? 'new >4h'

        : lead.status === 'reviewing'

          ? 'reviewing >48h'

          : 'qualified >7d';

    return `• ${lead.name} <${lead.email}> — ${slaLabel} — /leads?lead=${lead.id}`;

  });



  await notifyStudioDesk({

    db,

    kind: 'marketing_lead_stale_digest',

    subject: `Stale enquiries (${rows.length})`,

    body: ['The following open enquiries are past SLA:', '', ...lines].join('\n'),

    consolePath: '/leads',

    tags: { count: String(rows.length) },

  });



  const nowIso = new Date().toISOString();

  const ids = rows.map((r) => r.id);

  const existing = await db

    .select({ id: schema.marketingLead.id, metadata: schema.marketingLead.metadata })

    .from(schema.marketingLead)

    .where(inArray(schema.marketingLead.id, ids));



  await Promise.all(

    existing.map((row) => {

      const meta = { ...(row.metadata as Record<string, unknown>), lastStaleAlertAt: nowIso };

      return db

        .update(schema.marketingLead)

        .set({ metadata: meta, updatedAt: new Date() })

        .where(eq(schema.marketingLead.id, row.id));

    }),

  );



  return 1;

}


