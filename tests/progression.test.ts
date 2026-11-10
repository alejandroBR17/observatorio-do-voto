import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createClient } from '@libsql/client';
import { createDatabase } from '../lib/database';
import type { Result } from '../lib/elections';
import {
  recordProgression,
  readProgression,
  progressionPoint,
  mergeProgressionPoints,
} from '../lib/progression';
import { Progression } from '../app/components/vote-progression';
const rows: Result[] = JSON.parse(readFileSync('public/data/history-2026.json', 'utf8'));
const national = rows.find((row) => row.uf === 'BR' && row.turn === 2)!;
test('official snapshots persist across reads, deduplicate and preserve geographic scope', async () => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  try {
    await recordProgression(db, national);
    await recordProgression(db, national);
    await recordProgression(
      db,
      rows.find((row) => row.uf === 'SP' && row.turn === 2)!,
    );
    const points = await readProgression(db, 'BR');
    assert.equal(points.length, 1);
    assert.equal(points[0].id, national.id);
    assert.equal(points[0].counted, 100);
    assert.ok(points[0].time);
    assert.equal((await readProgression(db, 'SP')).length, 1);
    assert.equal((await readProgression(db, 'BA')).length, 0);
  } finally {
    client.close();
  }
});
test('missing candidates, invalid percentages and a different election never become zero-valued points', () => {
  assert.equal(progressionPoint({ ...national, turn: 1 }), null);
  assert.equal(progressionPoint({ ...national, candidates: [] }), null);
  assert.equal(progressionPoint({ ...national, counted: NaN }), null);
});

test('merging session and stored records preserves source-time order and discards invalid points', () => {
  const base = progressionPoint(national)!;
  const points = mergeProgressionPoints([
    { ...base, id: 'b', time: '25/10/2026 20:02:00 (Brasília)', counted: 50 },
    { ...base, id: 'a', time: '25/10/2026 20:01:00 (Brasília)', counted: 40 },
    { ...base, id: 'b', time: '25/10/2026 20:02:00 (Brasília)', counted: 50 },
    { ...base, id: 'bad', counted: NaN },
  ]);
  assert.deepEqual(
    points.map((point) => point.id),
    ['a', 'b'],
  );
});
test('empty and single-point series explain their coverage instead of drawing invisible lines', () => {
  for (const points of [[], [progressionPoint(national)!]]) {
    const html = renderToStaticMarkup(
      createElement(Progression, { points, greenName: 'Flávio Bolsonaro' }),
    );
    assert.ok(!html.includes('<svg'));
    assert.ok(html.includes('role="status"'));
  }
  const single = renderToStaticMarkup(
    createElement(Progression, {
      points: [progressionPoint(national)!],
      greenName: 'Flávio Bolsonaro',
    }),
  );
  assert.ok(single.includes('51,79%'));
  assert.ok(single.includes('Flávio Bolsonaro'));
});
