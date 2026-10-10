import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { createDatabase } from '../lib/database';
import { monitorAuthorized, runMonitor } from '../lib/monitor';

test('monitor authentication rejects missing, incorrect and multi-byte credentials', () => {
  assert.equal(monitorAuthorized('Bearer test-secret', 'test-secret'), true);
  for (const actual of [null, '', 'Bearer wrong', 'Bearer ééééé', 'test-secret'])
    assert.equal(monitorAuthorized(actual, 'test-secret'), false);
  assert.equal(monitorAuthorized('Bearer ', ''), false);
});

test('monitor consults every collection, dispatches after collection and records actual intervals', async (t) => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  let now = Date.parse('2026-10-10T20:00:00Z');
  t.mock.method(Date, 'now', () => now);
  const calls: string[] = [];
  const dependencies = {
    live: async () => {
      calls.push('live');
      return { status: 'waiting', checkedAt: new Date(now).toISOString() };
    },
    polls: async () => {
      calls.push('polls');
      return { status: 'ready', checkedAt: new Date(now).toISOString() };
    },
    media: async () => {
      calls.push('media');
      return { status: 'live', checkedAt: new Date(now).toISOString() };
    },
    dispatchPush: async () => {
      assert.equal(calls.length % 4, 3);
      calls.push('push');
    },
  };
  try {
    assert.equal((await runMonitor(db, dependencies)).gapSeconds, null);
    now += 3600000;
    const report = await runMonitor(db, dependencies);
    assert.equal(report.status, 'ready');
    assert.equal(report.gapSeconds, 3600);
    assert.equal(report.previousStartedAt, '2026-10-10T20:00:00.000Z');
    assert.deepEqual(calls, ['live', 'polls', 'media', 'push', 'live', 'polls', 'media', 'push']);
    const persisted = await db
      .prepare('SELECT value FROM cache WHERE key=?')
      .bind('monitor:last')
      .first<{ value: string }>();
    assert.deepEqual(JSON.parse(persisted!.value), report);
  } finally {
    client.close();
  }
});

test('failed collections do not block other sources or push; stale/loading/temporary data are not healthy', async () => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  const checkedAt = new Date().toISOString();
  let deliveries = 0;
  const dependencies = {
    live: async () => {
      throw Error('private upstream details must not be exposed');
    },
    polls: async () => ({ status: 'ready', checkedAt, cacheStorage: 'temporary' }),
    media: async () => ({ status: 'live', checkedAt, stale: true }),
    dispatchPush: async () => {
      deliveries++;
    },
  };
  try {
    const report = await runMonitor(db, dependencies);
    assert.equal(report.status, 'degraded');
    assert.equal(deliveries, 1);
    assert.ok(report.sources.every((source) => !source.ok));
    assert.ok(!JSON.stringify(report).includes('private upstream'));
    const unavailable = await runMonitor(db, {
      ...dependencies,
      live: async () => ({ status: 'loading', checkedAt }),
      dispatchPush: async () => {
        throw Error('private delivery details');
      },
    });
    assert.equal(unavailable.push, 'unavailable');
    assert.equal(unavailable.status, 'degraded');
    const outdated = await runMonitor(db, {
      ...dependencies,
      live: async () => ({ status: 'waiting', checkedAt: 'invalid' }),
      polls: async () => ({
        status: 'ready',
        checkedAt: new Date(Date.now() - 3600000).toISOString(),
      }),
      media: async () => ({
        status: 'live',
        checkedAt: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    assert.ok(outdated.sources.every((source) => !source.ok));
  } finally {
    client.close();
  }
});
