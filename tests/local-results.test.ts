import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { localIndex } from '../lib/local-index';
import { selectLocal, searchText, tallySections, type LocalIndex } from '../lib/local-results';
import { SECOND_TURN_START, electionNightAvailable } from '../lib/election-night';
import { normalize, states } from '../lib/elections';
import { GET } from '../app/api/local-results/route';

const index: LocalIndex = {
  year: 2026,
  turn: 1,
  source: 'https://cdn.tse.jus.br/example.zip',
  generated: '06/10/2026',
  importedAt: '2026-10-10T12:00:00Z',
  candidates: [
    { number: '13', name: 'Lula' },
    { number: '22', name: 'Flávio Bolsonaro' },
  ],
  municipalities: [
    {
      code: '00001',
      name: 'São João',
      places: [
        {
          id: '0001-1015',
          number: '1015',
          zone: '0001',
          name: 'Escola A',
          address: 'Rua A',
          sections: [['0001', [7, 3, 2, 1]]],
        },
        {
          id: '0002-1015',
          number: '1015',
          zone: '0002',
          name: 'Escola B',
          address: 'Rua B',
          sections: [['0001', [2, 8, 1, 0]]],
        },
      ],
    },
  ],
};
test('local aggregation keeps valid vote percentages separate from all responses', () => {
  const tally = selectLocal(index, '00001').tally!;
  assert.equal(tally.total, 24);
  assert.equal(tally.valid, 20);
  assert.equal(tally.blank, 3);
  assert.equal(tally.nullVotes, 1);
  assert.equal(tally.candidates[0].number, '22');
  assert.equal(tally.candidates[0].percent, 55);
});
test('section and local numbers are scoped to municipality and zone', () => {
  assert.equal(selectLocal(index, '00001', undefined, '0001', '0001').tally!.valid, 10);
  assert.equal(selectLocal(index, '00001', '0002-1015').tally!.candidates[0].votes, 8);
  assert.throws(() => selectLocal(index, '00001', undefined, undefined, '0001'), /zona/);
  assert.throws(() => selectLocal(index, '00001', undefined, '0003', '0001'), /não encontrado/);
  assert.throws(() => selectLocal(index, '00002'), /Município/);
});
test('duplicate or malformed counts are rejected; empty valid votes never produce NaN', () => {
  assert.throws(() => tallySections(index.candidates, [['1', [1, -1, 0, 0]]]), /inválidas/);
  assert.throws(
    () =>
      tallySections(index.candidates, [
        ['1', [1, 1, 0, 0]],
        ['1', [1, 1, 0, 0]],
      ]),
    /duplicada/,
  );
  assert.equal(tallySections(index.candidates, [['1', [0, 0, 3, 2]]]).candidates[0].percent, 0);
  assert.equal(searchText(' São João '), 'sao joao');
});
test('live election night requires both the opening time and actual second-turn data', () => {
  assert.equal(electionNightAvailable('live', 2, SECOND_TURN_START - 1), false);
  assert.equal(electionNightAvailable('waiting', 2, SECOND_TURN_START), false);
  assert.equal(electionNightAvailable('live', 1, SECOND_TURN_START), false);
  assert.equal(electionNightAvailable('live', 2, SECOND_TURN_START), true);
});
test('local API rejects invalid scope/path traversal before accessing data', async () => {
  for (const query of [
    'uf=../SP',
    'uf=SP&municipality=../',
    'uf=SP&section=0001',
    'uf=SP&municipality=71072&zone=00001',
  ]) {
    const response = await GET(new Request(`https://example.com/api/local-results?${query}`));
    assert.equal(response.status, 400, query);
  }
  const missing = await GET(
    new Request('https://example.com/api/local-results?uf=SP&municipality=99999'),
  );
  assert.equal(missing.status, 404);
});
test('all imported municipalities reproduce every state candidate, blank and null total', async () => {
  for (const [, uf] of states) {
    const imported = await localIndex(uf);
    const sectionKeys = new Set<string>();
    const sections = imported.municipalities.flatMap((m) =>
      m.places.flatMap((p) =>
        p.sections.map(([s, votes]): [string, number[]] => {
          const key = `${m.code}-${p.zone}-${s}`;
          assert.equal(sectionKeys.has(key), false, `duplicate ${uf}-${key}`);
          sectionKeys.add(key);
          return [key, votes];
        }),
      ),
    );
    const tally = tallySections(imported.candidates, sections);
    const official = normalize(
      JSON.parse(await readFile(`public/data/2026-${uf.toLowerCase()}.json`, 'utf8')),
      'official',
    );
    assert.equal(tally.valid, official.valid, `${uf}: valid votes`);
    assert.equal(tally.blank, official.blank, `${uf}: blank votes`);
    assert.equal(
      tally.nullVotes,
      official.nullVotes,
      `${uf}: null votes including cancelled candidacies`,
    );
    for (const candidate of official.candidates)
      assert.equal(
        tally.candidates.find((c) => c.number === candidate.number)?.votes,
        candidate.votes,
        `${uf}: ${candidate.name}`,
      );
  }
});
