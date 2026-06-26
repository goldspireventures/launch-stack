import { formatMinorUnits } from '@goldspire/commercial';
import type { LucideIcon } from 'lucide-react';

export type { PortalDeckTab } from '@goldspire/commercial';
export { defaultPortalDeckTab } from '@goldspire/commercial';

/** Currency display aligned with Studio Console (`DISPLAY_CURRENCY_LOCALE`). */
export function formatMinor(minor: number, currency: string) {
  return formatMinorUnits(minor, currency);
}
import {
  BadgeCheck,
  CircleDashed,
  ClipboardList,
  CreditCard,
  Flag,
  MessageCircle,
  Rocket,
  Sparkles,
} from 'lucide-react';

export function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatTimelineDayLabel(d: Date): string {
  const now = new Date();
  const t0 = startOfLocalDay(now);
  const t1 = startOfLocalDay(d);
  const dayMs = 86_400_000;
  if (t1 === t0) return 'Today';
  if (t1 === t0 - dayMs) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatAbsoluteShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatRelative(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export type PortalTimelineRow = {
  id: string;
  kind: string;
  source: string;
  payload: Record<string, unknown>;
  createdAt: Date | string;
};

export function describePortalTimelineRow(
  row: PortalTimelineRow,
  defaultCurrency: string,
  milestoneTitleByKey: Map<string, string>,
): string {
  const p = row.payload;
  switch (row.kind) {
    case 'deal_accepted':
      return 'You accepted the engagement — commercial terms acknowledged here.';
    case 'intake_submitted':
      return 'Kickoff questionnaire submitted (locked snapshot for your studio).';
    case 'payment_settled': {
      const label = typeof p.label === 'string' ? p.label : 'Milestone payment';
      const minor = typeof p.amountMinorUnits === 'number' ? p.amountMinorUnits : 0;
      const cur = typeof p.currency === 'string' ? p.currency : defaultCurrency;
      return `Payment recorded · ${label} · ${formatMinor(minor, cur)}`;
    }
    case 'milestone_updated': {
      const key = typeof p.milestoneKey === 'string' ? p.milestoneKey : '';
      const title = milestoneTitleByKey.get(key) ?? key;
      const status = typeof p.status === 'string' ? p.status.replace(/_/g, ' ') : 'updated';
      const preview = typeof p.notesPreview === 'string' && p.notesPreview ? ` · “${p.notesPreview}”` : '';
      return `Milestone “${title}” → ${status}${preview}`;
    }
    case 'staging_deployed': {
      const url = typeof p.url === 'string' ? p.url : typeof p.stagingUrl === 'string' ? p.stagingUrl : null;
      return url ? `Staging updated · ${url}` : 'Staging environment updated.';
    }
    case 'stamp_suggested': {
      const href = typeof p.onboardHref === 'string' ? p.onboardHref : null;
      return href
        ? 'Kickoff paid — your studio can stamp the tenant from the onboard wizard.'
        : 'Kickoff paid — your studio is ready to stamp your tenant.';
    }
    case 'studio_note':
      return typeof p.text === 'string'
        ? p.text
        : typeof p.message === 'string'
          ? p.message
          : 'Your studio posted an update.';
    case 'client_note':
      return typeof p.text === 'string' ? p.text : 'You added a note.';
    default:
      return row.kind.replace(/_/g, ' ');
  }
}

export type PortalTimelineVisual = { Icon: LucideIcon; iconWrap: string };

export function portalTimelineVisual(kind: string): PortalTimelineVisual {
  switch (kind) {
    case 'deal_accepted':
      return { Icon: BadgeCheck, iconWrap: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' };
    case 'intake_submitted':
      return { Icon: ClipboardList, iconWrap: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300' };
    case 'payment_settled':
      return { Icon: CreditCard, iconWrap: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300' };
    case 'milestone_updated':
      return { Icon: Flag, iconWrap: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200' };
    case 'staging_deployed':
      return { Icon: Rocket, iconWrap: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-200' };
    case 'stamp_suggested':
      return { Icon: Sparkles, iconWrap: 'border-primary/40 bg-primary/10 text-primary' };
    case 'studio_note':
      return { Icon: Sparkles, iconWrap: 'border-primary/40 bg-primary/10 text-primary' };
    case 'client_note':
      return { Icon: MessageCircle, iconWrap: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200' };
    default:
      return { Icon: CircleDashed, iconWrap: 'border-border bg-muted/40 text-muted-foreground' };
  }
}

export function buildPortalTimelineSections(rows: PortalTimelineRow[]) {
  type Sec =
    | { type: 'header'; key: string; label: string }
    | { type: 'row'; key: string; row: PortalTimelineRow };
  const out: Sec[] = [];
  let lastDay = '';
  for (const row of rows) {
    const d = new Date(row.createdAt);
    if (Number.isNaN(d.getTime())) {
      out.push({ type: 'row', key: row.id, row });
      continue;
    }
    const dk = d.toDateString();
    if (dk !== lastDay) {
      lastDay = dk;
      out.push({ type: 'header', key: `day-${dk}`, label: formatTimelineDayLabel(d) });
    }
    out.push({ type: 'row', key: row.id, row });
  }
  return out;
}

export function timelineActorLabel(kind: string): string {
  if (kind === 'deal_accepted' || kind === 'intake_submitted' || kind === 'client_note') return 'You';
  if (kind === 'studio_note') return 'Studio';
  if (kind === 'payment_settled') return 'Payment';
  if (kind === 'milestone_updated') return 'Workflow';
  if (kind === 'staging_deployed') return 'Release';
  if (kind === 'stamp_suggested') return 'Studio';
  return 'Activity';
}

