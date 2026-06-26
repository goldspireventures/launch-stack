import type { LucideIcon } from 'lucide-react';
import { GraduationCap, Heart, LayoutTemplate } from 'lucide-react';

const ICON_FOR_TEMPLATE: Record<string, LucideIcon> = {
  heart: Heart,
  'graduation-cap': GraduationCap,
};

/** Resolve blueprint `brand.iconName` to a Lucide icon component. */
export function templatePanelIcon(iconName: string): LucideIcon {
  return ICON_FOR_TEMPLATE[iconName] ?? LayoutTemplate;
}

export { GraduationCap, Heart, LayoutTemplate };
