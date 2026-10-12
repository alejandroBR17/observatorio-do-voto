import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { createDatabase } from '../lib/database';
import { defaultAlerts } from '../lib/alerts';
import { dispatchAnnouncement, type Announcement } from '../lib/announcements';

test('announcement reaches existing opted-in devices once, excluding later installs and opt-outs', async () => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  const now = Date.now();
  const notice: Announcement = {
    id: 'announcement:test',
    types: [],
    title: 'Panorama',
    body: 'Notícias disponíveis',
    url: '/?tab=overview',
    registeredBefore: now - 1000,
    expiresAt: now + 60000,
  };
  try {
    for (const [endpoint, created, preferences] of [
      ['existing', now - 2000, defaultAlerts],
      ['later', now, defaultAlerts],
      [
        'disabled',
        now - 2000,
        Object.fromEntries(Object.keys(defaultAlerts).map((key) => [key, false])),
      ],
    ] as const) {
      await db
        .prepare('INSERT INTO subscriptions VALUES(?,?,?)')
        .bind(endpoint, JSON.stringify(preferences), now)
        .run();
      await db
        .prepare('INSERT INTO subscription_keys VALUES(?,?,?)')
        .bind(endpoint, JSON.stringify({ endpoint }), created)
        .run();
    }
    const sent: string[] = [];
    const send = async (_db: typeof db, sub: { endpoint: string }) => {
      sent.push(sub.endpoint);
      return { statusCode: 201, body: '', headers: {} };
    };
    const report = await dispatchAnnouncement(db, notice, send);
    await dispatchAnnouncement(db, notice, send);
    assert.deepEqual(sent, ['existing']);
    assert.deepEqual(report?.totals, [
      { status: 'sent', count: 1 },
      { status: 'skipped', count: 1 },
    ]);
    assert.equal(
      (await db.prepare('SELECT count(*) AS count FROM push_events').first<{ count: number }>())
        ?.count,
      0,
    );
    assert.equal(JSON.stringify(report).includes('existing'), false);
  } finally {
    client.close();
  }
});

test('expired subscriptions are removed; temporary provider failures retry at most three times', async (t) => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const notice: Announcement = {
    id: 'announcement:retry',
    types: [],
    title: 'Panorama',
    body: '',
    url: '/',
    registeredBefore: now,
    expiresAt: now + 3600000,
  };
  try {
    for (const endpoint of ['expired', 'temporary']) {
      await db.prepare('INSERT INTO subscriptions VALUES(?,?,?)').bind(endpoint, '{}', now).run();
      await db
        .prepare('INSERT INTO subscription_keys VALUES(?,?,?)')
        .bind(endpoint, JSON.stringify({ endpoint }), now)
        .run();
    }
    const counts: Record<string, number> = {};
    const send = async (_db: typeof db, sub: { endpoint: string }) => {
      counts[sub.endpoint] = (counts[sub.endpoint] || 0) + 1;
      throw Object.assign(new Error('private provider response'), {
        statusCode: sub.endpoint === 'expired' ? 410 : 503,
      });
    };
    const first = await dispatchAnnouncement(db, notice, send);
    assert.deepEqual(first?.failures, { '410': 1, '503': 1 });
    for (let i = 0; i < 4; i++) {
      now += 61000;
      await dispatchAnnouncement(db, notice, send);
    }
    assert.deepEqual(counts, { expired: 1, temporary: 3 });
    assert.equal(
      await db
        .prepare('SELECT endpoint FROM subscriptions WHERE endpoint=?')
        .bind('expired')
        .first(),
      null,
    );
    assert.equal(
      await db
        .prepare('SELECT endpoint FROM subscription_keys WHERE endpoint=?')
        .bind('expired')
        .first(),
      null,
    );
    assert.equal(JSON.stringify(first).includes('private'), false);
  } finally {
    client.close();
  }
});

test('announcements never run before their cutoff or after their expiry', async () => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  const now = Date.now();
  try {
    for (const [registeredBefore, expiresAt] of [
      [now + 60000, now + 120000],
      [now - 120000, now - 60000],
    ]) {
      const result = await dispatchAnnouncement(
        db,
        {
          id: 'announcement:window',
          types: [],
          title: '',
          body: '',
          url: '/',
          registeredBefore,
          expiresAt,
        },
        async () => {
          throw Error('must not send');
        },
      );
      assert.equal(result, undefined);
    }
  } finally {
    client.close();
  }
});
