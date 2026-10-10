import { newsPublishers } from './news-sources';
const articleHosts = [...newsPublishers.map((p) => p.domain), 'quaest.com.br', 'atlasintel.org'];
export function articleUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' &&
      !u.port &&
      !u.username &&
      !u.password &&
      articleHosts.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))
      ? u
      : null;
  } catch {
    return null;
  }
}
const imageHosts = [
  ...articleHosts,
  'glbimg.com',
  'imguol.com.br',
  'uol.com.br',
  'wp.com',
  'webflow.com',
  'website-files.com',
  'cdn.prod.website-files.com',
  'metroimg.com',
  'imagens.ebc.com.br',
  'cdn.oantagonista.com',
  'img.band.uol.com.br',
];
export function imageUrl(value: string, base: string) {
  try {
    const u = new URL(
      value
        .replace(/&amp;/g, '&')
        .replace(/&#0*39;/g, "'")
        .replace(/&quot;/g, '"'),
      base,
    );
    return u.protocol === 'https:' &&
      !u.port &&
      !u.username &&
      !u.password &&
      imageHosts.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function articleImage(html: string, base: string) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)];
  for (const key of [
    'og:image:secure_url',
    'og:image',
    'og:image:url',
    'twitter:image',
    'twitter:image:src',
  ])
    for (const [tag] of tags) {
      const attrs = Object.fromEntries(
        [...tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map((m) => [
          m[1].toLowerCase(),
          m[3],
        ]),
      );
      if ((attrs.property || attrs.name)?.toLowerCase() === key) {
        const url = imageUrl(attrs.content || '', base);
        if (url) return url;
      }
    }
  return null;
}
