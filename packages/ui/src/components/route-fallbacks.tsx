'use client';

import Link from 'next/link';
import { Button } from './primitives';

export function AppRouteError({
  error,
  reset,
  title = 'Something went wrong',
  homeHref = '/',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  homeHref?: string;
}) {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || 'An unexpected error occurred. You can try again or return home.'}
      </p>
      {error.digest ? (
        <p className="font-mono text-[10px] text-muted-foreground/70">Ref: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href={homeHref}>Go home</Link>
        </Button>
      </div>
    </main>
  );
}
