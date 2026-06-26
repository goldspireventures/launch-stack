import type { CommercialPlanSnapshot } from './plan';
import {
  BUILD_CLIENT_DELIVERABLES_V0,
  CLONE_SCOPE_GUARDRAILS_V0,
  ENGAGEMENT_SCOPE_LAYERS_V0,
} from './studio-service-catalog';

import { formatMinorUnits } from './format-currency';

function formatMoney(minor: number, currency: string): string {
  return formatMinorUnits(minor, currency);
}

/** Proposal-style Markdown for copy/paste into Docs / Notion. */
export function commercialPlanToMarkdown(
  dealTitle: string,
  clientName: string,
  plan: CommercialPlanSnapshot,
  extraNotes?: string | null,
): string {
  const { input, milestones, subcontractingNote } = plan;
  const lines: string[] = [
    `# ${dealTitle}`,
    '',
    `**Client:** ${clientName}`,
    `**Engagement:** ${input.engagementKind === 'mvp' ? 'MVP' : 'MVP with planned production phase'}`,
    `**Timeline (indicative):** ${input.weeksMin}–${input.weeksMax} weeks`,
    `**Commercial total:** ${formatMoney(input.totalFeeMinorUnits, input.currency)}`,
    '',
    '## Payment milestones',
    '',
    '| # | Milestone | % of total | Amount |',
    '|---|-----------|------------|--------|',
  ];

  for (const m of milestones) {
    const pct = (m.percentBps / 100).toFixed(2);
    lines.push(
      `| ${m.order} | ${m.title} | ${pct}% | ${formatMoney(m.amountMinorUnits, input.currency)} |`,
    );
  }

  lines.push('', '### Acceptance (per milestone)', '');
  for (const m of milestones) {
    lines.push(`**${m.order}. ${m.title}**`, '', m.description, '');
    for (const a of m.acceptance) {
      lines.push(`- ${a}`);
    }
    lines.push('');
  }

  lines.push('## Subcontracting / delivery model', '', subcontractingNote, '');

  lines.push(
    '## What the client receives (build engagements)',
    '',
    'The following is boilerplate for proposals — trim to match the signed scope.',
    '',
    ...BUILD_CLIENT_DELIVERABLES_V0.map((b) => `- ${b}`),
    '',
  );

  lines.push(
    '## How we scope template and clone work',
    '',
    'Three layers — trim this section for non-template engagements.',
    '',
    ...ENGAGEMENT_SCOPE_LAYERS_V0.flatMap((L) => [
      `### ${L.headline}`,
      '',
      L.description,
      '',
      `**Typical clone path:** ${L.cloneIncludes}`,
      '',
      `**Boundary:** ${L.cloneBoundary}`,
      '',
    ]),
  );

  lines.push(
    '## Clone / floor scope guardrails',
    '',
    'Use for template-led or smallest-path engagements — trim or supersede where the signed scope differs.',
    '',
    ...CLONE_SCOPE_GUARDRAILS_V0.map((b) => `- ${b}`),
    '',
  );

  if (extraNotes?.trim()) {
    lines.push('## Internal notes', '', extraNotes.trim(), '');
  }

  lines.push('---', `_Generated ${plan.generatedAt}_`, '');
  return lines.join('\n');
}
