import { listCatalogDemoUrls } from '@goldspire/config/catalog-demo-urls';
import { STUDIO_BRAND } from '@goldspire/commercial';
import { StudioStatusBoard, type StatusTarget } from '@/components/studio-status-board';

export const metadata = {
  title: `Service status · ${STUDIO_BRAND.shortName} Studio`,
  description: 'Health checks for goldspire.dev and our public product demos.',
};

export default function StatusPage() {
  const env = process.env as Record<string, string | undefined>;
  const marketingUrl = env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL ?? STUDIO_BRAND.siteUrl;
  const demos = listCatalogDemoUrls(env);

  const targets: StatusTarget[] = [
    {
      id: 'marketing',
      label: `Marketing (${STUDIO_BRAND.siteUrl})`,
      url: marketingUrl,
      sameOrigin: true,
    },
    ...demos.map(({ app, url }) => ({
      id: app.id,
      label: app.label,
      url,
    })),
  ];

  return (
    <article className="mx-auto max-w-3xl px-6 py-20 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Service status</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Live checks against our marketing site and public demo environments. Green means the service responded;
        amber or red means something needs attention on our side. If a demo is offline, contact{' '}
        <a href={`mailto:${STUDIO_BRAND.email}`} className="text-primary hover:underline">
          {STUDIO_BRAND.email}
        </a>
        .
      </p>
      <StudioStatusBoard targets={targets} />
    </article>
  );
}
