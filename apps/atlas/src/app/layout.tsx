import './globals.css';
import { Toaster, ClientErrorReporter } from '@goldspire/ui';
import { TRPCProvider } from '@/lib/trpc';

export const metadata = {
  title: 'Goldspire Atlas',
  description: 'Internal knowledge portal — ask the platform in plain English.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <ClientErrorReporter app="atlas" />
        <TRPCProvider>{children}</TRPCProvider>
        <Toaster />
      </body>
    </html>
  );
}
