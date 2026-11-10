import { test } from 'node:test';
import assert from 'node:assert/strict';
import { electionStatusNotice } from '../lib/election-status-notice';
import type { Result } from '../lib/elections';

test('the sourced pause notice belongs only to the reported national partial and clears on a new bulletin', () => {
  const partial = { year: 2026, turn: 2, uf: 'BR', id: '3948414', final: false } as Result;
  assert.match(electionStatusNotice(partial)!.text, /retomada não foi confirmado/);
  for (const result of [
    undefined,
    { ...partial, id: '3948415' },
    { ...partial, uf: 'SP' },
    { ...partial, turn: 1 },
    { ...partial, year: 2022 },
    { ...partial, final: true },
  ])
    assert.equal(electionStatusNotice(result), null);
});
