import './globals.css';
import { TRPCProvider } from '@/lib/trpc';

export const metadata = {
  title: 'Goldspire Admin',
  description: 'Per-tenant admin console for products built on Goldspire.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <TRPCProvider tenantSlug="heartline">{children}</TRPCProvider>
      </body>
    </html>
  );
}
