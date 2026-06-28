import './globals.css';
import { ClientErrorReporter, PageTransition, Toaster } from '@goldspire/ui';
import { ReferenceDemoBanner } from '@goldspire/ui/components/reference-demo-banner';
import { TRPCProvider } from '@/lib/trpc';

const marketingOrigin = (process.env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL ?? 'http://localhost:4010').replace(
  /\/$/,
  '',
);

export const metadata = {
  title: 'Bazaar · Marketplace',
  description: 'Built on the Goldspire Marketplace blueprint.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <TRPCProvider>
          <ClientErrorReporter app="marketplace-web" />
          <ReferenceDemoBanner
            productName="Bazaar"
            marketingUrl={`${marketingOrigin}/templates/${encodeURIComponent('marketplace/local_listings')}`}
          />
          <PageTransition className="min-h-0">{children}</PageTransition>
          <Toaster />
        </TRPCProvider>
      </body>
    </html>
  );
}
