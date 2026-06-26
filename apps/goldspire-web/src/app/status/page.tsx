import { listCatalogDemoUrls } from '@goldspire/config/catalog-demo-urls';
import { STUDIO_BRAND } from '@goldspire/commercial';
import { StudioStatusBoard, type StatusTarget } from '@/components/studio-status-board';

export const metadata = {
  title: `Status · ${STUDIO_BRAND.shortName} Studio`,
  description: 'Live demo and marketing surface health (development/staging).',
};

export default function StatusPage() {
  const env = process.env as Record<string, string | undefined>;
  const marketingUrl = env.NEXT_PUBLIC_GOLDSPIRE_MARKETING_URL ?? 'http://localhost:4010';
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
      <h1 className="text-3xl font-semibold tracking-tight">Studio status</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Probes <code className="rounded bg-muted px-1">/api/health</code> from your browser. In local dev, start the
        full stack with <code className="rounded bg-muted px-1">pnpm dev</code> — &quot;Not running&quot; usually means
        that port is stopped, not a production outage. A 503 with &quot;Degraded&quot; means the app responded but the
        database check failed.
      </p>
      <StudioStatusBoard targets={targets} />
    </article>
  );
}
