/**
 * Admin sidebar modules — core shell + template-specific sections.
 * Built at runtime from tenant products, metadata, and module flags.
 */

export type AdminModuleIcon =
  | 'layout-dashboard'
  | 'users'
  | 'package'
  | 'credit-card'
  | 'flag'
  | 'shield-alert'
  | 'message-square'
  | 'bar-chart-3'
  | 'history'
  | 'bell'
  | 'settings'
  | 'calendar'
  | 'store'
  | 'bot'
  | 'life-buoy';

export type AdminNavItemDef = {
  id: string;
  label: string;
  href: string;
  icon: AdminModuleIcon;
  /** Blueprint kinds on installed products that enable this item. */
  blueprintKinds?: readonly string[];
  /** Product template ids from tenant metadata. */
  templateIds?: readonly string[];
  /** Feature module flag key (module.*). */
  moduleFlag?: string;
  /** Minimum role rank — default TENANT_ADMIN. */
  minRole?: 'MODERATOR' | 'TENANT_ADMIN' | 'TENANT_OWNER';
};

export type AdminNavSectionDef = {
  label: string;
  items: readonly AdminNavItemDef[];
};

/** Always present for every tenant — client business operations. */
export const ADMIN_CORE_MODULES: readonly AdminNavItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard' },
  { id: 'users', label: 'Users', href: '/users', icon: 'users' },
  { id: 'products', label: 'Products', href: '/products', icon: 'package' },
  { id: 'subscriptions', label: 'Subscriptions', href: '/subscriptions', icon: 'credit-card' },
  { id: 'feature-flags', label: 'Feature flags', href: '/feature-flags', icon: 'flag', minRole: 'TENANT_ADMIN' },
  { id: 'audit', label: 'Audit log', href: '/audit', icon: 'history', minRole: 'TENANT_ADMIN' },
  { id: 'notifications', label: 'Notifications', href: '/notifications', icon: 'bell', minRole: 'TENANT_ADMIN' },
  { id: 'settings', label: 'Settings', href: '/settings', icon: 'settings', minRole: 'TENANT_OWNER' },
  { id: 'support-requests', label: 'Support access', href: '/support-access', icon: 'life-buoy', minRole: 'TENANT_OWNER' },
];

/** Unlocked by blueprint / template on installed products. */
export const ADMIN_TEMPLATE_MODULES: readonly AdminNavItemDef[] = [
  {
    id: 'moderation',
    label: 'Moderation',
    href: '/moderation',
    icon: 'shield-alert',
    blueprintKinds: ['social_matching', 'community', 'marketplace'],
    minRole: 'MODERATOR',
  },
  {
    id: 'messages',
    label: 'Messages',
    href: '/messages',
    icon: 'message-square',
    blueprintKinds: ['social_matching', 'community'],
    minRole: 'MODERATOR',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: 'bar-chart-3',
    blueprintKinds: ['social_matching', 'multi_staff_booking', 'community', 'b2b_saas_shell'],
    minRole: 'TENANT_ADMIN',
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: 'bar-chart-3',
    blueprintKinds: ['social_matching', 'community', 'marketplace'],
    minRole: 'TENANT_ADMIN',
  },
];

export type BuildAdminNavInput = {
  blueprintKinds: readonly string[];
  productTemplateId: string | null;
  enabledModuleFlags: ReadonlySet<string>;
  includeStudioOnly?: boolean;
};

const ROLE_RANK: Record<string, number> = {
  MODERATOR: 60,
  TENANT_ADMIN: 70,
  TENANT_OWNER: 80,
  STUDIO_STAFF: 90,
  STUDIO_OWNER: 100,
};

export function roleMeetsMin(actorRole: string, minRole?: AdminNavItemDef['minRole']): boolean {
  if (!minRole) return true;
  return (ROLE_RANK[actorRole] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}

function moduleMatches(
  mod: AdminNavItemDef,
  input: BuildAdminNavInput,
): boolean {
  if (mod.moduleFlag && !input.enabledModuleFlags.has(mod.moduleFlag)) return false;
  if (mod.blueprintKinds?.length) {
    const hasBlueprint = mod.blueprintKinds.some((k) => input.blueprintKinds.includes(k));
    if (!hasBlueprint) return false;
  }
  if (mod.templateIds?.length && input.productTemplateId) {
    if (!mod.templateIds.includes(input.productTemplateId)) return false;
  }
  return true;
}

/** Build sidebar sections for Admin from tenant install surface. */
export function buildAdminNavSections(input: BuildAdminNavInput): AdminNavSectionDef[] {
  const core = ADMIN_CORE_MODULES.filter((m) => moduleMatches(m, input));
  const template = ADMIN_TEMPLATE_MODULES.filter((m) => moduleMatches(m, input));

  const ops = template.filter((m) =>
    ['moderation', 'messages', 'analytics', 'reports'].includes(m.id),
  );
  const system = core.filter((m) =>
    ['feature-flags', 'audit', 'notifications', 'settings', 'support-requests'].includes(m.id),
  );
  const home = core.filter((m) =>
    ['dashboard', 'users', 'products', 'subscriptions'].includes(m.id),
  );

  const sections: AdminNavSectionDef[] = [];
  if (home.length) sections.push({ label: '', items: home });
  if (ops.length) sections.push({ label: 'Product operations', items: ops });
  if (system.length) sections.push({ label: 'System', items: system });
  return sections;
}
