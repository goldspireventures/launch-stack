import { Suspense } from 'react';
import { LoadingState } from '@goldspire/ui';

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}
