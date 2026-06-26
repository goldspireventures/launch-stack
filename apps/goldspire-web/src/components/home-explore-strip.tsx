import Link from 'next/link';
import { ArrowUpRight, Layers, Receipt, Workflow } from 'lucide-react';
import { HOME_EXPLORE } from '@goldspire/commercial';
import { Eyebrow } from './ui-primitives';

const ICONS = [Layers, Receipt, Workflow] as const;

export function HomeExploreStrip() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 sm:px-8">
      <Eyebrow>{HOME_EXPLORE.eyebrow}</Eyebrow>
      <h2 className="mt-4 max-w-2xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        {HOME_EXPLORE.title}
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {HOME_EXPLORE.paths.map(({ href, label, blurb }, i) => {
          const Icon = ICONS[i] ?? Layers;
          return (
            <Link
              key={href}
              href={href}
              className="group flex flex-col rounded-2xl border border-border/70 bg-card/30 p-5 transition hover:border-primary/40 hover:bg-card/50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-4 flex items-center gap-1.5 text-lg font-semibold tracking-tight">
                {label}
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{blurb}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
