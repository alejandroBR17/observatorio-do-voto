import type { Database } from './database';
import { queueContentAlerts } from './content-alerts';
import { plainText } from './polls';
import { imageUrl } from './article-image';
import { newsPublishers, newsPublisher, newsKey } from './news-sources';
const BASE = 'https://eleicoes2026.sapienslabs.com.br/api/v1';
export const newsSources = newsPublishers
  .filter((p) => p.feed)
  .map((p) => ({ name: p.name, domain: p.domain, url: p.feed! }));
export function parseNewsRss(xml: string, source: (typeof newsSources)[number], now = Date.now()) {
  const items = [];
  for (const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const part = m[1],
      get = (tag: string) =>
        plainText(
          part.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] || '',
        );
    const title = get('title'),
      url = get('link'),
      published = Date.parse(get('pubDate'));
    if (
      !title ||
      !Number.isFinite(published) ||
      published > now + 300000 ||
      published < now - 7 * 86400000 ||
      !/\blula\b|fl[aá]vio(?: bolsonaro)?|presid[eê]ncia|presidencial/i.test(
        title + ' ' + get('description').slice(0, 500),
      )
    )
      continue;
    try {
      const u = new URL(url);
      if (
        u.protocol !== 'https:' ||
        !(u.hostname === source.domain || u.hostname.endsWith('.' + source.domain))
      )
        continue;
    } catch {
      continue;
    }
    items.push({
      id: url,
      title: title.slice(0, 240),
      url,
      source: source.name,
      publishedAt: new Date(published).toISOString(),
      image: rssImage(part, url),
    });
  }
  return items.slice(0, 24);
}
function rssImage(part: string, base: string) {
  const candidates = [
    ...[
      ...part.matchAll(
        /<(?:media:content|media:thumbnail|enclosure)\b[^>]*\burl=["']([^"']+)["'][^>]*>/gi,
      ),
    ].map((m) => m[1]),
    ...[...part.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]),
  ];
  return candidates.map((value) => imageUrl(value, base)).find(Boolean) || undefined;
}
export function normalizeMedia(stats: any, candidates: any, articles: any) {
  if (
    !['total_articles_imprensa', 'total_sources_imprensa', 'articles_today_imprensa'].every(
      (k) => Number.isSafeInteger(stats?.data?.[k]) && stats.data[k] >= 0,
    ) ||
    !Array.isArray(candidates?.data) ||
    !Array.isArray(articles?.data)
  )
    throw new Error('Formato da fonte incompatível.');
  return {
    stats: {
      articles: stats.data.total_articles_imprensa,
      sources: stats.data.total_sources_imprensa,
      today: stats.data.articles_today_imprensa,
      updated: stats.data.last_fetch_at,
      cutoff: stats.data.cutoff_date,
    },
    candidates: candidates.data
      .filter(
        (c: any) =>
          ['lula-silva', 'flavio-bolsonaro'].includes(c.slug) &&
          Number.isSafeInteger(c.kpis?.articles) &&
          c.kpis.articles >= 0,
      )
      .map((c: any) => ({ slug: c.slug, name: c.name, articles: c.kpis.articles })),
    articles: articles.data
      .filter((a: any) => newsPublisher(a.url) && typeof a.title === 'string')
      .map((a: any) => ({
        id: a.id,
        title: a.title.slice(0, 240),
        url: a.url,
        source: newsPublisher(a.url)!.name,
        publishedAt: a.published_at,
      })),
  };
}
export async function media(db: Database) {
  const key = 'media:v3',
    stored = await db
      .prepare('SELECT value,updated FROM cache WHERE key=?')
      .bind(key)
      .first<{ value: string; updated: number }>(),
    old =
      stored ||
      (await db
        .prepare('SELECT value,updated FROM cache WHERE key=?')
        .bind('media:v2')
        .first<{ value: string; updated: number }>());
  if (stored && Date.now() - stored.updated < 300000) return JSON.parse(stored.value);
  const lease = await db
    .prepare(
      'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET updated=excluded.updated WHERE cache.updated<?',
    )
    .bind('lease:media:v3', '', Date.now(), Date.now() - 25000)
    .run();
  if (!lease.meta.changes)
    return old
      ? JSON.parse(old.value)
      : { status: 'loading', message: 'Consultando a cobertura de imprensa.' };
  const checkedAt = new Date().toISOString();
  const [primary, feeds] = await Promise.all([
    Promise.all(
      ['stats', 'candidates', 'articles?page_size=60'].map(async (p) => {
        const r = await fetch(`${BASE}/${p}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) throw Error();
        return r.json();
      }),
    )
      .then((data) => normalizeMedia(...(data as [any, any, any])))
      .catch(() => null),
    Promise.all(
      newsSources.map(async (source) => {
        try {
          const r = await fetch(source.url, {
            cache: 'no-store',
            signal: AbortSignal.timeout(10000),
          });
          if (!r.ok) throw Error();
          const bytes = new Uint8Array(await r.arrayBuffer());
          if (bytes.length > 2000000) throw Error();
          const header = new TextDecoder().decode(bytes.slice(0, 300)),
            encoding = /iso-8859-1/i.test((r.headers.get('content-type') || '') + header)
              ? 'iso-8859-1'
              : 'utf-8';
          const items = parseNewsRss(new TextDecoder(encoding).decode(bytes), source);
          return { ...source, status: 'ok', items, checkedAt };
        } catch {
          return { ...source, status: 'unavailable', items: [], checkedAt };
        }
      }),
    ),
  ]);
  let payload: any;
  if (primary || feeds.some((f) => f.status === 'ok')) {
    const previous = old ? JSON.parse(old.value) : null,
      base =
        primary ||
        (previous?.stats
          ? { stats: previous.stats, candidates: previous.candidates, articles: [] }
          : {});
    const sourceCounts = new Map<string, number>();
    const articles = [
      ...new Map(
        [...(primary?.articles || previous?.articles || []), ...feeds.flatMap((f) => f.items)]
          .filter(
            (a) =>
              newsPublisher(a.url) &&
              Date.parse(a.publishedAt) >= Date.now() - 7 * 86400000 &&
              Date.parse(a.publishedAt) <= Date.now() + 300000,
          )
          .map((a) => ({ ...a, source: newsPublisher(a.url)!.name }))
          .map((a) => [newsKey(a.url), a]),
      ).values(),
    ]
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .filter((a) => {
        const count = sourceCounts.get(a.source) || 0;
        sourceCounts.set(a.source, count + 1);
        return count < 12;
      })
      .slice(0, 80);
    payload = {
      status: 'live',
      ...base,
      articles,
      checkedAt,
      feedSources: feeds.map(({ items, ...source }) => ({ ...source, count: items.length })),
      source: BASE,
      attribution: 'SapiensLabs — Eleições 2026 — CC BY 4.0',
      message: primary
        ? undefined
        : 'O agregador está temporariamente indisponível. Consultamos os feeds dos veículos e preservamos os links recentes da última coleta.',
    };
  } else
    payload = old
      ? {
          ...JSON.parse(old.value),
          articles: (JSON.parse(old.value).articles || [])
            .filter((a: any) => newsPublisher(a.url))
            .map((a: any) => ({ ...a, source: newsPublisher(a.url)!.name })),
          status: 'stale',
          message: 'As fontes não responderam. Exibindo a última coleta recebida.',
        }
      : {
          status: 'unavailable',
          message: 'As fontes de cobertura estão temporariamente indisponíveis.',
          checkedAt,
        };
  await db
    .prepare(
      'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated',
    )
    .bind(key, JSON.stringify(payload), Date.now())
    .run();
  // The new feed baseline must not send old RSS headlines as new notifications during migration.
  if (payload.status === 'live')
    await queueContentAlerts(db, payload, stored ? JSON.parse(stored.value) : null, 'coverage');
  return payload;
}
