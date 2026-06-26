import Link from 'next/link';
import { Button } from './primitives';

export function AppNotFound({
  title = 'Page not found',
  homeHref = '/',
  homeLabel = 'Go home',
}: {
  title?: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you requested does not exist or may have moved.
      </p>
      <Button variant="outline" asChild>
        <Link href={homeHref}>{homeLabel}</Link>
      </Button>
    </main>
  );
}
