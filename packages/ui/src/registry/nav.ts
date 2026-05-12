import type { ComponentType, SVGProps } from 'react';

export type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export interface NavItem {
  label: string;
  href: string;
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
