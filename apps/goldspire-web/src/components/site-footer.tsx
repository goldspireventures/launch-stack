import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SITE_FOOTER, STUDIO_BRAND } from '@goldspire/commercial';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-32 border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Link href="/" className="text-sm font-semibold tracking-tight">
              {STUDIO_BRAND.shortName}
            </Link>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">{SITE_FOOTER.blurb}</p>
          </div>
          <Column title="Studio" links={[...SITE_FOOTER.studioLinks]} />
          <Column title="Offerings" links={[...SITE_FOOTER.templateLinks]} />
          <Column
            title="Get in touch"
            links={[
              { href: 'mailto:hello@goldspire.dev', label: 'hello@goldspire.dev', external: true },
              { href: '/contact', label: 'Discovery enquiry' },
              { href: '/status', label: 'Status' },
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {year} {STUDIO_BRAND.legalName} ·{' '}
            <a
              href={STUDIO_BRAND.parentSiteUrl}
              className="hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              {STUDIO_BRAND.parentLegalName}
            </a>
          </p>
          <p className="flex flex-wrap gap-4">
            <Link href={SITE_FOOTER.legal.privacyHref} className="hover:text-foreground">
              {SITE_FOOTER.legal.privacyLabel}
            </Link>
            <Link href={SITE_FOOTER.legal.termsHref} className="hover:text-foreground">
              {SITE_FOOTER.legal.termsLabel}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

function Column({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string; external?: boolean }>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</p>
      <ul className="mt-3 space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            {l.external ? (
              <a
                href={l.href}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
                <ArrowUpRight className="h-3 w-3" />
              </a>
            ) : (
              <Link
                href={l.href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
