import type { MetadataRoute } from 'next';
import { siteOrigin, siteIndexable } from '@/lib/site-metadata';

export default function robots(): MetadataRoute.Robots {
  return siteIndexable
    ? {
        rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/offline.html'] },
        sitemap: `${siteOrigin}/sitemap.xml`,
      }
    : { rules: { userAgent: '*', disallow: '/' } };
}
