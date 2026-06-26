import { NextResponse } from 'next/server';
import { env } from '@goldspire/config/env';
import { db } from '@goldspire/db';
import { applyVentureRevenueWebhook } from '@goldspire/api';

/**
 * Ingest venture MRR from Stripe Connect, RevenueCat, or manual automation.
 * POST JSON: { ventureSlug?: string, stripeHint?: string, mrrMinor: number, currency?: string }
 * Header: Authorization: Bearer <STUDIO_LAB_REVENUE_WEBHOOK_SECRET>
 */
export async function POST(req: Request) {
  const secret = env.STUDIO_LAB_REVENUE_WEBHOOK_SECRET;
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
  const mrrMinor = typeof parsed.mrrMinor === 'number' ? parsed.mrrMinor : Number(parsed.mrrMinor);
  if (!Number.isFinite(mrrMinor) || mrrMinor < 0) {
    return NextResponse.json({ error: 'mrrMinor required' }, { status: 400 });
  }

  const ventureSlug = typeof parsed.ventureSlug === 'string' ? parsed.ventureSlug : undefined;
  const stripeHint = typeof parsed.stripeHint === 'string' ? parsed.stripeHint : undefined;
  const currency = typeof parsed.currency === 'string' ? parsed.currency : undefined;

  if (!ventureSlug && !stripeHint) {
    return NextResponse.json({ error: 'ventureSlug or stripeHint required' }, { status: 400 });
  }

  const result = await applyVentureRevenueWebhook(db, {
    ventureSlug,
    stripeHint,
    mrrMinor: Math.round(mrrMinor),
    currency,
  });

  if (!result) {
    return NextResponse.json({ error: 'Venture not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}
