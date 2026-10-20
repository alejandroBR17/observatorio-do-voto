import assert from 'node:assert/strict';
import test from 'node:test';
import type { Result } from '../lib/elections';
import { overviewResults } from '../lib/overview-results';

const result = (year: number, turn: number, uf = 'BR') => ({ year, turn, uf }) as Result;
test('overview second turn waits without reusing first-turn or historical results', () => {
  assert.deepEqual(overviewResults(2026, 2, [result(2026, 1)], [], [result(2022, 2)]), []);
});
test('overview selects only the official year and turn requested, preserving state scope', () => {
  const national = result(2026, 2),
    state = result(2026, 2, 'SP');
  assert.deepEqual(
    overviewResults(2026, 2, [], [result(2026, 1), result(2022, 2), national, state], []),
    [national, state],
  );
  assert.deepEqual(
    overviewResults(2014, 2, [result(2026, 1)], [national], [result(2014, 1), result(2014, 2)]),
    [result(2014, 2)],
  );
});
