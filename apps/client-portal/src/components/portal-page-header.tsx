'use client';

import type { ComponentProps } from 'react';
import { EditorialPageHeader } from '@goldspire/ui';

/** Client portal — editorial page titles (Command Bridge). */
export function PortalPageHeader(props: ComponentProps<typeof EditorialPageHeader>) {
  return <EditorialPageHeader {...props} />;
}
