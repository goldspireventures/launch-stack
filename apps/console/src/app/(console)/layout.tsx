import Link from 'next/link';
import { AppShell, Sidebar, Topbar, consoleNav } from '@goldspire/ui';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      sidebar={
        <Sidebar
          brand={
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/20 text-primary">
                G
              </span>
              Studio Console
            </Link>
          }
          sections={consoleNav}
        />
      }
      topbar={<Topbar title="Goldspire · Studio Console" />}
    >
      {children}
    </AppShell>
  );
}
