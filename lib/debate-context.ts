import { debate, debateCoverage, debatePublicationTime } from './debate';
import type { MediaArticle } from './media-types';

export type DebateVideo = {
  watchUrl: string;
  embedUrl: string | null;
  title: string;
  sourceUrl: string;
};
export type DebateCheck = {
  claim: string;
  verdict: string;
  source: string;
  url: string;
  publishedAt: string;
};
export type DebateContext = {
  status: 'ready' | 'stale' | 'unavailable';
  checkedAt: string;
  video: DebateVideo | null;
  checks: DebateCheck[];
};
const clean = (value: unknown, max = 400) =>
  typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max)
    : '';
function safeUrl(value: unknown, hosts: string[]) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'https:' &&
      !u.port &&
      !u.username &&
      !u.password &&
      hosts.includes(u.hostname)
      ? u
      : null;
  } catch {
    return null;
  }
}
export function debateContextSource(value: string) {
  const u = safeUrl(value, ['g1.globo.com', 'noticias.uol.com.br']);
  return u && (u.hostname === 'g1.globo.com' || u.pathname.startsWith('/confere/')) ? u : null;
}
/** Only structured publisher claims are accepted, never truth labels guessed from headlines. */
export function parseDebateContext(html: string, article: MediaArticle, now = Date.now()) {
  const source = debateContextSource(article.url);
  const result: { video: DebateVideo | null; checks: DebateCheck[] } = { video: null, checks: [] };
  if (!source || !debateCoverage([article], now).length) return result;
  const visit = (item: unknown, depth = 0) => {
    if (!item || typeof item !== 'object' || depth > 8) return;
    if (Array.isArray(item)) {
      item.slice(0, 100).forEach((i) => visit(i, depth + 1));
      return;
    }
    const node = item as Record<string, any>;
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (types.includes('VideoObject') && source.hostname === 'g1.globo.com') {
      const title = clean(node.name);
      const date = Date.parse(node.uploadDate || '');
      const embedCandidate = safeUrl(node.embedUrl, ['player.globo.com']);
      const watchCandidate = safeUrl(node.url, ['globoplay.globo.com']);
      const embed =
        embedCandidate && /^\/v\/\d+\/?$/.test(embedCandidate.pathname) ? embedCandidate : null;
      const watch =
        watchCandidate && /^\/v\/\d+\/?$/.test(watchCandidate.pathname) ? watchCandidate : null;
      if (
        /debate/i.test(title) &&
        /[ií]ntegra|completo|ao vivo|assista/i.test(title) &&
        /lula/i.test(title) &&
        /fl[aá]vio/i.test(title) &&
        Number.isFinite(date) &&
        date >= Date.parse('2026-10-23T00:00:00-03:00') &&
        date <= now &&
        (embed || watch)
      ) {
        result.video = {
          title,
          watchUrl: watch?.href || embed!.href,
          embedUrl: embed?.href || null,
          sourceUrl: source.href,
        };
      }
    }
    if (
      types.includes('ClaimReview') &&
      debatePublicationTime(article.publishedAt) >= Date.parse(debate.startsAt)
    ) {
      const claim = clean(node.claimReviewed);
      const verdict = clean(node.reviewRating?.alternateName, 100);
      if (claim && verdict)
        result.checks.push({
          claim,
          verdict,
          source: source.hostname === 'g1.globo.com' ? 'Fato ou Fake · g1' : 'UOL Confere',
          url: source.href,
          publishedAt: article.publishedAt,
        });
    }
    for (const key of ['@graph', 'video', 'review', 'mainEntity', 'hasPart', 'itemReviewed'])
      visit(node[key], depth + 1);
  };
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      visit(JSON.parse(match[1]));
    } catch {
      /* Invalid metadata cannot become evidence. */
    }
  }
  return result;
}

export function debateUpdateInterval(now = Date.now()) {
  return now >= Date.parse(debate.startsAt) - 30 * 60000 && now < Date.parse(debate.recapFrom)
    ? 60000
    : 300000;
}
