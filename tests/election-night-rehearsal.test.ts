import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { createDatabase } from '../lib/database';
import { live } from '../lib/live';
import { dispatchPush } from '../lib/push';
import { SECOND_TURN_START } from '../lib/election-night';

// Rehearsal uses an isolated in-memory database and mocked TSE responses.
// No subscriptions, production credentials, route or public test mode are involved.
test('a burst of simultaneous visitors shares one upstream consultation', async (t) => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  t.mock.method(Date, 'now', () => SECOND_TURN_START - 60000);
  let reads = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    reads++;
    return Response.json({ pl: [] });
  });
  try {
    const results = await Promise.all(Array.from({ length: 50 }, () => live(db)));
    assert.equal(reads, 1);
    assert.ok(results.every((result) => ['waiting', 'loading'].includes(result.status)));
    assert.equal((await live(db)).status, 'waiting');
    assert.equal(reads, 1);
  } finally {
    client.close();
  }
});

test('second-turn rehearsal preserves a good result through outages and avoids repeating a decisive alert on recovery', async (t) => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  let clock = SECOND_TURN_START + 60000;
  t.mock.method(Date, 'now', () => clock);
  const raw = JSON.parse(readFileSync('public/data/2026-br.json', 'utf8'));
  raw.t = '2';
  raw.cdabr = 'BR';
  raw.idg = 'isolated-rehearsal-1';
  raw.e.esnt = '0';
  raw.and = 'f';
  raw.carg[0].agr = raw.carg[0].agr.filter((a: any) =>
    a.par.some((p: any) => p.cand?.some((c: any) => ['13', '22'].includes(String(c.n)))),
  );
  for (const a of raw.carg[0].agr)
    for (const p of a.par) {
      p.cand = (p.cand || []).filter((c: any) => ['13', '22'].includes(String(c.n)));
      for (const c of p.cand) {
        c.e = c.n === '13' ? 's' : 'n';
        c.st = c.n === '13' ? 'Eleito' : 'Não eleito';
      }
    }
  let down = false;
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (down) throw Error('Isolated outage');
    return Response.json(
      url.endsWith('ele-c.json')
        ? {
            pl: [
              { c: 'ele2026', dt: '25/10/2026', e: [{ cd: '999', abr: [{ cp: [{ cd: '1' }] }] }] },
            ],
          }
        : raw,
    );
  });
  try {
    const first = await live(db);
    assert.equal(first.status, 'live');
    assert.equal(first.victory.kind, 'official');
    const eventsBefore = (await db.prepare('SELECT id FROM push_events').all()).results.length;
    down = true;
    for (let i = 0; i < 3; i++) {
      clock += 61000;
      const outage = await live(db);
      assert.equal(outage.status, 'unavailable');
      assert.equal(outage.lastGood.id, raw.idg);
    }
    down = false;
    clock += 61000;
    raw.idg = 'isolated-rehearsal-2';
    const recovered = await live(db);
    assert.equal(recovered.status, 'live');
    const rows = (await db.prepare('SELECT value FROM push_events').all<{ value: string }>())
      .results;
    assert.equal(rows.length, eventsBefore + 1);
    assert.equal(rows.filter((row) => JSON.parse(row.value).types.includes('winner')).length, 1);
    let sent = 0;
    await dispatchPush(db, async () => {
      sent++;
      return {} as any;
    });
    assert.equal(sent, 0);
  } finally {
    client.close();
  }
});

test('before voting ends, missing election code remains a waiting state and first-turn data never opens the live view', async (t) => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  let clock = SECOND_TURN_START - 60000;
  t.mock.method(Date, 'now', () => clock);
  let reads = 0;
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    reads++;
    return Response.json(
      url.endsWith('ele-c.json')
        ? {
            pl:
              clock < SECOND_TURN_START
                ? []
                : [
                    {
                      c: 'ele2026',
                      dt: '25/10/2026',
                      e: [{ cd: '999', abr: [{ cp: [{ cd: '1' }] }] }],
                    },
                  ],
          }
        : JSON.parse(readFileSync('public/data/2026-br.json', 'utf8')),
    );
  });
  try {
    assert.equal((await live(db)).status, 'waiting');
    assert.equal(reads, 1);
    clock = SECOND_TURN_START + 60000;
    assert.equal((await live(db)).status, 'unavailable');
    assert.equal((await db.prepare('SELECT id FROM push_events').all()).results.length, 0);
  } finally {
    client.close();
  }
});
