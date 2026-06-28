import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact · Goldspire Studio',
  description:
    'Tell us what you are building. We reply personally with fit and what a first proposal would need to cover.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
