/**
 * Plain-language Console OS mode guide — shown in banners so founders
 * know what each area is for without reading the whole doc tree.
 */

import type { ConsoleOsModeId } from './console-os-routes';

export type ConsoleModeGuideEntry = {
  id: ConsoleOsModeId;
  label: string;
  oneLiner: string;
  youDoHere: readonly string[];
  notHere: string;
};

export const CONSOLE_MODE_GUIDE: readonly ConsoleModeGuideEntry[] = [
  {
    id: 'desk',
    label: 'Desk',
    oneLiner: 'What needs you today — queue only, not a report.',
    youDoHere: ['Triage enquiries', 'See runbook blockers', 'Jump to launch checklist'],
    notHere: 'Deep pipeline editing or catalog pricing',
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    oneLiner: 'Every client dollar — inbound → signed → delivering.',
    youDoHere: ['Convert enquiries', 'Move deal stages', 'Open engagement workspace'],
    notHere: 'Stamping tenants (use Build)',
  },
  {
    id: 'build',
    label: 'Build',
    oneLiner: 'Delivery capacity — launch, factory, stamp.',
    youDoHere: ['Launch wizard (any tier)', 'Track clone factory', 'Stamp & link tenant'],
    notHere: 'Changing public marketing copy',
  },
  {
    id: 'configure',
    label: 'Configure',
    oneLiner: 'What Goldspire sells and how automation behaves.',
    youDoHere: ['Charter & stop lines', 'Templates & SKUs', 'Studio settings & webhooks'],
    notHere: 'Day-to-day client deal work',
  },
  {
    id: 'insight',
    label: 'Insight',
    oneLiner: 'Numbers & portfolio — when the queue is quiet.',
    youDoHere: ['MRR & reports', 'Lab ventures', 'Deploy surface matrix'],
    notHere: 'Issuing portal links',
  },
] as const;

export function consoleModeGuide(mode: ConsoleOsModeId): ConsoleModeGuideEntry {
  const entry = CONSOLE_MODE_GUIDE.find((m) => m.id === mode);
  if (!entry) throw new Error(`Unknown mode: ${mode}`);
  return entry;
}
