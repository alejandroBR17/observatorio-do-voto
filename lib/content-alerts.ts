import type { Database } from './database';
import { queuePush, eventId } from './push';
import { articlePreview } from './article-preview';
export async function queueContentAlerts(
  db: Database,
  current: any,
  previous: any,
  kind: 'polls' | 'coverage',
) {
  if (!previous) return; // Establish a baseline; never alert for the initial historical import.
  const items = kind === 'polls' ? current.publications : current.articles,
    old = kind === 'polls' ? previous.publications : previous.articles;
  const known = new Set([
    ...(old || []).map((p: any) => p.url),
    ...(kind === 'polls' ? previous.polls || [] : []).map((p: any) => p.source),
  ]);
  const fresh = (items || []).filter(
    (p: any) =>
      !known.has(p.url) &&
      p.publishedAt &&
      Date.parse(p.publishedAt) > Date.now() - 86400000 &&
      Date.parse(p.publishedAt) <= Date.now() + 300000,
  );
  if (!fresh.length) return;
  // Resolve one shared preview per batch, rather than one request per subscriber.
  // A missing or blocked preview never prevents queuing the text alert.
  const image = await articlePreview(fresh[0].url, db);
  await queuePush(db, {
    id: eventId(
      kind,
      fresh
        .map((p: any) => p.url)
        .sort()
        .join('|'),
    ),
    types: [kind],
    title:
      fresh.length === 1
        ? fresh[0].title
        : kind === 'polls'
          ? `${fresh.length} publicações sobre pesquisas`
          : `${fresh.length} notícias sobre a eleição`,
    body:
      fresh.length === 1
        ? `${fresh[0].source || 'Fonte pública'} · ${kind === 'polls' ? 'Publicação sobre pesquisas' : 'Noticiário eleitoral'}`
        : fresh[0].title,
    url: kind === 'polls' ? '/?tab=polls' : '/?tab=social',
    image: image || undefined,
    icon: image || undefined,
  });
}
