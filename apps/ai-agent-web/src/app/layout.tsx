import './globals.css';
import { PageTransition, Toaster } from '@goldspire/ui';
import { ReferenceDemoBanner } from '@goldspire/ui/components/reference-demo-banner';
import { TRPCProvider } from '@/lib/trpc';

const marketingOrigin = (process.env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL ?? 'http://localhost:4010').replace(
  /\/$/,
  '',
);

export const metadata = {
  title: 'Lumen · AI Co-pilot',
  description: 'Built on the Goldspire Vertical AI Agent blueprint.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <TRPCProvider>
          <ReferenceDemoBanner
            productName="Lumen"
            marketingUrl={`${marketingOrigin}/templates/vertical_ai_agent/studio_assistant`}
          />
          <PageTransition className="min-h-0">{children}</PageTransition>
          <Toaster />
        </TRPCProvider>
      </body>
    </html>
  );
}
