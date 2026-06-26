import type { MetadataRoute } from 'next';
import { STUDIO_BRAND } from '@goldspire/commercial';

export default function robots(): MetadataRoute.Robots {
  const base = STUDIO_BRAND.siteUrl.replace(/\/$/, '');
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: `${base}/sitemap.xml`,
  };
}
