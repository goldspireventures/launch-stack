import type { MetadataRoute } from 'next';
import { STUDIO_BRAND } from '@goldspire/commercial';
import { listTemplates } from '@goldspire/blueprints';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = STUDIO_BRAND.siteUrl.replace(/\/$/, '');
  const now = new Date();
  const staticRoutes = ['', '/templates', '/pricing', '/how-we-work', '/contact', '/case-studies', '/privacy', '/terms'];
  return [
    ...staticRoutes.map((path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '' ? 1 : 0.7,
    })),
    ...listTemplates()
      .filter((t) => t.status !== 'planned')
      .map((t) => ({
      url: `${base}/templates/${encodeURIComponent(t.id)}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: t.status === 'shipped' ? 0.85 : 0.75,
    })),
  ];
}
