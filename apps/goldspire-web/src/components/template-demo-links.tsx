'use client';

import { ExternalLink } from 'lucide-react';
import { getCatalogDemoForTemplate } from '@goldspire/config/catalog-demo-urls';
import { demoUrlForTemplate, salesDemoPortalUrl } from '@/lib/public-demo-links';

export function TemplateDemoLinks({ templateId }: { templateId: string }) {
  const demo = getCatalogDemoForTemplate(templateId);
  const productUrl = demoUrlForTemplate(templateId);
  const portal = salesDemoPortalUrl();

  if (!demo && !productUrl) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <p className="text-sm font-medium text-foreground">Try before you brief us</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Live catalog demos run on the same stack we deliver. Sample data only — not your production
        environment. Tier 1 fixed-price clones today: dating and clinic booking; other shapes are
        quoted per proposal.
      </p>
      <ul className="mt-4 space-y-3 text-sm">
        {productUrl && demo ? (
          <li>
            <a
              href={productUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
            >
              {demo.label} product demo
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
            <p className="mt-0.5 text-xs text-muted-foreground">{demo.tagline}</p>
          </li>
        ) : null}
        <li>
          <a
            href={portal}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
          >
            Sample project hub
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How clients follow milestones, documents, and payments after contract.
          </p>
        </li>
      </ul>
    </div>
  );
}
