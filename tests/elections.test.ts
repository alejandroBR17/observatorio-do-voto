import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize, victory } from '../lib/elections';

const fixture = () => JSON.parse(readFileSync('public/data/2026-br.json', 'utf8'));
const source = 'https://resultados.tse.jus.br';

test('normalizes every official state snapshot without changing vote totals', () => {
  for (const uf of [
    'br',
    'ac',
    'al',
    'am',
    'ap',
    'ba',
    'ce',
    'df',
    'es',
    'go',
    'ma',
    'mg',
    'ms',
    'mt',
    'pa',
    'pb',
    'pe',
    'pi',
    'pr',
    'rj',
    'rn',
    'ro',
    'rr',
    'rs',
    'sc',
    'se',
    'sp',
    'to',
    'zz',
  ]) {
    const raw = JSON.parse(readFileSync(`public/data/2026-${uf}.json`, 'utf8'));
    const result = normalize(raw, source);
    assert.equal(
      result.candidates.reduce((sum, candidate) => sum + candidate.votes, 0),
      result.valid,
      uf,
    );
    assert.ok(result.remaining <= result.electorate, uf);
  }
});

test('rejects missing, non-finite and unsafe electorate counts instead of assuming zero', () => {
  for (const value of [
    undefined,
    null,
    '',
    ' ',
    'NaN',
    Infinity,
    -1,
    0.5,
    Number.MAX_SAFE_INTEGER + 1,
    {},
  ]) {
    const raw = fixture();
    raw.e.esnt = value;
    assert.throws(() => normalize(raw, source), `pending electorate: ${String(value)}`);
  }
});

test('rejects malformed structures and unsupported offices or unofficial data', () => {
  for (const value of [null, [], {}, { ...fixture(), carg: null }, { ...fixture(), f: 's' }])
    assert.throws(() => normalize(value, source));
  const raw = fixture();
  raw.carg[0].cd = '3';
  assert.throws(() => normalize(raw, source));
});

test('rejects invalid candidate percentages and counts before displaying or announcing a result', () => {
  for (const value of ['NaN', Infinity, -1, 101, null, '']) {
    const raw = fixture();
    raw.carg[0].agr[0].par[0].cand[0].pvapn = value;
    raw.carg[0].agr[0].par[0].cand[0].pvap = value;
    assert.throws(() => normalize(raw, source));
  }
  const raw = fixture();
  raw.carg[0].agr[0].par[0].cand[0].vap = 1.5;
  assert.throws(() => normalize(raw, source));
});

test('a potential tie is open and official confirmation takes precedence over the bound', () => {
  const normalized = normalize(fixture(), source);
  const candidates = normalized.candidates
    .slice(0, 2)
    .map((candidate) => ({ ...candidate, elected: false }));
  const gap = candidates[0].votes - candidates[1].votes;
  const result = { ...normalized, turn: 2, candidates, remaining: gap };
  assert.equal(victory(result).kind, 'partial');
  assert.equal(victory({ ...result, remaining: gap - 1 }).kind, 'mathematical');
  assert.equal(
    victory({ ...result, candidates: [{ ...candidates[0], elected: true }, candidates[1]] }).kind,
    'official',
  );
  assert.equal(victory({ ...result, turn: 1 }).kind, 'waiting');
});
