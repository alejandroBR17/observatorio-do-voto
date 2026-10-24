import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { createDatabase } from '../lib/database';
import {
  initialDebateEditorial as bundledEditorial,
  parseDebateEditorial,
  editorialPhase,
  type DebateEditorial,
} from '../lib/debate-editorial';
import { syncDebateEditorial } from '../lib/debate-editorial-server';
import { alertPreferences } from '../lib/alerts';
import { queueDebateReminder } from '../lib/debate-reminder';

const start = Math.max(
  Date.parse('2026-10-23T21:08:00-03:00'),
  Date.parse(bundledEditorial.updatedAt) + 1000,
);
// A fixed baseline lets queue/clock tests survive later real editorial releases.
const initialDebateEditorial: DebateEditorial = {
  ...structuredClone(bundledEditorial),
  revision: bundledEditorial.revision,
  state: 'planned',
  confirmedAt: null,
  updatedAt: '2026-10-23T13:35:00.000Z',
  updates: [],
};
const live = (): DebateEditorial => ({
  ...structuredClone(initialDebateEditorial),
  revision: initialDebateEditorial.revision + 1,
  state: 'live',
  confirmedAt: new Date(start).toISOString(),
  updatedAt: new Date(start).toISOString(),
  updates: [
    {
      id: 'inicio',
      kind: 'start',
      title: 'O debate começou',
      body: 'O acompanhamento do Observatório confirmou o início da transmissão.',
      publishedAt: new Date(start).toISOString(),
      notify: true,
    },
  ],
});

test('editorial confirmation differs from scheduled time and rejects malformed/future content', () => {
  assert.equal(editorialPhase(initialDebateEditorial, start), editorialPhase(null, start));
  assert.equal(editorialPhase(live(), start), 'scheduled');
  assert.equal(editorialPhase({ ...live(), state: 'ended' }, start), 'after');
  assert.equal(parseDebateEditorial(live(), start)?.state, 'live');
  for (const candidate of [
    { ...live(), revision: 0 },
    { ...live(), confirmedAt: new Date(start + 1000).toISOString() },
    {
      ...live(),
      updates: [{ ...live().updates[0], publishedAt: new Date(start + 1000).toISOString() }],
    },
    { ...live(), proposals: {} },
    { ...live(), updates: [live().updates[0], live().updates[0]] },
  ])
    assert.equal(parseDebateEditorial(candidate, start), null);
  assert.equal(
    alertPreferences({ debate: true }).debateLive,
    false,
    'reminder permission never enables additional messages',
  );
});

test('trusted revisions persist centrally, reject older releases and queue a confirmed start once', async (t) => {
  const client = createClient({ url: 'file::memory:' }),
    db = createDatabase(client);
  t.mock.method(Date, 'now', () => start);
  try {
    await syncDebateEditorial(db, initialDebateEditorial, start);
    assert.equal((await db.prepare('SELECT id FROM push_events').all()).results.length, 0);
    const updated = await syncDebateEditorial(db, live(), start);
    assert.equal(updated.state, 'live');
    assert.equal(
      (await syncDebateEditorial(db, initialDebateEditorial, start)).revision,
      live().revision,
    );
    await syncDebateEditorial(db, { ...live(), revision: live().revision + 1 }, start);
    const events = await db.prepare('SELECT value FROM push_events').all<{ value: string }>();
    assert.equal(events.results.length, 1);
    assert.deepEqual(JSON.parse(events.results[0].value).types, ['debateLive']);
    await queueDebateReminder(db, start);
    assert.equal(
      (await db.prepare('SELECT id FROM push_events').all()).results.length,
      1,
      'confirmed start prevents a misleading reminder',
    );
    assert.equal((await db.prepare('SELECT endpoint FROM subscriptions').all()).results.length, 0);
  } finally {
    client.close();
  }
});

test('expired notices and silent corrections never queue a late notification', async () => {
  const client = createClient({ url: 'file::memory:' }),
    db = createDatabase(client);
  try {
    await syncDebateEditorial(db, live(), start + 600001);
    assert.equal((await db.prepare('SELECT id FROM push_events').all()).results.length, 0);
    const silent = {
      ...live(),
      revision: live().revision + 1,
      updates: [{ ...live().updates[0], notify: false }],
    };
    await syncDebateEditorial(db, silent, start + 600001);
    assert.equal((await db.prepare('SELECT id FROM push_events').all()).results.length, 0);
    assert.equal(
      (await syncDebateEditorial(db, initialDebateEditorial, start + 600001)).revision,
      silent.revision,
    );
  } finally {
    client.close();
  }
});
