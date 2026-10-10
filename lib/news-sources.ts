/** Curated Brazilian publishers. Match URLs, never an aggregator's unverified label. */
export const newsPublishers = [
  { name: 'G1', domain: 'g1.globo.com', feed: 'https://g1.globo.com/rss/g1/politica/' },
  {
    name: 'Folha de S.Paulo',
    domain: 'folha.uol.com.br',
    feed: 'https://feeds.folha.uol.com.br/poder/rss091.xml',
  },
  { name: 'RedeTV!', domain: 'redetv.uol.com.br' },
  { name: 'UOL Notícias', domain: 'noticias.uol.com.br' },
  { name: 'CNN Brasil', domain: 'cnnbrasil.com.br', feed: 'https://www.cnnbrasil.com.br/feed/' },
  { name: 'Metrópoles', domain: 'metropoles.com', feed: 'https://www.metropoles.com/feed' },
  { name: 'Gazeta do Povo', domain: 'gazetadopovo.com.br' },
  { name: 'Diário do Centro do Mundo', domain: 'diariodocentrodomundo.com.br' },
  { name: 'CartaCapital', domain: 'cartacapital.com.br' },
  {
    name: 'Brasil de Fato',
    domain: 'brasildefato.com.br',
    feed: 'https://www.brasildefato.com.br/feed/',
  },
  { name: 'Band', domain: 'band.com.br' },
  {
    name: 'Agência Brasil',
    domain: 'agenciabrasil.ebc.com.br',
    feed: 'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml',
  },
  { name: 'Poder360', domain: 'poder360.com.br' },
  { name: 'O Antagonista', domain: 'oantagonista.com.br' },
];
export const matchesHost = (hostname: string, domain: string) =>
  hostname === domain || hostname.endsWith('.' + domain);
export function newsPublisher(value: string) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.port || u.username || u.password) return null;
    return newsPublishers.find((p) => matchesHost(u.hostname, p.domain)) || null;
  } catch {
    return null;
  }
}
export function newsKey(value: string) {
  const u = new URL(value);
  return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '');
}
