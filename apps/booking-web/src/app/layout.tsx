import './globals.css';
import { ClientErrorReporter, PageTransition, Toaster } from '@goldspire/ui';
import { TRPCProvider } from '@/lib/trpc';
import { NovaSiteHeader } from '@/components/nova-site-header';

export const metadata = {
  title: 'Nova Care · Virtual clinic',
  description: 'Telehealth-style booking demo on the Goldspire multi-staff booking blueprint.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <ClientErrorReporter app="booking-web" />
        <TRPCProvider>
          <div className="flex min-h-screen flex-col">
            <NovaSiteHeader />
            <PageTransition className="flex-1">{children}</PageTransition>
          </div>
        </TRPCProvider>
        <Toaster />
      </body>
    </html>
  );
}
