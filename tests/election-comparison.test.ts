import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Result } from '../lib/elections';
import { comparisonSelection, stateSwings } from '../lib/election-comparison';

const read = (year: number) =>
  JSON.parse(readFileSync(`public/data/history-${year}.json`, 'utf8')) as Result[];
const current = read(2026),
  prior = read(2022);
test('the final 2026 collection contains two complete turns for Brazil and all 27 UFs', () => {
  assert.equal(current.length, 56);
  for (const result of current) {
    assert.equal(result.final, true);
    assert.equal(result.counted, 100);
    assert.equal(
      result.candidates.reduce((sum, candidate) => sum + candidate.votes, 0),
      result.valid,
    );
    assert.ok(result.source.startsWith('https://resultados.tse.jus.br/oficial/ele2026/'));
  }
});
test('national comparison reproduces official final counts and compares the same turn', () => {
  const now = comparisonSelection(current, 2026, 2, 'BR', 'Brasil')!;
  const before = comparisonSelection(prior, 2022, 2, 'BR', 'Brasil')!;
  assert.equal(now.pt?.votes, 64256232);
  assert.equal(before.pt?.votes, 60345999);
  assert.equal(now.valid, 124082273);
  assert.equal(before.valid, 118552353);
  assert.ok(Math.abs(now.pt!.percent - before.pt!.percent - 0.8827777668) < 0.000001);
  assert.equal(comparisonSelection(prior, 2026, 2, 'BR', 'Brasil'), undefined);
});
test('party comparisons identify Dilma and Haddad rather than calling all PT votes Lula', () => {
  assert.match(comparisonSelection(read(2014), 2014, 2, 'BR', 'Brasil')!.pt!.name, /DILMA/);
  assert.match(comparisonSelection(read(2018), 2018, 2, 'BR', 'Brasil')!.pt!.name, /HADDAD/);
});
test('incomplete regions and missing states never fall back to national votes', () => {
  assert.equal(
    comparisonSelection(
      current.filter((row) => row.uf !== 'SP'),
      2026,
      2,
      'BR',
      'Sudeste',
    ),
    undefined,
  );
  const swings = stateSwings(
    current,
    prior.filter((row) => row.uf !== 'SP'),
    2022,
    'Sudeste',
  );
  assert.equal(swings.find((row) => row.uf === 'SP')?.delta, undefined);
  assert.equal(swings.length, 4);
});
