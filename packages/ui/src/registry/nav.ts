/**
 * Lucide icon name. We use string keys instead of component references so that
 * the registry is **serializable across the React Server Components boundary**
 * — passing a function (component constructor) from a server-component layout
 * into a client `<Sidebar>` would otherwise throw with:
 *
 *   "Functions cannot be passed directly to Client Components"
 *
 * The resolution happens inside the (client) Sidebar via `lucide-react/icons`.
 * Unknown names fall back to a `Circle` icon so a typo is never fatal.
 */
export type NavIcon = string;

export interface NavItem {
  label: string;
  href: string;
  /** Lucide icon name (kebab-case or PascalCase both accepted by the resolver). */
  icon: NavIcon;
  /** If set, only render when this module flag is enabled for the current tenant. */
  moduleFlag?: string;
  /** If set, only render for users in one of these roles. */
  roles?: string[];
  /** Optional badge shown on the right (e.g. "Beta", or a count). */
  badge?: string | number;
}

export interface NavSection {
  label: string;
  items: NavItem[];
  /** If set, hide the entire section unless the user has this role. */
  roles?: string[];
}

export type NavRegistry = readonly NavSection[];
