import type { Metadata } from 'next';
import { Toaster, ClientErrorReporter } from '@goldspire/ui';
import { ShippedTemplateDemoBanner } from '@goldspire/ui/components/shipped-template-demo-banner';
import { appConfig } from '@/app.config';
import { hexToHslChannels } from '@/lib/hexToHslChannels';
import { TRPCProvider } from '@/lib/trpc';
import './globals.css';

const primaryChannels = hexToHslChannels(appConfig.theme.primaryHex);

const marketingOrigin = (process.env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL ?? 'http://localhost:4010').replace(
  /\/$/,
  '',
);

export const metadata: Metadata = {
  title: {
    default: `${appConfig.brand.name} · ${appConfig.brand.tagline}`,
    template: `%s · ${appConfig.brand.name}`,
  },
  description: `${appConfig.brand.name} — intentional dating: discover, match, and chat on the Goldspire Social Matching blueprint.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="dark"
      style={
        {
          '--primary': primaryChannels,
          '--primary-foreground': '0 0% 100%',
          '--accent': primaryChannels,
          '--accent-foreground': '0 0% 100%',
          '--ring': primaryChannels,
        } as React.CSSProperties
      }
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ClientErrorReporter app="heartline" />
        <TRPCProvider>
          <ShippedTemplateDemoBanner
            productName={appConfig.brand.name}
            marketingUrl={`${marketingOrigin}/templates/${encodeURIComponent('social_matching/dating')}`}
          />
          {children}
        </TRPCProvider>
        <Toaster />
      </body>
    </html>
  );
}
