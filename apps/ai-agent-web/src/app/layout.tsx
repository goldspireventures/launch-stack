import './globals.css';
import { TRPCProvider } from '@/lib/trpc';

export const metadata = {
  title: 'Lumen · AI Co-pilot',
  description: 'Built on the Goldspire Vertical AI Agent blueprint.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
