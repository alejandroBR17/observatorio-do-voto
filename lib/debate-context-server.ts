import type { Database } from './database';
import type { MediaArticle } from './media-types';
import { debateCoverage } from './debate';
import { debateContextSource, parseDebateContext, type DebateContext } from './debate-context';

async function sourceHtml(url: string) {
  let current = debateContextSource(url);
  if (!current) throw Error('Unsupported source');
  for (let redirect = 0; redirect < 3; redirect++) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = debateContextSource(
        new URL(response.headers.get('location') || '', current).href,
      );
      if (!next || next.hostname !== current.hostname) throw Error('Unsupported redirect');
      current = next;
      continue;
    }
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html'))
      throw Error('Source unavailable');
    const reader = response.body?.getReader();
    if (!reader) throw Error('Empty source');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1500000) throw Error('Source too large');
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  throw Error('Too many redirects');
}
export async function debateContext(
  db: Database,
  articles: MediaArticle[],
  now = Date.now(),
): Promise<DebateContext> {
  const key = 'debate:context:globo-2026-10-23:v1';
  const stored = await db
    .prepare('SELECT value,updated FROM cache WHERE key=?')
    .bind(key)
    .first<{ value: string; updated: number }>();
  const previous = stored ? (JSON.parse(stored.value) as DebateContext) : null;
  if (stored && now - stored.updated < 120000) return previous!;
  const lease = await db
    .prepare(
      'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET updated=excluded.updated WHERE cache.updated<?',
    )
    .bind('lease:' + key, '', now, now - 25000)
    .run();
  if (!lease.meta.changes)
    return (
      previous || {
        status: 'unavailable',
        checkedAt: new Date(now).toISOString(),
        video: null,
        checks: [],
      }
    );
  const sources = debateCoverage(articles, now)
    .filter((a) => debateContextSource(a.url))
    .slice(0, 4);
  const fetched = await Promise.allSettled(
    sources.map(async (article) => parseDebateContext(await sourceHtml(article.url), article, now)),
  );
  const valid = fetched.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const checks = [
    ...new Map(
      [...(previous?.checks || []), ...valid.flatMap((r) => r.checks)].map((c) => [
        c.url + c.claim,
        c,
      ]),
    ).values(),
  ].slice(-24);
  const result: DebateContext = {
    status: sources.length && !valid.length ? (previous ? 'stale' : 'unavailable') : 'ready',
    checkedAt: new Date(now).toISOString(),
    video: valid.find((r) => r.video)?.video || previous?.video || null,
    checks,
  };
  await db
    .prepare(
      'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated',
    )
    .bind(key, JSON.stringify(result), now)
    .run();
  return result;
}
