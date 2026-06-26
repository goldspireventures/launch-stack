/**
 * Rules-based deal health (0–100) for account-manager view and Desk sorting.
 * Higher = healthier delivery / pipeline posture.
 */

export type DealHealthInput = {
  status: string;
  primaryAttentionPriority: number | null;
  milestonesDone: number;
  milestonesTotal: number;
  hasPaidLine: boolean;
  dealAcceptedAt: Date | string | null;
  linkedTenantId: string | null;
  stagingUrl: string | null;
};

export type DealHealthResult = {
  score: number;
  band: 'critical' | 'at_risk' | 'on_track' | 'healthy';
  reasons: string[];
};

export function computeDealHealthScore(input: DealHealthInput): DealHealthResult {
  const reasons: string[] = [];
  if (input.status === 'won' || input.status === 'lost' || input.status === 'archived') {
    return { score: input.status === 'won' ? 100 : 0, band: input.status === 'won' ? 'healthy' : 'critical', reasons: [] };
  }

  let score = 72;

  if (input.primaryAttentionPriority != null) {
    if (input.primaryAttentionPriority <= 30) {
      score -= 28;
      reasons.push('Blocked on payment or portal');
    } else if (input.primaryAttentionPriority <= 55) {
      score -= 16;
      reasons.push('Tenant or kickoff work outstanding');
    } else if (input.primaryAttentionPriority <= 75) {
      score -= 8;
      reasons.push('Delivery checklist in progress');
    }
  } else {
    score += 8;
  }

  if (input.milestonesTotal > 0) {
    const pct = input.milestonesDone / input.milestonesTotal;
    if (pct >= 0.75) score += 10;
    else if (pct < 0.25 && input.hasPaidLine) {
      score -= 6;
      reasons.push('Few milestones complete after payment');
    }
  }

  if (!input.dealAcceptedAt) {
    score -= 12;
    reasons.push('Terms not accepted');
  }
  if (!input.hasPaidLine && input.dealAcceptedAt) {
    score -= 10;
    reasons.push('No settled payment yet');
  }
  if (input.linkedTenantId && input.stagingUrl?.trim()) {
    score += 8;
  } else if (input.linkedTenantId) {
    score -= 4;
    reasons.push('Staging URL missing');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const band: DealHealthResult['band'] =
    score >= 80 ? 'healthy' : score >= 60 ? 'on_track' : score >= 40 ? 'at_risk' : 'critical';

  return { score, band, reasons: reasons.slice(0, 4) };
}
