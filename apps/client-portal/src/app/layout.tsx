import './globals.css';
import { ClientErrorReporter, PageTransition, Toaster } from '@goldspire/ui';
import { TRPCProvider } from '@/lib/trpc';

export const metadata = {
  title: 'Goldspire — Client portal',
  description: 'Review your engagement, accept commercial terms, and pay milestones securely.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <ClientErrorReporter app="client-portal" />
        <TRPCProvider>
          <PageTransition className="min-h-0">{children}</PageTransition>
        </TRPCProvider>
        <Toaster />
      </body>
    </html>
  );
}
