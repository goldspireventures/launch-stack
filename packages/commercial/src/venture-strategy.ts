import { z } from 'zod';
import { ventureEffectiveMrrMinor } from './venture-economics';
import { ventureEstimatedMarginMinor } from './venture-portfolio';

export const VENTURE_ECONOMICS_MODES = ['cash', 'accrual'] as const;
export type VentureEconomicsMode = (typeof VENTURE_ECONOMICS_MODES)[number];

export const venturePlLineSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(['revenue', 'cogs', 'opex']),
  label: z.string().min(1).max(120),
  amountMinor: z.number().int(),
  currency: z.string().length(3).default('eur'),
  notes: z.string().max(500).optional().nullable(),
});

export type VenturePlLine = z.infer<typeof venturePlLineSchema>;

export const ventureOkrSchema = z.object({
  id: z.string().min(1).max(40),
  objective: z.string().min(1).max(200),
  keyResult: z.string().min(1).max(200),
  progressPercent: z.number().int().min(0).max(100).default(0),
  quarter: z.string().max(20).optional().nullable(),
});

export type VentureOkr = z.infer<typeof ventureOkrSchema>;

export type VentureIntegrationState = {
  tenantMrr?: { minor: number; currency: string; syncedAt: string };
  stripe?: { reportedMrrMinor: number | null; syncedAt: string; source: 'webhook' | 'manual' };
  appStore?: { reportedMrrMinor: number | null; syncedAt: string };
  analytics?: { mau: number | null; syncedAt: string; provider: string };
  lastHealthProbe?: { status: string; at: string; deploymentId: string };
};

export type VentureStrategicRecommendation = {
  ventureId: string;
  ventureName: string;
  action: 'kill' | 'pause' | 'double_down' | 'fix_ops' | 'capture_revenue';
  rationale: string;
  priority: number;
};

export function sumPlByKind(lines: VenturePlLine[], kind: VenturePlLine['kind']): number {
  return lines.filter((l) => l.kind === kind).reduce((s, l) => s + l.amountMinor, 0);
}

export function computePlSummary(lines: VenturePlLine[]) {
  const revenue = sumPlByKind(lines, 'revenue');
  const cogs = sumPlByKind(lines, 'cogs');
  const opex = sumPlByKind(lines, 'opex');
  const grossProfit = revenue - cogs;
  const netOperating = grossProfit - opex;
  return { revenue, cogs, opex, grossProfit, netOperating };
}

export function effectiveOwnershipMrrMinor(input: {
  effectiveMrrMinor: number | null;
  ownershipPercent: number | null | undefined;
}): number | null {
  if (input.effectiveMrrMinor == null) return null;
  const pct = input.ownershipPercent ?? 100;
  return Math.round((input.effectiveMrrMinor * pct) / 100);
}

export function validateTimeAllocationTotal(
  ventures: Array<{ id: string; timeAllocationPercent: number | null | undefined }>,
): { total: number; valid: boolean } {
  const total = ventures.reduce((s, v) => s + (v.timeAllocationPercent ?? 0), 0);
  return { total, valid: total <= 100 };
}

export function buildStrategicRecommendations(
  ventures: Array<{
    id: string;
    name: string;
    status: string;
    priority: number;
    manualMrrMinor: number | null;
    linkedTenantId: string | null;
    linkedTenantMrrMinor: number | null;
    monthlyCostsMinor: number | null;
    runwayMonths: number | null;
    timeAllocationPercent: number | null;
    deploymentHealth: string | null;
    metricsCount: number;
    okrsCount: number;
    plNetOperating: number | null;
  }>,
): VentureStrategicRecommendation[] {
  const out: VentureStrategicRecommendation[] = [];

  for (const v of ventures) {
    const mrr = ventureEffectiveMrrMinor({
      manualMrrMinor: v.manualMrrMinor,
      linkedTenantMrrMinor: v.linkedTenantMrrMinor,
    });
    const margin = ventureEstimatedMarginMinor({
      effectiveMrrMinor: mrr,
      monthlyCostsMinor: v.monthlyCostsMinor,
    });

    if (v.deploymentHealth === 'down') {
      out.push({
        ventureId: v.id,
        ventureName: v.name,
        action: 'fix_ops',
        rationale: 'Linked deployment health is down — restore uptime before scaling.',
        priority: 1,
      });
    }

    if (v.status === 'shipped' && mrr == null && v.monthlyCostsMinor != null && v.monthlyCostsMinor > 0) {
      out.push({
        ventureId: v.id,
        ventureName: v.name,
        action: 'capture_revenue',
        rationale: 'Live venture with costs but no recorded MRR — add billing link or manual MRR.',
        priority: 2,
      });
    }

    if (
      v.status === 'paused' &&
      (v.timeAllocationPercent ?? 0) >= 15 &&
      v.priority <= 2
    ) {
      out.push({
        ventureId: v.id,
        ventureName: v.name,
        action: 'kill',
        rationale: 'Paused but still consuming founder time at high priority — cut or reactivate.',
        priority: 3,
      });
    }

    if (
      (v.status === 'active' || v.status === 'shipped') &&
      margin != null &&
      margin > 0 &&
      (v.runwayMonths == null || v.runwayMonths >= 6) &&
      v.metricsCount >= 2
    ) {
      out.push({
        ventureId: v.id,
        ventureName: v.name,
        action: 'double_down',
        rationale: 'Positive margin, healthy runway, and KPIs tracked — candidate to increase time allocation.',
        priority: 4,
      });
    }

    if (v.plNetOperating != null && v.plNetOperating < 0 && mrr != null && mrr > 0) {
      out.push({
        ventureId: v.id,
        ventureName: v.name,
        action: 'pause',
        rationale: 'P&L net operating is negative despite revenue — trim opex or pause until unit economics improve.',
        priority: 5,
      });
    }

    if (v.okrsCount === 0 && (v.status === 'active' || v.status === 'exploring')) {
      out.push({
        ventureId: v.id,
        ventureName: v.name,
        action: 'fix_ops',
        rationale: 'No OKRs for an active venture — set one objective this quarter.',
        priority: 8,
      });
    }
  }

  return out.sort((a, b) => a.priority - b.priority).slice(0, 12);
}

export function buildPortfolioCsvRows(
  ventures: Array<{
    slug: string;
    name: string;
    status: string;
    category: string;
    priority: number;
    effectiveMrrMinor: number | null;
    monthlyCostsMinor: number | null;
    marginMinor: number | null;
    ownershipPercent: number | null;
    timeAllocationPercent: number | null;
    taxEntity: string | null;
    economicsMode: string;
    plNetOperating: number | null;
    runwayMonths: number | null;
    nextAction: string | null;
  }>,
): string[][] {
  const header = [
    'slug',
    'name',
    'status',
    'category',
    'priority',
    'economics_mode',
    'mrr_minor',
    'costs_minor',
    'margin_minor',
    'pl_net_operating_minor',
    'ownership_pct',
    'time_allocation_pct',
    'runway_months',
    'tax_entity',
    'next_action',
  ];
  const rows = ventures.map((v) => [
    v.slug,
    v.name,
    v.status,
    v.category,
    String(v.priority),
    v.economicsMode,
    v.effectiveMrrMinor != null ? String(v.effectiveMrrMinor) : '',
    v.monthlyCostsMinor != null ? String(v.monthlyCostsMinor) : '',
    v.marginMinor != null ? String(v.marginMinor) : '',
    v.plNetOperating != null ? String(v.plNetOperating) : '',
    v.ownershipPercent != null ? String(v.ownershipPercent) : '',
    v.timeAllocationPercent != null ? String(v.timeAllocationPercent) : '',
    v.runwayMonths != null ? String(v.runwayMonths) : '',
    v.taxEntity ?? '',
    v.nextAction ?? '',
  ]);
  return [header, ...rows];
}

export function csvEscapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildPortfolioCsv(ventures: Parameters<typeof buildPortfolioCsvRows>[0]): string {
  const rows = buildPortfolioCsvRows(ventures);
  return rows.map((r) => r.map(csvEscapeCell).join(',')).join('\n');
}

export function buildInvestorPackMarkdown(input: {
  generatedAt: string;
  portfolioMrrMinor: number;
  portfolioMarginMinor: number;
  ventureCount: number;
  timeAllocation: { total: number; valid: boolean };
  ventures: Array<{
    name: string;
    status: string;
    tagline: string | null;
    effectiveMrrMinor: number | null;
    marginMinor: number | null;
    ownershipPercent: number | null;
    timeAllocationPercent: number | null;
    okrs: VentureOkr[];
    topRecommendation: string | null;
  }>;
  recommendations: VentureStrategicRecommendation[];
}): string {
  const lines: string[] = [
    '# Goldspire Lab — investor pack',
    '',
    `_Generated ${input.generatedAt}_`,
    '',
    '## Portfolio snapshot',
    '',
    `- Ventures: **${input.ventureCount}**`,
    `- Reported MRR (portfolio): **€${(input.portfolioMrrMinor / 100).toFixed(0)}** (minor units aggregated)`,
    `- Estimated monthly margin: **€${(input.portfolioMarginMinor / 100).toFixed(0)}**`,
    `- Founder time allocated: **${input.timeAllocation.total}%**${input.timeAllocation.valid ? '' : ' _(over 100% — rebalance)_'}`,
    '',
    '## Ventures',
    '',
  ];

  for (const v of input.ventures) {
    lines.push(`### ${v.name} (${v.status})`);
    if (v.tagline) lines.push(v.tagline);
    if (v.effectiveMrrMinor != null) {
      lines.push(`- MRR: €${(v.effectiveMrrMinor / 100).toFixed(0)}`);
    }
    if (v.marginMinor != null) {
      lines.push(`- Est. margin: €${(v.marginMinor / 100).toFixed(0)}/mo`);
    }
    if (v.ownershipPercent != null && v.ownershipPercent < 100) {
      lines.push(`- Ownership: ${v.ownershipPercent}%`);
    }
    if (v.timeAllocationPercent != null) {
      lines.push(`- Time allocation: ${v.timeAllocationPercent}%`);
    }
    if (v.okrs.length > 0) {
      lines.push('- OKRs:');
      for (const o of v.okrs.slice(0, 3)) {
        lines.push(`  - ${o.objective} → ${o.keyResult} (${o.progressPercent}%)`);
      }
    }
    if (v.topRecommendation) lines.push(`- **Recommendation:** ${v.topRecommendation}`);
    lines.push('');
  }

  if (input.recommendations.length > 0) {
    lines.push('## Strategic actions', '');
    for (const r of input.recommendations.slice(0, 8)) {
      lines.push(`- **${r.ventureName}** (${r.action}): ${r.rationale}`);
    }
  }

  lines.push('', '---', '_Confidential — Goldspire Studio owner Lab export._');
  return lines.join('\n');
}
