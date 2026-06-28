import './globals.css';
import { ClientErrorReporter, PageTransition, Toaster } from '@goldspire/ui';
import { ShippedTemplateDemoBanner } from '@goldspire/ui/components/shipped-template-demo-banner';
import { TRPCProvider } from '@/lib/trpc';
import { NovaSiteHeader } from '@/components/nova-site-header';

const marketingOrigin = (process.env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL ?? 'http://localhost:4010').replace(
  /\/$/,
  '',
);

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
          <ShippedTemplateDemoBanner
            productName="Nova Care"
            marketingUrl={`${marketingOrigin}/templates/${encodeURIComponent('multi_staff_booking/clinic')}`}
          />
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
