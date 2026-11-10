import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWordPress } from '../lib/polls';

test('Quaest post-election reports are publications with a separate public-opinion label', () => {
  const source = {
    name: 'Quaest · pós-eleição',
    url: 'https://quaest.com.br/wp-json/wp/v2/relatorios?search=p%C3%B3s%20eleitoral&per_page=10',
    domain: 'quaest.com.br',
  };
  const posts = [
    {
      title: { rendered: 'Pesquisa pós eleitoral: o Brasil depois das urnas – 05/11/2026' },
      link: 'https://quaest.com.br/relatorios/pesquisa-pos-eleitoral-o-brasil-depois-das-urnas-05-11-2026/',
      date: '2026-11-08T11:03:19',
      date_gmt: '2026-11-08T11:03:19',
    },
    {
      title: { rendered: 'Pesquisa pós eleitoral: volume 03 – 05/11/2026' },
      link: 'https://quaest.com.br/relatorios/pesquisa-pos-eleitoral-volume-03/',
      date: '2026-11-09T10:02:23',
      date_gmt: '2026-11-09T10:02:23',
    },
  ];
  const results = parseWordPress(posts, source);
  assert.equal(results.length, 2);
  assert.ok(results.every((item) => item.institute === 'Quaest'));
  assert.ok(results.every((item) => item.category === 'Pós-eleição · opinião pública'));
  assert.ok(results.every((item) => item.kind === 'publication'));
  assert.equal(results[0].publishedAt, '2026-11-08T11:03:19.000Z');
});
import { polls } from '../lib/polls';
import type { Database } from '../lib/database';

test('poll discovery works without a database, deduplicates concurrent queries and survives a database failure', async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (input) => {
    requests++;
    const url = String(input);
    if (url.includes('atlasintel'))
      return new Response('<a href="/poll/brazil-national-2026-10-09">National</a>');
    if (url.includes('quaest')) return Response.json([]);
    return new Response('<rss/>');
  };
  try {
    const [first, concurrent] = await Promise.all([polls(), polls()]);
    assert.equal(requests, 11);
    assert.equal(first, concurrent);
    assert.equal(first.status, 'ready');
    assert.equal(first.cacheStorage, 'temporary');
    assert.equal(first.polls[0].registration, 'BR-02828/2026');
    assert.match(first.sources.find((s: any) => s.name === 'AtlasIntel').url, /exclusive-polls/);
    const cached = await polls();
    assert.equal(cached.cached, true);
    assert.equal(requests, 11);
    const broken = {
      prepare() {
        throw new Error('Database unavailable');
      },
    } as Database;
    const fallback = await polls(broken);
    assert.equal(fallback.cacheStorage, 'temporary');
    assert.equal(fallback.polls.length, 49);
    assert.equal(requests, 11);
    assert.ok(first.publications.some((p: { institute: string }) => p.institute === 'Ipespe'));
    assert.ok(first.publications.some((p: { institute: string }) => p.institute === 'DataTrends'));
  } finally {
    globalThis.fetch = original;
  }
});
