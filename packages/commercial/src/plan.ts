import type { StudioDealPlanInput } from './schemas';

export type CommercialMilestone = {
  key: string;
  order: number;
  title: string;
  description: string;
  /** Basis points of total fee (10000 = 100%). */
  percentBps: number;
  amountMinorUnits: number;
  acceptance: string[];
};

export type CommercialPlanSnapshot = {
  version: 1;
  generatedAt: string;
  input: StudioDealPlanInput;
  milestones: CommercialMilestone[];
  subcontractingNote: string;
};

function allocateMinorUnits(total: number, bpsWeights: readonly number[]): number[] {
  const sumBps = bpsWeights.reduce((a, b) => a + b, 0);
  if (sumBps !== 10000) {
    throw new Error(`bps weights must sum to 10000, got ${sumBps}`);
  }
  const raw = bpsWeights.map((bps) => Math.floor((total * bps) / 10000));
  let remainder = total - raw.reduce((a, b) => a + b, 0);
  const order = [...bpsWeights.entries()].sort((a, b) => b[1] - a[1]).map(([idx]) => idx);
  const n = order.length;
  let i = 0;
  while (remainder > 0 && n > 0) {
    const slot = order[i % n];
    if (slot === undefined) break;
    raw[slot] = (raw[slot] ?? 0) + 1;
    remainder -= 1;
    i += 1;
  }
  return raw;
}

function riskMvpBps(risk: StudioDealPlanInput['clientRisk']): readonly [number, number, number] {
  switch (risk) {
    case 'referred':
      return [3000, 3500, 3500];
    case 'unknown':
      return [4000, 3500, 2500];
    case 'enterprise':
      return [4500, 3000, 2500];
    default:
      return [3500, 3500, 3000];
  }
}

function riskMvpProdBps(risk: StudioDealPlanInput['clientRisk']): readonly number[] {
  switch (risk) {
    case 'referred':
      return [2000, 2000, 1500, 2500, 2000];
    case 'unknown':
      return [2500, 2000, 1500, 2500, 1500];
    case 'enterprise':
      return [3000, 2000, 1000, 2500, 1500];
    default:
      return [2200, 2000, 1300, 2500, 2000];
  }
}

function subcontractingBullets(level: StudioDealPlanInput['subcontracting']): string[] {
  if (level === 'none') return [];
  if (level === 'light')
    return ['Specialist work is pre-approved and scheduled within the milestone window.'];
  return [
    'Multiple contributors: Goldspire coordinates delivery, QA handoff, and single-client communication.',
    'Vendor access is least-privilege; NDAs and contractor agreements are in place before work starts.',
  ];
}

function subcontractingNote(level: StudioDealPlanInput['subcontracting']): string {
  if (level === 'none') return 'Delivery is solo-led unless explicitly changed later via change order.';
  if (level === 'light') return 'Light subcontracting may be used for discrete deliverables (e.g. brand, motion).';
  return 'Heavy subcontracting expected: budget includes coordination and integration risk.';
}

const MVP_TITLES = [
  { key: 'kickoff', title: 'Contract & kickoff', description: 'Access, discovery, backlog frozen for build.' },
  {
    key: 'staging',
    title: 'Core flows in staging',
    description: 'Agreed user journeys implemented behind feature flags / staging URL.',
  },
  {
    key: 'uat',
    title: 'UAT sign-off / release',
    description: 'Client acceptance against checklist; deploy to agreed environment.',
  },
] as const;

const MVPPROD_TITLES = [
  { key: 'kickoff', title: 'Contract & kickoff', description: 'Kickoff, environments, success metrics locked.' },
  {
    key: 'mvp_staging',
    title: 'MVP core in staging',
    description: 'Scoped MVP feature set demonstrable end-to-end in staging.',
  },
  {
    key: 'mvp_signoff',
    title: 'MVP client sign-off',
    description: 'Formal acceptance of MVP scope; unlocks production-hardening work.',
  },
  {
    key: 'prod_ready',
    title: 'Production hardening',
    description: 'Reliability, observability, security basics, release process, load-appropriate tuning.',
  },
  {
    key: 'golive',
    title: 'Go-live + hypercare start',
    description: 'Production launch; short warranty window for defects in original scope.',
  },
] as const;

/** Deterministic milestone plan from commercial inputs. */
export function buildCommercialPlan(input: StudioDealPlanInput): CommercialPlanSnapshot {
  const { engagementKind, totalFeeMinorUnits } = input;
  const bpsList =
    engagementKind === 'mvp' ? [...riskMvpBps(input.clientRisk)] : [...riskMvpProdBps(input.clientRisk)];
  const titles = engagementKind === 'mvp' ? MVP_TITLES : MVPPROD_TITLES;
  if (titles.length !== bpsList.length) {
    throw new Error('titles/bps length mismatch');
  }
  const amounts = allocateMinorUnits(totalFeeMinorUnits, bpsList);
  const subExtra = subcontractingBullets(input.subcontracting);

  const milestones: CommercialMilestone[] = titles.map((t, i) => {
    const baseAcceptance =
      t.key === 'kickoff'
        ? ['SOW signed', 'Deposit received', 'Repos / design access granted']
        : t.key === 'staging' || t.key === 'mvp_staging'
          ? ['Staging URL live', 'Happy-path demo recorded or walkthrough completed']
          : t.key === 'uat' || t.key === 'mvp_signoff'
            ? ['Acceptance checklist signed by client', 'No P0/P1 defects open against scope']
            : t.key === 'prod_ready'
              ? ['Runbooks + monitoring dashboards', 'Backup / rollback verified on staging']
              : ['Production deploy complete', 'Smoke tests green', 'Hypercare window started'];

    return {
      key: t.key,
      order: i + 1,
      title: t.title,
      description: t.description,
      percentBps: bpsList[i]!,
      amountMinorUnits: amounts[i]!,
      acceptance: [...baseAcceptance, ...(i >= 1 ? subExtra : [])],
    };
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    input: { ...input },
    milestones,
    subcontractingNote: subcontractingNote(input.subcontracting),
  };
}
