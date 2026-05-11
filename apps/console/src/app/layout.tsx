import './globals.css';
import { TRPCProvider } from '@/lib/trpc';

export const metadata = {
  title: 'Goldspire Studio Console',
  description: 'Internal control room for the Goldspire studio.',
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
