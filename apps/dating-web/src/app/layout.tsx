import type { Metadata } from 'next';
import { appConfig } from '@/app.config';
import { hexToHslChannels } from '@/lib/hexToHslChannels';
import { TRPCProvider } from '@/lib/trpc';
import './globals.css';

const primaryChannels = hexToHslChannels(appConfig.theme.primaryHex);

export const metadata: Metadata = {
  title: `${appConfig.brand.name} — built on Goldspire Launch Stack`,
  description: `A reference Social Matching app built on the Goldspire Launch Stack. ${appConfig.brand.tagline}`,
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
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
