import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalize, victory } from '../lib/elections.ts';
const raw = JSON.parse(fs.readFileSync('public/data/2026-br.json', 'utf8'));
const result = normalize(raw, 'https://resultados.tse.jus.br');
assert.equal(result.candidates.find((c) => c.number === '22').votes, 56104503);
assert.equal(
  result.candidates.reduce((s, c) => s + c.votes, 0),
  result.valid,
);
assert.equal(
  result.candidates.some((c) => c.elected),
  false,
  'First-round finalists must not be called elected',
);
assert.throws(() => normalize({ ...raw, f: 's' }, ''), 'Simulation must be rejected');
assert.throws(
  () => normalize({ ...raw, e: { ...raw.e, esnt: undefined } }, ''),
  'Missing pending electorate must not become zero',
);
const second = {
  ...result,
  turn: 2,
  candidates: result.candidates.slice(0, 2).map((c) => ({ ...c, elected: false })),
  remaining: 3000000,
};
assert.equal(victory(second).kind, 'partial');
assert.equal(victory({ ...second, remaining: 1000000 }).kind, 'mathematical');
assert.equal(
  victory({ ...second, remaining: second.candidates[0].votes - second.candidates[1].votes }).kind,
  'partial',
  'Potential tie is not a win',
);
assert.equal(
  victory({
    ...second,
    candidates: [{ ...second.candidates[0], elected: true }, second.candidates[1]],
  }).kind,
  'official',
);
const h = JSON.parse(fs.readFileSync('public/data/history-2022.json'));
const national = h.find((d) => d.uf === 'BR' && d.turn === 2);
assert.equal(national.candidates[0].votes, 60345999);
assert.equal(national.candidates[1].votes, 58206354);
for (const turn of [1, 2]) {
  const total = h.find((d) => d.uf === 'BR' && d.turn === turn).valid;
  assert.equal(
    h.filter((d) => d.uf !== 'BR' && d.turn === turn).reduce((s, d) => s + d.valid, 0),
    total,
  );
}
console.log(
  'OK: official data, historical totals, incomplete/simulated data rejection, victory bounds.',
);
