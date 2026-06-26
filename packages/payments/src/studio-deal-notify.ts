import { sendEmail, logger } from '@goldspire/platform';

function formatMinor(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function notifyDealPaymentSettled(opts: {
  dealTitle: string;
  clientEmail: string | null | undefined;
  milestoneLabel: string;
  amountMinor: number;
  currency: string;
}): Promise<void> {
  const email = opts.clientEmail?.trim();
  if (!email || !email.includes('@')) return;

  const amount = formatMinor(opts.amountMinor, opts.currency);
  const subject = `Payment received · ${opts.dealTitle}`;
  const html = `
    <p>Hi,</p>
    <p>We’ve recorded a payment of <strong>${amount}</strong> for <strong>${escapeHtml(opts.milestoneLabel)}</strong> on <strong>${escapeHtml(opts.dealTitle)}</strong>.</p>
    <p>Your portal timeline has been updated. Reply to this email if anything looks off.</p>
    <p style="color:#666;font-size:12px;margin-top:24px">Goldspire Studio</p>
  `.trim();
  const text = `Payment of ${amount} recorded for ${opts.milestoneLabel} on ${opts.dealTitle}.`;

  try {
    await sendEmail({ to: email, subject, html, text, tags: { kind: 'studio_deal_payment' } });
  } catch (err) {
    logger.warn('[studio-deal] payment receipt email failed', { err, to: email });
  }
}

export async function notifyClientPortalInvite(opts: {
  dealTitle: string;
  clientEmail: string;
  portalUrl: string;
  studioName?: string;
}): Promise<void> {
  const email = opts.clientEmail.trim();
  if (!email.includes('@')) return;

  const studio = opts.studioName?.trim() || 'Goldspire Studio';
  const subject = `Your project portal · ${opts.dealTitle}`;
  const html = `
    <p>Hi,</p>
    <p>${escapeHtml(studio)} set up a secure portal for <strong>${escapeHtml(opts.dealTitle)}</strong>.</p>
    <p>Review terms, pay milestones, and complete kickoff here:</p>
    <p><a href="${escapeHtml(opts.portalUrl)}">Open your portal</a></p>
    <p style="color:#666;font-size:12px;margin-top:24px">Save this link — it is unique to your engagement.</p>
  `.trim();
  const text = `Open your project portal: ${opts.portalUrl}`;

  try {
    await sendEmail({ to: email, subject, html, text, tags: { kind: 'studio_deal_portal_invite' } });
  } catch (err) {
    logger.warn('[studio-deal] portal invite email failed', { err, to: email });
  }
}

export async function notifyStudioOpsInbox(opts: {
  to: string;
  subject: string;
  body: string;
  tags?: Record<string, string>;
}): Promise<void> {
  const to = opts.to.trim();
  if (!to.includes('@')) return;
  const html = `<p>${escapeHtml(opts.body).replace(/\n/g, '<br/>')}</p>`;
  try {
    await sendEmail({ to, subject: opts.subject, html, text: opts.body, tags: opts.tags });
  } catch (err) {
    logger.warn('[studio] ops inbox email failed', { err, to });
  }
}

export async function notifyClientTimelineUpdate(opts: {
  dealTitle: string;
  clientEmail: string | null | undefined;
  message: string;
  portalUrl: string;
}): Promise<void> {
  const email = opts.clientEmail?.trim();
  if (!email || !email.includes('@')) return;

  const subject = `Update on ${opts.dealTitle}`;
  const html = `
    <p>Hi,</p>
    <p>We posted an update on your project:</p>
    <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #ccc;background:#f8f8f8">
      ${escapeHtml(opts.message)}
    </blockquote>
    <p>The update is on your project timeline in the client portal — use the secure link we issued for this deal (reply here if you need it resent).</p>
    <p style="color:#666;font-size:12px;margin-top:24px">Goldspire Studio</p>
  `.trim();
  const text = `${opts.message}\n\nView in your client portal (use the secure link from your invite).`;

  try {
    await sendEmail({ to: email, subject, html, text, tags: { kind: 'studio_deal_timeline' } });
  } catch (err) {
    logger.warn('[studio-deal] timeline email failed', { err, to: email });
  }
}
