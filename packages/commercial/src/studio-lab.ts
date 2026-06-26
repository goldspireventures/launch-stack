/**
 * Studio Lab — owner-only personal portfolio (ventures, side projects, ideas).
 */

/** Lifecycle order — use for every status `<select>` (filters, editors). */
export const STUDIO_VENTURE_STATUSES = [
  'idea',
  'exploring',
  'active',
  'paused',
  'shipped',
  'archived',
] as const;

export type StudioVentureStatus = (typeof STUDIO_VENTURE_STATUSES)[number];

/** Statuses shown in create/edit and board filters (archive via Archive, not dropdown). */
export const STUDIO_VENTURE_EDITOR_STATUSES = STUDIO_VENTURE_STATUSES.filter(
  (s) => s !== 'archived',
);

/** Founder-friendly category order for dropdowns. */
export const STUDIO_VENTURE_CATEGORIES = [
  'product',
  'business',
  'tool',
  'content',
  'other',
] as const;

export type StudioVentureCategory = (typeof STUDIO_VENTURE_CATEGORIES)[number];

export const STUDIO_VENTURE_STATUS_LABEL: Record<StudioVentureStatus, string> = {
  idea: 'Idea',
  exploring: 'Exploring',
  active: 'Active',
  paused: 'Paused',
  shipped: 'Shipped',
  archived: 'Archived',
};

/** 1 = highest attention on Desk / board sort. */
export const STUDIO_VENTURE_PRIORITY_OPTIONS = [
  { value: 1, label: 'P1 — highest' },
  { value: 2, label: 'P2' },
  { value: 3, label: 'P3 — default' },
  { value: 4, label: 'P4' },
  { value: 5, label: 'P5 — lowest' },
] as const;

export const DEPLOYMENT_ENVIRONMENT_ORDER = ['local', 'staging', 'production'] as const;

export const STUDIO_VENTURE_CATEGORY_LABEL: Record<StudioVentureCategory, string> = {
  business: 'Business',
  product: 'Product',
  tool: 'Tool',
  content: 'Content',
  other: 'Other',
};

export const STUDIO_VENTURE_STATUS_TONE: Record<
  StudioVentureStatus,
  'default' | 'signal' | 'warn' | 'muted'
> = {
  idea: 'muted',
  exploring: 'default',
  active: 'signal',
  paused: 'warn',
  shipped: 'signal',
  archived: 'muted',
};

/** Days without touch before a non-archived venture surfaces as stale on Desk. */
export const STUDIO_VENTURE_STALE_TOUCH_MS = 14 * 24 * 60 * 60 * 1000;

/** Client products first, then studio tools; env local → staging → production; then name. */
export function sortDeploymentsForVenturePicker<
  T extends { name: string; environment: string; isStudioTool: boolean },
>(rows: T[]): T[] {
  const envRank = (e: string) => {
    const i = (DEPLOYMENT_ENVIRONMENT_ORDER as readonly string[]).indexOf(e);
    return i === -1 ? 99 : i;
  };
  return [...rows].sort((a, b) => {
    const tool = Number(a.isStudioTool) - Number(b.isStudioTool);
    if (tool !== 0) return tool;
    const env = envRank(a.environment) - envRank(b.environment);
    if (env !== 0) return env;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function slugifyVentureName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export function ventureAttentionPriority(input: {
  status: StudioVentureStatus;
  priority: number;
  nextActionDue: Date | null;
  lastTouchedAt: Date;
  nextAction: string | null;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  if (input.status === 'archived' || input.status === 'shipped') return 99;
  if (input.nextActionDue && input.nextActionDue.getTime() < now.getTime()) {
    return 5 + Math.min(4, input.priority);
  }
  if (!input.nextAction?.trim()) {
    return 6 + Math.min(4, input.priority);
  }
  const staleCutoff = now.getTime() - STUDIO_VENTURE_STALE_TOUCH_MS;
  if (input.lastTouchedAt.getTime() < staleCutoff && input.status === 'active') {
    return 7 + Math.min(4, input.priority);
  }
  return 20 + input.priority;
}

export function ventureAttentionLabel(input: {
  status: StudioVentureStatus;
  nextActionDue: Date | null;
  lastTouchedAt: Date;
  nextAction: string | null;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  if (input.nextActionDue && input.nextActionDue.getTime() < now.getTime()) {
    return 'Lab · next action overdue';
  }
  if (!input.nextAction?.trim()) {
    return 'Lab · missing next action';
  }
  const staleCutoff = now.getTime() - STUDIO_VENTURE_STALE_TOUCH_MS;
  if (input.lastTouchedAt.getTime() < staleCutoff && input.status === 'active') {
    return 'Lab · stale (no touch in 14d)';
  }
  return 'Lab · check in';
}
