import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  decodeSectionBallot,
  fetchSectionBallot,
  secondTurnPlaceDirectory,
} from '../lib/section-ballot';
import { localIndex } from '../lib/local-index';
import { GET } from '../app/api/local-results/route';

const bytes = readFileSync('tests/fixtures/sao-paulo-section1-2026-2-bu.dat');
const aux = JSON.parse(readFileSync('tests/fixtures/sao-paulo-section1-2026-2-aux.json', 'utf8'));
test('official second-turn BU preserves section identity, local number and all vote categories', () => {
  assert.deepEqual(decodeSectionBallot(bytes, '71072', '0001', '0001'), {
    counts: { '13': 145, '22': 112, blank: 3, null: 6 },
    attendance: 266,
    eligible: 363,
    placeNumber: '1015',
    emitted: '20261025T190417',
  });
});
test('mismatched scope, truncated bytes, simulation, wrong election and inconsistent attendance are rejected', () => {
  for (const scope of [
    ['60011', '0001', '0001'],
    ['71072', '0002', '0001'],
    ['71072', '0001', '0002'],
  ])
    assert.throws(() => decodeSectionBallot(bytes, ...(scope as [string, string, string])));
  assert.throws(() => decodeSectionBallot(bytes.subarray(0, 300), '71072', '0001', '0001'));
  for (const [pattern, replacement] of [
    [
      [10, 1, 2],
      [10, 1, 1],
    ],
    [
      [2, 2, 24, 114],
      [2, 2, 24, 113],
    ],
    [
      [2, 2, 1, 10],
      [2, 2, 1, 11],
    ],
  ]) {
    const corrupted = Buffer.from(bytes);
    const at = corrupted.indexOf(Buffer.from(pattern));
    assert.ok(at > 0);
    Buffer.from(replacement).copy(corrupted, at);
    assert.throws(() => decodeSectionBallot(corrupted, '71072', '0001', '0001'));
  }
});
test('API resolves an aggregated section through the second-turn catalog and never guesses a BU filename or version', async (t) => {
  let currentAux = aux;
  const requested: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    if (url.endsWith('-cs.json'))
      return Response.json({
        f: 'o',
        cdp: '3221',
        abr: [
          {
            cd: 'sp',
            mu: [
              {
                cd: '71072',
                zon: [
                  {
                    cd: '0001',
                    sec: [
                      { ns: '0001', nsa: ['0003'] },
                      { ns: '0003', nsp: '0001' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    if (url.endsWith('-aux.json')) return Response.json(currentAux);
    assert.ok(url.endsWith('/' + aux.hashes[0].hash + '/o03221sp7107200010001-bu.dat'));
    return new Response(bytes);
  });
  const url =
    'https://example.com/api/local-results?uf=SP&turn=2&municipality=71072&zone=0001&section=0003';
  const response = await GET(new Request(url));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.turn, 2);
  assert.equal(data.selection.section, '0003');
  assert.equal(data.ballot.principal, '0001');
  assert.deepEqual(data.ballot.aggregated, ['0003']);
  assert.equal(data.ballot.placeNumber, '1015');
  assert.equal(data.tally.total, 266);
  assert.equal(data.tally.sections, 1);
  assert.ok(requested.every((item) => item.includes('/3221/')));
  const calls = requested.length;
  await assert.rejects(fetchSectionBallot('SP', '71072', 'SÃO PAULO', '0001', '9999'));
  assert.equal(requested.length, calls);
  const directoryUrl =
    'https://example.com/api/local-results?uf=SP&turn=2&municipality=71072&directory=1';
  const lookupResponse = await GET(new Request(directoryUrl));
  assert.equal(lookupResponse.status, 200);
  const lookup = await lookupResponse.json();
  assert.equal(lookup.tally, undefined);
  assert.equal(lookup.turn, 2);
  assert.equal(lookup.placeDirectory.turn, 1);
  assert.deepEqual(
    lookup.places.find((place: { id: string }) => place.id === '0001-1015').sections,
    ['0001', '0003'],
  );
  const selected = await GET(new Request(url + '&place=0001-1015'));
  assert.equal(selected.status, 200);
  assert.equal((await selected.json()).tally.total, 266);
  const reference = await localIndex('SP');
  const otherPlace = reference.municipalities
    .find((city) => city.code === '71072')!
    .places.find((place) => place.zone === '0001' && place.number !== '1015')!;
  assert.equal((await GET(new Request(url + '&place=' + otherPlace.id))).status, 409);
  const metadata = await secondTurnPlaceDirectory(
    'SP',
    {
      code: '71072',
      name: 'SÃO PAULO',
      places: [
        {
          id: '0001-1015',
          zone: '0001',
          number: '1015',
          name: 'Escola de referência',
          address: 'Rua de referência',
          sections: [
            ['0001', [999999]],
            ['9999', [999999]],
          ],
        },
        {
          id: '9999-1015',
          zone: '9999',
          number: '1015',
          name: 'Zona ausente',
          address: '',
          sections: [['0001', [999999]]],
        },
      ],
    },
    reference,
  );
  assert.equal(metadata.tally, undefined);
  assert.deepEqual(
    metadata.places?.map((place) => ({ zone: place.zone, sections: place.sections })),
    [{ zone: '0001', sections: ['0001'] }],
  );
  for (const extra of ['&directory=0', '&directory=1&section=0001', '&directory=1&turn=1'])
    assert.equal(
      (
        await GET(
          new Request('https://example.com/api/local-results?uf=SP&municipality=71072' + extra),
        )
      ).status,
      400,
    );
  currentAux = { ...aux, st: 'Anulada' };
  await assert.rejects(fetchSectionBallot('SP', '71072', 'SÃO PAULO', '0001', '0001'));
  currentAux = { ...aux, hashes: [...aux.hashes, ...aux.hashes] };
  await assert.rejects(fetchSectionBallot('SP', '71072', 'SÃO PAULO', '0001', '0001'));
  currentAux = {
    ...aux,
    hashes: [{ ...aux.hashes[0], arq: [{ tp: 'bu', nm: '../another-bu.dat' }] }],
  };
  await assert.rejects(fetchSectionBallot('SP', '71072', 'SÃO PAULO', '0001', '0001'));
});
