import type { MetadataRoute } from 'next';
import { siteOrigin, siteIndexable } from '@/lib/site-metadata';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteIndexable) return [];
  return ['/', '/termos', '/privacidade', '/creditos'].map((path) => ({
    url: new URL(path, siteOrigin).href,
  }));
}
