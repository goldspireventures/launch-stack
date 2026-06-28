import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing · Goldspire Studio',
  description:
    'Three paths to size a project — adapt a shipped template, shape a new one, or build a new foundation. Figures orient; your signed proposal settles scope.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
