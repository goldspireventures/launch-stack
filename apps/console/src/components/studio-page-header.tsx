'use client';

import type { ComponentProps } from 'react';
import { EditorialPageHeader } from '@goldspire/ui';
import { useStudioEmbed } from '@/components/studio/studio-embed-context';

/** Console-standard page header — hidden when rendered inside a mode tab shell. */
export function StudioPageHeader(props: ComponentProps<typeof EditorialPageHeader>) {
  const embedded = useStudioEmbed();
  if (embedded) return null;
  return <EditorialPageHeader {...props} />;
}
