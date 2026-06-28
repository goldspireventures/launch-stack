import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Examples · Goldspire Studio',
  description:
    'Reference product shapes we ship — live templates you can read end-to-end, then adapt for your brand.',
};

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
