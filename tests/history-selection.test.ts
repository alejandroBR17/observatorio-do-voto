import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Result } from '../lib/elections';
import { states } from '../lib/elections';
import { historySelection } from '../lib/history-selection';

const data: Result[] = JSON.parse(readFileSync('public/data/history-2022.json', 'utf8'));

test('historical region combines vote counts rather than averaging percentages', () => {
  const selection = historySelection(data, 2, 'BR', 'Sudeste')!;
  const rows = data.filter(
    (row) =>
      row.turn === 2 && states.some((state) => state[1] === row.uf && state[3] === 'Sudeste'),
  );
  const valid = rows.reduce((total, row) => total + row.valid, 0);
  assert.equal(selection.valid, valid);
  assert.equal(selection.missingStates, 0);
  for (const candidate of selection.candidates) {
    const votes = rows.reduce(
      (total, row) =>
        total + (row.candidates.find((item) => item.number === candidate.number)?.votes || 0),
      0,
    );
    assert.equal(candidate.votes, votes);
    assert.equal(candidate.percent, (100 * votes) / valid);
  }
});

test('historical state and national views preserve source percentages', () => {
  for (const uf of ['BR', 'SP']) {
    const original = data.find((row) => row.turn === 2 && row.uf === uf)!;
    assert.deepEqual(historySelection(data, 2, uf, 'Brasil')?.candidates, original.candidates);
  }
});

test('missing historical states do not fall back to national votes', () => {
  const incomplete = data.filter((row) => row.uf !== 'SP');
  assert.equal(historySelection(incomplete, 2, 'SP', 'Brasil'), undefined);
  assert.equal(historySelection(incomplete, 2, 'BR', 'Sudeste')?.missingStates, 1);
  assert.equal(historySelection(data, 3, 'BR', 'Brasil'), undefined);
});
