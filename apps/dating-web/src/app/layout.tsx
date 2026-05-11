import type { Metadata } from 'next';
import { TRPCProvider } from '@/lib/trpc';
import './globals.css';

export const metadata: Metadata = {
  title: 'Heartline — built on Goldspire Launch Stack',
  description:
    'A reference Social Matching app built on the Goldspire Launch Stack. Profiles, discovery, matches, chat, paywall.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
