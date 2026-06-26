import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '@goldspire/db';
import { schema } from '@goldspire/db';
import { env } from '@goldspire/config/env';
import { SUPPORT_ACCESS_SCOPE_LABEL, type SupportAccessScope } from '@goldspire/commercial';
import { sendEmail } from '@goldspire/platform';

/** Notify tenant owners/admins that Studio requested JIT Admin access. */
export async function notifySupportAccessRequested(opts: {
  db: Database;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  reason: string;
  scope: SupportAccessScope;
  durationMinutes: number;
  requestedByEmail: string;
}) {
  const owners = await opts.db
    .select({ email: schema.user.email, name: schema.user.name })
    .from(schema.user)
    .where(
      and(
        eq(schema.user.tenantId, opts.tenantId),
        inArray(schema.user.role, ['TENANT_OWNER', 'TENANT_ADMIN']),
        eq(schema.user.status, 'active'),
      ),
    )
    .limit(10);

  const recipients = [...new Set(owners.map((o) => o.email).filter(Boolean))];
  if (recipients.length === 0) return;

  const scopeLabel = SUPPORT_ACCESS_SCOPE_LABEL[opts.scope] ?? opts.scope;
  const adminUrl = `${env.NEXT_PUBLIC_ADMIN_URL.replace(/\/$/, '')}/support-access`;
  const subject = `[${opts.tenantName}] Studio support access request`;
  const text = [
    `Studio (${opts.requestedByEmail}) requested time-bound access to your Admin.`,
    '',
    `Scope: ${scopeLabel}`,
    `Duration: ${opts.durationMinutes} minutes`,
    `Reason: ${opts.reason}`,
    '',
    `Approve or deny: ${adminUrl}`,
  ].join('\n');
  const html = `
    <p>Studio (<strong>${opts.requestedByEmail}</strong>) requested time-bound access to <strong>${opts.tenantName}</strong> Admin.</p>
    <ul>
      <li><strong>Scope:</strong> ${scopeLabel}</li>
      <li><strong>Duration:</strong> ${opts.durationMinutes} minutes</li>
      <li><strong>Reason:</strong> ${opts.reason.replace(/</g, '&lt;')}</li>
    </ul>
    <p><a href="${adminUrl}">Review request in Admin</a></p>
  `;

  await sendEmail({
    to: recipients,
    subject,
    html,
    text,
    tags: { kind: 'support_access_request', tenant: opts.tenantSlug },
  });
}
