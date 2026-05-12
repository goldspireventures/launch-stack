import type { CommercialPlanSnapshot } from './plan';

function formatMoney(minor: number, currency: string): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(major);
  } catch {
    return `${(major).toFixed(2)} ${currency}`;
  }
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

  if (extraNotes?.trim()) {
    lines.push('## Internal notes', '', extraNotes.trim(), '');
  }

  lines.push('---', `_Generated ${plan.generatedAt}_`, '');
  return lines.join('\n');
}
