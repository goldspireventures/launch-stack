import type { Metadata } from 'next';
import { SITE_SEO, STUDIO_BRAND } from '@goldspire/commercial';
import { Toaster, ClientErrorReporter, PageTransition } from '@goldspire/ui';
import { TRPCProvider } from '@/lib/trpc';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import './globals.css';

export const metadata: Metadata = {
  title: SITE_SEO.title,
  description: SITE_SEO.description,
  openGraph: {
    title: SITE_SEO.openGraphTitle,
    description: SITE_SEO.openGraphDescription,
    type: 'website',
  },
  metadataBase: new URL(STUDIO_BRAND.siteUrl),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ClientErrorReporter app="goldspire-web" />
        <TRPCProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">
              <PageTransition>{children}</PageTransition>
            </main>
            <SiteFooter />
          </div>
        </TRPCProvider>
        <Toaster />
      </body>
    </html>
  );
}
