import type { Metadata } from 'next';

export function publicSiteOrigin(environment: Record<string, string | undefined> = process.env) {
  const configured =
    environment.SITE_URL ||
    (environment.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${environment.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://observatorio-voto.vercel.app');
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('SITE_URL deve ser um endereço público HTTP ou HTTPS, sem credenciais.');
  return url.origin;
}

export const siteOrigin = publicSiteOrigin();
export const siteName = 'Observatório do Voto';
export const siteTitle = 'Observatório do Voto | Eleições 2026 e resultados';
export const siteDescription =
  'Acompanhe eleições presidenciais, pesquisas com fontes e metodologia, notícias e resultados históricos por estado, município e seção eleitoral.';
export const siteIndexable =
  process.env.VERCEL_ENV !== 'preview' && process.env.NODE_ENV === 'production';

export function sharingMetadata(title: string, description: string, path = '/'): Metadata {
  const url = new URL(path, siteOrigin).href;
  const image = {
    url: new URL('/og-image.png', siteOrigin).href,
    width: 1200,
    height: 630,
    alt: 'Observatório do Voto — Olhe além do placar. O território, a história e o contexto da eleição.',
    type: 'image/png',
  };
  return {
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName,
      title,
      description,
      url,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteOrigin}/#website`,
  name: siteName,
  url: `${siteOrigin}/`,
  description: siteDescription,
  inLanguage: 'pt-BR',
};
