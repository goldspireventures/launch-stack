import './globals.css';
import { Toaster, ClientErrorReporter } from '@goldspire/ui';
import { TRPCProvider } from '@/lib/trpc';
import { readActiveTenantSlug } from '@/lib/active-tenant';

export const metadata = {
  title: 'Goldspire Admin',
  description: 'Per-tenant admin console for products built on Goldspire.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeTenantSlug = await readActiveTenantSlug();
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <ClientErrorReporter app="admin" />
        <TRPCProvider tenantSlug={activeTenantSlug}>{children}</TRPCProvider>
        <Toaster />
      </body>
    </html>
  );
}
