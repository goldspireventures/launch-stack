import { Resend } from 'resend';
import { env, hasRealProvider } from '@goldspire/config/env';
import { logger } from './logger';

let _resend: Resend | null = null;

export function resend(): Resend | null {
  if (!hasRealProvider.email || !env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

/**
 * Send a transactional email. When Resend is not configured the call is logged
 * and resolves successfully — this is what makes the stack run end-to-end
 * without any vendor accounts.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const client = resend();
  if (!client) {
    logger.info('[mock email]', {
      to: input.to,
      subject: input.subject,
      preview: input.text?.slice(0, 120) ?? input.html.slice(0, 120),
    });
    return { id: `mock_${Date.now()}` };
  }
  const result = await client.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    tags: input.tags
      ? Object.entries(input.tags).map(([name, value]) => ({ name, value }))
      : undefined,
  });
  return { id: result.data?.id ?? `unknown_${Date.now()}` };
}
