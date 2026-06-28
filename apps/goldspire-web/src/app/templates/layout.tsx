import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Templates · Goldspire Studio',
  description:
    'Production-grade product templates — dating, clinic booking, marketplace, community, and more. Brand and scope on paper before build.',
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
