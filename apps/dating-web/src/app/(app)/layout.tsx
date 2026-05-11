import Link from 'next/link';
import { Flame, Heart, MessageCircle, Sparkles, User } from 'lucide-react';
import { AppShell, Sidebar, Topbar, NotificationBell } from '@goldspire/ui';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const sections = [
    {
      items: [
        { label: 'Discover', href: '/discover', icon: <Flame className="h-4 w-4" /> },
        { label: 'Matches', href: '/matches', icon: <Heart className="h-4 w-4" /> },
        { label: 'Messages', href: '/messages', icon: <MessageCircle className="h-4 w-4" /> },
        { label: 'Likes you', href: '/likes', icon: <Sparkles className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Account',
      items: [{ label: 'Profile', href: '/profile', icon: <User className="h-4 w-4" /> }],
    },
  ];

  return (
    <AppShell
      sidebar={
        <Sidebar
          brand={
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
                <Heart className="h-4 w-4 fill-current" />
              </span>
              Heartline
            </Link>
          }
          sections={sections}
          footer={
            <Link
              href="/premium"
              className="block rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary hover:bg-primary/20"
            >
              Upgrade to Premium
            </Link>
          }
        />
      }
      topbar={
        <Topbar
          right={
            <>
              <NotificationBell />
              <Link
                href="/profile"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary"
              >
                Me
              </Link>
            </>
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}
