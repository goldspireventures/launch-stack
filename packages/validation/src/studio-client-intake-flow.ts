import type {
  SocialMatchingIntakeAnswers,
} from './studio-client-intake';

export type KickoffArchetypeId = 'quick_connect' | 'browse_first' | 'flexible_social' | 'help_me_decide';

/** Big-card presets — maps to discovery / matching / messaging enums. */
/** Reverse-map saved enums to the shape card the client picked (if unambiguous). */
export function resolveKickoffArchetypeFromAnswers(
  a: Partial<Pick<SocialMatchingIntakeAnswers, 'discoveryModel' | 'matchingRules' | 'messagingPolicy' | 'kickoffArchetype'>>,
): KickoffArchetypeId | null {
  if (a.kickoffArchetype) return a.kickoffArchetype;
  const ids: KickoffArchetypeId[] = ['quick_connect', 'browse_first', 'flexible_social', 'help_me_decide'];
  for (const id of ids) {
    const core = applyKickoffArchetype(id);
    if (
      a.discoveryModel === core.discoveryModel &&
      a.matchingRules === core.matchingRules &&
      a.messagingPolicy === core.messagingPolicy
    ) {
      return id;
    }
  }
  return null;
}

export function applyKickoffArchetype(
  id: KickoffArchetypeId,
): Pick<SocialMatchingIntakeAnswers, 'discoveryModel' | 'matchingRules' | 'messagingPolicy'> {
  switch (id) {
    case 'quick_connect':
      return {
        discoveryModel: 'swipe',
        matchingRules: 'mutual_like_only',
        messagingPolicy: 'match_gated_only',
      };
    case 'browse_first':
      return {
        discoveryModel: 'browse_grid',
        matchingRules: 'mutual_like_only',
        messagingPolicy: 'match_gated_only',
      };
    case 'flexible_social':
      return {
        discoveryModel: 'hybrid',
        matchingRules: 'one_sided_interest_ok',
        messagingPolicy: 'open_messages_limited',
      };
    case 'help_me_decide':
    default:
      return {
        discoveryModel: 'unsure',
        matchingRules: 'unsure',
        messagingPolicy: 'unsure',
      };
  }
}

/** Map 0–100 slider to three-way enum (left / middle / right). */
export function triSliderToEnum<T extends string>(value: number, left: T, mid: T, right: T): T {
  const v = Math.max(0, Math.min(100, value));
  if (v <= 33) return left;
  if (v >= 67) return right;
  return mid;
}

export function discoverySliderToModel(v: number): SocialMatchingIntakeAnswers['discoveryModel'] {
  return triSliderToEnum(v, 'swipe', 'hybrid', 'browse_grid');
}

export function matchingSliderToRules(v: number): SocialMatchingIntakeAnswers['matchingRules'] {
  return triSliderToEnum(v, 'mutual_like_only', 'unsure', 'one_sided_interest_ok');
}

export function messagingSliderToPolicy(v: number): SocialMatchingIntakeAnswers['messagingPolicy'] {
  return triSliderToEnum(v, 'match_gated_only', 'unsure', 'open_messages_limited');
}

/** Inverse for hydrating sliders from saved enums (approximate midpoint of bucket). */
export function discoveryModelToSlider(m: SocialMatchingIntakeAnswers['discoveryModel'] | undefined): number {
  if (m === 'swipe') return 10;
  if (m === 'browse_grid') return 90;
  if (m === 'hybrid') return 50;
  return 50;
}

export function matchingRulesToSlider(m: SocialMatchingIntakeAnswers['matchingRules'] | undefined): number {
  if (m === 'mutual_like_only') return 10;
  if (m === 'one_sided_interest_ok') return 90;
  if (m === 'unsure') return 50;
  return 50;
}

export function messagingPolicyToSlider(m: SocialMatchingIntakeAnswers['messagingPolicy'] | undefined): number {
  if (m === 'match_gated_only') return 10;
  if (m === 'open_messages_limited') return 90;
  if (m === 'unsure') return 50;
  return 50;
}

/** Plain-language recap for the “mirror” step (best-effort from partials). */
export function buildKickoffMirrorSummary(a: Partial<SocialMatchingIntakeAnswers>): string {
  const lines: string[] = [];
  const pv = (a.productVision ?? '').trim();
  if (pv) {
    lines.push(`You're building: ${pv.slice(0, 280)}${pv.length > 280 ? '…' : ''}`);
  }
  const ta = (a.targetAudience ?? '').trim();
  if (ta) {
    lines.push(`First people in the door: ${ta.slice(0, 200)}${ta.length > 200 ? '…' : ''}`);
  }
  const diff = (a.differentiators ?? '').trim();
  if (diff) {
    lines.push(`What sets you apart: ${diff.slice(0, 200)}${diff.length > 200 ? '…' : ''}`);
  }
  if (a.primaryMarkets?.trim()) lines.push(`Markets / geos: ${a.primaryMarkets.trim()}.`);

  const shape: string[] = [];
  if (a.discoveryModel && a.discoveryModel !== 'unsure') {
    const d =
      a.discoveryModel === 'swipe'
        ? 'fast, swipe-first discovery'
        : a.discoveryModel === 'browse_grid'
          ? 'browse profiles in a grid first'
          : 'a hybrid of swiping and browsing';
    shape.push(d);
  }
  if (a.matchingRules && a.matchingRules !== 'unsure') {
    const m =
      a.matchingRules === 'mutual_like_only'
        ? 'matches when both people are interested'
        : 'some one-sided interest is allowed with guardrails';
    shape.push(m);
  }
  if (a.messagingPolicy && a.messagingPolicy !== 'unsure') {
    const msg =
      a.messagingPolicy === 'match_gated_only'
        ? 'chat mostly after a mutual match'
        : 'some messaging before a full match, within limits';
    shape.push(msg);
  }
  if (shape.length) lines.push(`Product shape: ${shape.join('; ')}.`);

  if (a.launchTarget && a.launchTarget !== 'unsure') {
    lines.push(`Launch posture: ${a.launchTarget.replace(/_/g, ' ')}.`);
  }
  if (a.monetizationModel && a.monetizationModel !== 'unsure') {
    lines.push(`Revenue: ${a.monetizationModel.replace(/_/g, ' ')}.`);
  }
  if (a.mobilePriority) {
    lines.push(
      `Mobile: ${
        a.mobilePriority === 'web_first'
          ? 'web first, mobile can follow'
          : a.mobilePriority === 'mobile_required_phase2'
            ? 'mobile is important soon after launch'
            : 'mobile must ship with the first release'
      }.`,
    );
  }
  if (a.moderationApproach && a.moderationApproach !== 'unsure') {
    lines.push(
      `Trust & safety day one: ${
        a.moderationApproach === 'manual_ops_day1'
          ? 'mostly manual review with humans in the loop'
          : a.moderationApproach === 'automated_later'
            ? 'lighter automation over time after launch'
            : 'you want our recommendation'
      }.`,
    );
  }
  if (a.decisionMakerName || a.decisionMakerEmail) {
    lines.push(`We’ll coordinate with ${[a.decisionMakerName, a.decisionMakerEmail].filter(Boolean).join(' · ')}.`);
  }
  if (!lines.length) {
    return 'Once you add a few answers above, we’ll mirror them back here in plain language before you submit.';
  }
  return lines.join('\n\n');
}

export type KickoffChapterIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Returns a user-facing message when the chapter is incomplete, or null if OK to continue. */
export function validateKickoffChapter(
  step: number,
  merged: Partial<SocialMatchingIntakeAnswers> & { kickoffArchetype?: KickoffArchetypeId | null },
  opts?: { requireTargetTemplateId?: boolean },
): string | null {
  const t = (s: string | undefined, min: number, label: string) => {
    const v = (s ?? '').trim();
    if (v.length < min) return `${label} needs at least ${min} characters.`;
    return null;
  };

  switch (step) {
    case 0:
      return null;
    case 1:
      if (!merged.kickoffArchetype && !resolveKickoffArchetypeFromAnswers(merged)) {
        return 'Pick one product shape before continuing.';
      }
      return null;
    case 2:
      return t(merged.productVision, 20, 'Your product story');
    case 3:
      return t(merged.targetAudience, 10, 'Who shows up first');
    case 4:
      return t(merged.differentiators, 20, 'Why you');
    case 5:
      return null;
    case 6:
      if (!merged.launchTarget) return 'Choose how you want to enter the market.';
      if (!merged.monetizationModel) return 'Choose how you expect to make money.';
      if (!merged.mobilePriority) return 'Choose how important mobile is on day one.';
      return null;
    case 7:
      if (!merged.moderationApproach) return 'Choose a trust & safety approach for day one.';
      return null;
    case 8: {
      if (t(merged.primaryMarkets, 2, 'Primary markets')) return t(merged.primaryMarkets, 2, 'Primary markets');
      if (t(merged.decisionMakerName, 2, 'Decision maker name')) return t(merged.decisionMakerName, 2, 'Decision maker name');
      if (!(merged.decisionMakerEmail ?? '').trim().includes('@')) return 'Enter a valid decision maker email.';
      const tpl = (merged.targetTemplateId ?? '').trim();
      if (opts?.requireTargetTemplateId && !tpl) {
        return 'Choose the new product template we should spec in the catalog.';
      }
      if (tpl.length > 0 && !/^[\w-]+\/[\w-]+$/.test(tpl)) {
        return 'Template id should look like social_matching/mentorship.';
      }
      return null;
    }
    case 9:
      return null;
    default:
      return null;
  }
}
