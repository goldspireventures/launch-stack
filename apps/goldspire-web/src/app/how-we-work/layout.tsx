import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How we work · Goldspire Studio',
  description:
    'Four phases from discovery to handover — plus plain definitions for go-live, billing, and scope before you sign.',
};

export default function HowWeWorkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
