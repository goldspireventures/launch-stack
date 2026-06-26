import { NextResponse } from 'next/server';
import { env } from '@goldspire/config/env';
import { db } from '@goldspire/db';
import { recordMarketingLeadInbound } from '@goldspire/api';

/**
 * Ingest inbound enquiry email replies (Resend inbound, Zapier, etc.).
 * POST JSON: { leadId: string, body: string, subject?: string, channel?: string, externalRef?: string }
 * Header: Authorization: Bearer <STUDIO_LEAD_INBOUND_WEBHOOK_SECRET>
 */
export async function POST(req: Request) {
  const secret = env.STUDIO_LEAD_INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = body as Record<string, unknown>;
  const leadId = typeof parsed.leadId === 'string' ? parsed.leadId : '';
  const text = typeof parsed.body === 'string' ? parsed.body.trim() : '';
  if (!leadId || leadId.length !== 26 || !text) {
    return NextResponse.json({ error: 'leadId and body required' }, { status: 400 });
  }

  try {
    const lead = await recordMarketingLeadInbound(db, {
      leadId,
      body: text,
      subject: typeof parsed.subject === 'string' ? parsed.subject : undefined,
      channel: typeof parsed.channel === 'string' ? parsed.channel : 'email',
      externalRef: typeof parsed.externalRef === 'string' ? parsed.externalRef : null,
    });
    return NextResponse.json({ ok: true, leadId: lead?.id ?? leadId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
