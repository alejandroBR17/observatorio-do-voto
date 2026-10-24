import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { createDatabase } from '../lib/database';
import { debate } from '../lib/debate';
import {
  debateContextSource,
  debateUpdateInterval,
  parseDebateContext,
} from '../lib/debate-context';
import { debateContext } from '../lib/debate-context-server';
import { contentSecurityPolicy } from '../lib/csp';
import type { MediaArticle } from '../lib/media-types';

const article: MediaArticle = {
  id: 1,
  title: 'Debate na Globo: Lula e Flávio',
  source: 'G1',
  url: 'https://g1.globo.com/politica/debate',
  publishedAt: '2026-10-23T22:00:00-03:00',
};
const now = Date.parse('2026-10-23T23:00:00-03:00');
const markup = (value: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
const video = {
  '@type': 'VideoObject',
  name: 'Íntegra do debate na Globo entre Lula e Flávio',
  uploadDate: article.publishedAt,
  embedUrl: 'https://player.globo.com/v/12345/',
  url: 'https://globoplay.globo.com/v/12345/',
};

test('only direct official video metadata for this encounter becomes a player', () => {
  const found = parseDebateContext(markup(video), article, now).video;
  assert.equal(found?.embedUrl, video.embedUrl);
  assert.equal(found?.watchUrl, video.url);
  for (const candidate of [
    { ...video, uploadDate: '2026-10-22T22:00:00-03:00' },
    { ...video, uploadDate: '2026-10-24T22:00:00-03:00' },
    { ...video, name: 'Debate entre governadores' },
    { ...video, name: 'Lula responde a Flávio no debate da Globo' },
    { ...video, embedUrl: 'https://player.globo.com.evil.example/v/123/', url: '' },
    { ...video, embedUrl: 'https://player.globo.com/other/', url: '' },
  ])
    assert.equal(parseDebateContext(markup(candidate), article, now).video, null);
  assert.equal(
    parseDebateContext(
      markup({ ...video, embedUrl: 'https://player.globo.com/other/' }),
      article,
      now,
    ).video?.embedUrl,
    null,
  );
  assert.equal(
    parseDebateContext(markup(video), { ...article, url: 'https://evil.example/debate' }, now)
      .video,
    null,
  );
  assert.equal(debateContextSource('https://noticias.uol.com.br/eleicoes/'), null);
  assert.equal(debateContextSource('https://g1.globo.com:444/debate'), null);
  assert.equal(debateContextSource('https://user@g1.globo.com/debate'), null);
});

test('verdicts require publisher ClaimReview metadata after the encounter starts', () => {
  const review = {
    '@type': 'ClaimReview',
    claimReviewed: 'Uma afirmação do candidato',
    reviewRating: { alternateName: 'Falso' },
  };
  const result = parseDebateContext(markup({ '@graph': [review] }), article, now);
  assert.equal(result.checks[0].verdict, 'Falso');
  assert.equal(result.checks[0].source, 'Fato ou Fake · g1');
  assert.equal(result.checks[0].url, article.url);
  assert.equal(
    parseDebateContext(
      markup(review),
      { ...article, publishedAt: '2026-10-23T10:00:00-03:00' },
      now,
    ).checks.length,
    0,
  );
  assert.equal(
    parseDebateContext('<h1>É falso: debate da Globo</h1>', article, now).checks.length,
    0,
  );
  assert.equal(
    parseDebateContext('<script type="application/ld+json">invalid</script>', article, now).checks
      .length,
    0,
  );
});

test('the scheduled g1 event accepts its official AMP player prepared the previous day, never arrival clips or foreign players', () => {
  const event = { ...article, url: debate.coverageUrl };
  const amp = {
    ...video,
    name: 'LOGO MAIS: Globo realiza debate entre Flávio Bolsonaro (PL) e Lula (PT)',
    uploadDate: '2026-10-22T21:38:18.486Z',
    embedUrl:
      'https://s3.glbimg.com/v1/AUTH_e1b09a2d222b4900a437a46914be81e5/static/amp/index.html?videosids=8427307&domain=g1.globo.com&adunit=tvg_G1',
    url: '',
  };
  assert.equal(parseDebateContext(markup(amp), event, now).video?.embedUrl, amp.embedUrl);
  assert.equal(parseDebateContext(markup(amp), event, now).video?.watchUrl, debate.coverageUrl);
  assert.equal(
    parseDebateContext(
      markup({ ...amp, name: amp.name.replace('LOGO MAIS:', 'AO VIVO:') }),
      event,
      now,
    ).video?.embedUrl,
    amp.embedUrl,
  );
  assert.equal(parseDebateContext(markup(amp), article, now).video, null);
  for (const candidate of [
    { ...amp, name: 'Lula chega para debate na Globo' },
    { ...amp, uploadDate: '2026-10-21T21:00:00Z' },
    { ...amp, embedUrl: amp.embedUrl.replace('s3.glbimg.com/', 's3.glbimg.com.evil.example/') },
    { ...amp, embedUrl: amp.embedUrl.replace('static/amp/index.html', 'other.html') },
    { ...amp, embedUrl: amp.embedUrl.replace('domain=g1.globo.com', 'domain=evil.example') },
  ])
    assert.equal(parseDebateContext(markup(candidate), event, now).video, null);
});

test('shared collection caches official metadata and preserves it during an outage without following foreign redirects', async (t) => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return new Response(markup(video), { headers: { 'content-type': 'text/html' } });
  });
  try {
    const first = await debateContext(db, [article], now);
    assert.equal(first.status, 'ready');
    assert.ok(first.video);
    assert.deepEqual(await debateContext(db, [article], now + 1000), first);
    assert.equal(requests, 1);
    t.mock.method(globalThis, 'fetch', async () => {
      requests++;
      return new Response(null, {
        status: 302,
        headers: { location: 'https://evil.example/steal' },
      });
    });
    const stale = await debateContext(db, [article], now + 121000);
    assert.equal(stale.status, 'stale');
    assert.deepEqual(stale.video, first.video);
    assert.equal(requests, 2, 'foreign redirect must not be requested');
    assert.equal((await db.prepare('SELECT id FROM push_events').all()).results.length, 0);
  } finally {
    client.close();
  }
});

test('collection cadence and iframe policy remain bounded', () => {
  const start = Date.parse(debate.startsAt);
  assert.equal(debateUpdateInterval(start - 1800001), 300000);
  assert.equal(debateUpdateInterval(start - 1800000), 60000);
  assert.equal(debateUpdateInterval(Date.parse(debate.recapFrom)), 300000);
  const csp = contentSecurityPolicy('test', 'https://observatorio-voto.vercel.app');
  assert.match(csp, /frame-src https:\/\/player\.globo\.com https:\/\/s3\.glbimg\.com(?:;|$)/);
  assert.ok(csp.includes("frame-ancestors 'none'"));
});
