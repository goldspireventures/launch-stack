'use client';

import { AppRouteError } from '@goldspire/ui';

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppRouteError {...props} title="Project hub" />;
}
