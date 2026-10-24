import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { createDatabase } from '../lib/database';
import { debate, debatePhase, debateCoverage, debateChecks, debatePollPeriod } from '../lib/debate';
import { queueDebateReminder } from '../lib/debate-reminder';
import { dispatchPush } from '../lib/push';
import { alertPreferences, priorityAlert } from '../lib/alerts';
import type { MediaArticle } from '../lib/media-types';

test('debate uses Brasília schedule and never declares a broadcast live or finished', () => {
  assert.equal(new Date(debate.startsAt).toISOString(), '2026-10-24T00:20:00.000Z');
  assert.equal(debatePhase(Date.parse(debate.startsAt) - 1), 'before');
  assert.equal(debatePhase(Date.parse(debate.startsAt)), 'scheduled');
  assert.equal(debatePhase(Date.parse(debate.recapFrom)), 'after');
  assert.equal(debate.watchUrl, null, 'never label a generic news page as the debate video');
  assert.equal(new URL(debate.coverageUrl).hostname, 'g1.globo.com');
  assert.equal(new URL(debate.liveTvUrl).hostname, 'globoplay.globo.com');
  assert.match(new URL(debate.liveTvUrl).pathname, /^\/tv-globo\/ao-vivo\/\d+\/$/);
  assert.match(
    new URL(debate.coverageUrl).pathname,
    /\/2026\/ao-vivo\/debate-globo-segundo-turno\.ghtml$/,
  );
  assert.equal(alertPreferences({}).debate, false);
  assert.equal(
    priorityAlert(['debate'], alertPreferences({ debate: true, frequency: 'daily' })),
    true,
  );
});
test('coverage excludes other broadcasters, state debates, unsafe URLs, future items and duplicates; never infers verdicts', () => {
  const article: MediaArticle = {
    id: 1,
    title: 'Debate na Globo: Lula e Flávio discutem saúde',
    source: 'G1',
    url: 'https://g1.globo.com/politica/debate',
    publishedAt: '2026-10-23T22:00:00-03:00',
  };
  const now = Date.parse('2026-10-24T06:00:00-03:00');
  const check = {
    ...article,
    id: 2,
    title: 'Fato ou Fake: checagem do debate entre Lula e Flávio na Globo',
    url: 'https://g1.globo.com/fato-ou-fake/debate',
  };
  const items = [
    article,
    { ...article, url: article.url + '/' },
    check,
    { ...article, id: 3, title: 'Debate dos governadores na Globo' },
    { ...article, id: 4, title: 'Debate na Band: Lula e Flávio' },
    { ...article, id: 5, url: 'https://g1.globo.com.evil.example/debate' },
    {
      ...article,
      id: 6,
      url: 'https://g1.globo.com/futuro',
      publishedAt: '2026-10-25T01:00:00-03:00',
    },
    {
      ...check,
      id: 7,
      url: 'https://g1.globo.com/antigo',
      publishedAt: '2026-10-01T22:00:00-03:00',
    },
  ];
  assert.equal(debateCoverage(items, now).length, 2);
  assert.deepEqual(
    debateChecks(items, now).map((a) => a.url),
    [check.url],
  );
  assert.deepEqual(debateChecks([{ ...check, publishedAt: '2026-10-23T12:00:00-03:00' }], now), []);
});
test('poll timing comes from fieldwork, with the entire debate day treated as mixed', () => {
  for (const [fieldwork, expected] of [
    ['20 a 22/10/2026 · presencial', 'before'],
    ['22 a 24/10/2026', 'mixed'],
    ['23 a 23/10/2026', 'mixed'],
    ['24 a 24/10/2026', 'after'],
    ['28 a 20/10/2026', 'unknown'],
    ['20 a 22/09/2026', 'unknown'],
    ['Não informado', 'unknown'],
  ] as const)
    assert.equal(debatePollPeriod({ fieldwork }), expected);
});
test('one scheduled opt-in reminder survives repeat cron runs, includes later opt-ins and expires without a late send', async (t) => {
  const client = createClient({ url: 'file::memory:' }),
    db = createDatabase(client);
  let now = Date.parse(debate.reminderAt) - 1000;
  t.mock.method(Date, 'now', () => now);
  try {
    await queueDebateReminder(db);
    assert.equal((await db.prepare('SELECT id FROM push_events').all()).results.length, 0);
    now += 1000;
    await queueDebateReminder(db);
    now += 60000;
    await queueDebateReminder(db);
    assert.equal((await db.prepare('SELECT id FROM push_events').all()).results.length, 1);
    for (const [name, preferences] of [
      ['selected', { debate: true, frequency: 'daily' }],
      ['not-selected', {}],
    ] as const) {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/' + name;
      await db
        .prepare('INSERT INTO subscriptions(endpoint,preferences,updated) VALUES(?,?,?)')
        .bind(endpoint, JSON.stringify(preferences), now)
        .run();
      await db
        .prepare('INSERT INTO subscription_keys(endpoint,value,created) VALUES(?,?,?)')
        .bind(endpoint, JSON.stringify({ endpoint }), now)
        .run();
    }
    const received: string[] = [];
    await dispatchPush(db, async (_, subscription, event) => {
      received.push(subscription.endpoint);
      assert.equal(event.url, '/debate');
      return {} as never;
    });
    assert.deepEqual(received, ['https://fcm.googleapis.com/fcm/send/selected']);
    assert.equal(
      await db
        .prepare('SELECT status FROM push_deliveries WHERE endpoint=?')
        .bind('https://fcm.googleapis.com/fcm/send/not-selected')
        .first(),
      null,
    );
    await db
      .prepare('UPDATE subscriptions SET preferences=? WHERE endpoint=?')
      .bind(JSON.stringify({ debate: true }), 'https://fcm.googleapis.com/fcm/send/not-selected')
      .run();
    now += 60000;
    await dispatchPush(db, async (_, subscription) => {
      received.push(subscription.endpoint);
      return {} as never;
    });
    assert.deepEqual(received, [
      'https://fcm.googleapis.com/fcm/send/selected',
      'https://fcm.googleapis.com/fcm/send/not-selected',
    ]);
    await dispatchPush(db, async () => {
      throw Error('Duplicate send');
    });
    now = Date.parse(debate.reminderExpiresAt);
    const endpoint = 'https://fcm.googleapis.com/fcm/send/late';
    await db
      .prepare('INSERT INTO subscriptions(endpoint,preferences,updated) VALUES(?,?,?)')
      .bind(endpoint, JSON.stringify({ debate: true }), now)
      .run();
    await db
      .prepare('INSERT INTO subscription_keys(endpoint,value,created) VALUES(?,?,?)')
      .bind(endpoint, JSON.stringify({ endpoint }), Date.parse(debate.reminderAt))
      .run();
    await queueDebateReminder(db);
    await dispatchPush(db, async () => {
      throw Error('Expired reminder must not send');
    });
    assert.equal(
      (
        await db
          .prepare('SELECT status FROM push_deliveries WHERE endpoint=?')
          .bind(endpoint)
          .first<{ status: string }>()
      )?.status,
      'skipped',
    );
  } finally {
    client.close();
  }
});
