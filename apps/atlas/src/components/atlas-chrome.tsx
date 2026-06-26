'use client';

import Link from 'next/link';
import { Compass, ExternalLink } from 'lucide-react';
import { UserMenu } from '@goldspire/ui';
import { env } from '@goldspire/config/env';
import type { PersonaDefinition } from '@goldspire/config';

export function AtlasChrome({
  persona,
  children,
}: {
  persona?: PersonaDefinition | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/80 bg-card/40 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 text-lg tracking-tight">
            <Compass className="h-5 w-5 text-primary" aria-hidden />
            <span className="font-semibold">Goldspire Atlas</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link
              href={env.NEXT_PUBLIC_CONSOLE_URL}
              className="hidden items-center gap-1 hover:text-foreground sm:flex"
            >
              Studio Console
              <ExternalLink className="h-3 w-3" />
            </Link>
            <UserMenu persona={persona ?? null} loginHref={`${env.NEXT_PUBLIC_ADMIN_URL}/login`} />
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}
