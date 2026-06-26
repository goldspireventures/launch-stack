import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getClientPortalOrigin } from '@goldspire/config/client-portal-urls';
import { schema, type Database } from '@goldspire/db';
import { DEFAULT_PORTAL_SCOPES, normalizePortalScopes, type PortalScope } from '@goldspire/commercial';
import { prepareDealForClientPortal } from './studio-deal-lifecycle';

export function hashPortalToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export interface IssueStudioDealPortalLinkInput {
  db: Database;
  dealId: string;
  expiresInDays?: number;
  scopes?: readonly PortalScope[];
}

export interface IssueStudioDealPortalLinkResult {
  url: string;
  rawToken: string;
  expiresAt: Date | null;
}

/**
 * Create a revocable portal token and return the client-facing URL.
 * Raw token is returned once — store only in operator UI / email, never in DB plaintext.
 */
export async function issueStudioDealPortalLink(
  input: IssueStudioDealPortalLinkInput,
): Promise<IssueStudioDealPortalLinkResult> {
  const raw = `gspl_${randomBytes(24).toString('base64url')}`;
  const tokenHash = hashPortalToken(raw);
  const expiresAt =
    input.expiresInDays !== undefined
      ? new Date(Date.now() + input.expiresInDays * 86_400_000)
      : null;

  await prepareDealForClientPortal(input.db, input.dealId);

  const scopes = normalizePortalScopes(input.scopes ?? [...DEFAULT_PORTAL_SCOPES]);

  await input.db.insert(schema.studioDealPortalToken).values({
    dealId: input.dealId,
    tokenHash,
    expiresAt,
    scopes: [...scopes],
  });

  const base = getClientPortalOrigin();
  const url = `${base}/deal/${input.dealId}?token=${encodeURIComponent(raw)}`;
  return { url, rawToken: raw, expiresAt };
}

export async function dealHasPortalToken(db: Database, dealId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.studioDealPortalToken.id })
    .from(schema.studioDealPortalToken)
    .where(eq(schema.studioDealPortalToken.dealId, dealId))
    .limit(1);
  return Boolean(row);
}
