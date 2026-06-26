import { getAIProvider } from '@goldspire/ai';
import { eq } from 'drizzle-orm';
import { schema, type Database } from '@goldspire/db';
import { isEnabled, type FlagContext } from '@goldspire/feature-flags';
import type { Role } from '@goldspire/config';

type ProfileRow = typeof schema.datingProfile.$inferSelect;

export function datingFlagCtx(
  user: { tenantId: string; id: string; role: string },
  db: Database,
): FlagContext {
  return {
    tenantId: user.tenantId,
    userId: user.id,
    role: user.role as Role,
    db,
  };
}

export async function flagOn(ctx: FlagContext, key: string) {
  return isEnabled(key, ctx);
}

export type VerificationState = {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  note?: string;
};

export function readVerification(metadata: Record<string, unknown> | null | undefined): VerificationState {
  const v = metadata?.verification;
  if (!v || typeof v !== 'object') return { status: 'none' };
  const status = (v as { status?: string }).status;
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    return {
      status,
      submittedAt:
        typeof (v as { submittedAt?: string }).submittedAt === 'string'
          ? (v as { submittedAt: string }).submittedAt
          : undefined,
      note: typeof (v as { note?: string }).note === 'string' ? (v as { note: string }).note : undefined,
    };
  }
  return { status: 'none' };
}

export type InviteCodeEntry = { label: string; maxUses: number; uses: number };

export const DEFAULT_HEARTLINE_INVITE_CODES: Record<string, InviteCodeEntry> = {
  HEARTLINE: { label: 'Heartline launch', maxUses: 500, uses: 0 },
  CITYLAUNCH: { label: 'City launch VIP', maxUses: 100, uses: 0 },
};

export function readInviteCodes(
  tenantMetadata: Record<string, unknown> | null | undefined,
): Record<string, InviteCodeEntry> {
  const raw = tenantMetadata?.heartlineInviteCodes;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_HEARTLINE_INVITE_CODES };
  return { ...DEFAULT_HEARTLINE_INVITE_CODES, ...(raw as Record<string, InviteCodeEntry>) };
}

/** Deterministic match-quality score for discover ranking (0–100). */
export function computeMatchQualityScore(viewer: ProfileRow, candidate: ProfileRow): number {
  let score = candidate.qualityScore ?? 50;
  const viewerPrompts = (viewer.prompts as { answer: string }[]) ?? [];
  const candPrompts = (candidate.prompts as { answer: string }[]) ?? [];
  const viewerWords = new Set(
    viewerPrompts
      .flatMap((p) => p.answer.toLowerCase().split(/\W+/))
      .filter((w) => w.length > 3),
  );
  let overlap = 0;
  for (const p of candPrompts) {
    for (const w of p.answer.toLowerCase().split(/\W+/)) {
      if (viewerWords.has(w)) overlap++;
    }
  }
  score += Math.min(15, overlap);
  if (viewer.city && candidate.city && viewer.city === candidate.city) score += 8;
  if (viewer.seeking === candidate.seeking) score += 5;
  return Math.min(100, Math.max(0, score));
}

export function rankDiscoverProfiles(viewer: ProfileRow, profiles: ProfileRow[]): ProfileRow[] {
  return [...profiles].sort((a, b) => {
    const sa = computeMatchQualityScore(viewer, a);
    const sb = computeMatchQualityScore(viewer, b);
    return sb - sa;
  });
}

export async function suggestDatingBio(input: {
  displayName: string;
  seeking: string;
  prompts: { question: string; answer: string }[];
  city?: string | null;
}): Promise<{ bio: string; mock: boolean }> {
  const prompt = `Write a warm, intentional dating bio (max 280 chars) for ${input.displayName} in ${input.city ?? 'their city'}. Seeking: ${input.seeking}. Prompt hints: ${input.prompts.map((p) => p.answer).filter(Boolean).join('; ') || 'none yet'}. No clichés.`;
  try {
    const provider = getAIProvider();
    const result = await provider.generateText({
      messages: [
        {
          role: 'system',
          content: 'You write concise dating app bios. Return only the bio text.',
        },
        { role: 'user', content: prompt },
      ],
    });
    const bio = result.text.trim().slice(0, 500);
    return { bio: bio || fallbackBio(input), mock: result.model === 'mock' };
  } catch {
    return { bio: fallbackBio(input), mock: true };
  }
}

function fallbackBio(input: {
  displayName: string;
  seeking: string;
  city?: string | null;
}): string {
  const place = input.city ? ` in ${input.city}` : '';
  return `${input.displayName} is here for something real${place} — ${input.seeking.replace(/_/g, ' ')} connections, good coffee, and conversations that go somewhere.`;
}

export async function classifyMessageSafety(content: string): Promise<{
  safe: boolean;
  label: 'ok' | 'harassment' | 'scam' | 'explicit' | 'unknown';
  confidence: number;
  mock: boolean;
}> {
  const lowered = content.toLowerCase();
  const blocked = ['send money', 'wire transfer', 'onlyfans.com', 'whatsapp me at', 'crypto wallet'];
  for (const phrase of blocked) {
    if (lowered.includes(phrase)) {
      return { safe: false, label: 'scam', confidence: 0.92, mock: true };
    }
  }
  try {
    const provider = getAIProvider();
    const result = await provider.generateText({
      messages: [
        {
          role: 'system',
          content:
            'Classify the dating chat message. Reply JSON only: {"safe":boolean,"label":"ok"|"harassment"|"scam"|"explicit"|"unknown","confidence":0-1}',
        },
        { role: 'user', content: content.slice(0, 2000) },
      ],
    });
    const parsed = JSON.parse(result.text.trim()) as {
      safe?: boolean;
      label?: string;
      confidence?: number;
    };
    const label =
      parsed.label === 'harassment' ||
      parsed.label === 'scam' ||
      parsed.label === 'explicit' ||
      parsed.label === 'ok'
        ? parsed.label
        : 'unknown';
    return {
      safe: parsed.safe !== false,
      label,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      mock: result.model === 'mock',
    };
  } catch {
    return { safe: true, label: 'ok', confidence: 0.5, mock: true };
  }
}

export function referralCodeForUser(userId: string): string {
  return `HL-${userId.slice(-6).toUpperCase()}`;
}

export async function mergeUserMetadata(
  db: Database,
  userId: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const [current] = await db
    .select({ metadata: schema.user.metadata })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  const next = { ...((current?.metadata as Record<string, unknown>) ?? {}), ...patch };
  await db
    .update(schema.user)
    .set({ metadata: next, updatedAt: new Date() })
    .where(eq(schema.user.id, userId));
  return next;
}
