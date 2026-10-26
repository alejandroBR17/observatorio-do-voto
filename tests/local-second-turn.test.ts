import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeSecondTurn, secondTurnCatalog } from '../lib/local-second-turn';
import { localIndex } from '../lib/local-index';
import { GET } from '../app/api/local-results/route';

const city = JSON.parse(readFileSync('tests/fixtures/sao-paulo-2026-2.json', 'utf8'));
const zone = JSON.parse(readFileSync('tests/fixtures/sao-paulo-zone1-2026-2.json', 'utf8'));
test('second-turn municipal and zone totals preserve official scope and the sum of all votes', () => {
  const result = decodeSecondTurn(city.raw, city.source, '71072', 'SÃO PAULO');
  assert.equal(result.turn, 2);
  assert.equal(result.tally?.valid, 6962277);
  assert.equal(result.tally?.blank, 104890);
  assert.equal(result.tally?.nullVotes, 216904);
  assert.equal(result.tally?.sections, 26683);
  assert.equal(result.tally?.total, 7284071);
  assert.deepEqual(result.capabilities, { places: false, sections: false, zones: true });
  const selected = decodeSecondTurn(zone.raw, zone.source, '71072', 'SÃO PAULO', '0001');
  assert.equal(selected.selection?.zone, '0001');
  assert.equal(selected.tally?.valid, 107564);
  assert.ok(selected.tally!.valid < result.tally!.valid);
});
test('first-turn, simulated and mismatched municipal/zone files cannot be relabeled as second turn', () => {
  for (const raw of [
    { ...city.raw, t: '1' },
    { ...city.raw, ele: '6257' },
    { ...city.raw, f: 's' },
    { ...city.raw, cdabr: '60011' },
    { ...city.raw, tpabr: 'zona' },
  ])
    assert.throws(() => decodeSecondTurn(raw, city.source, '71072', 'SÃO PAULO'));
  assert.throws(() => decodeSecondTurn(zone.raw, zone.source, '71072', 'SÃO PAULO', '0002'));
});
test('city catalog reuses names without exposing first-turn locations or counts as second-turn data', async () => {
  const response = secondTurnCatalog(await localIndex('SP'));
  assert.equal(response.turn, 2);
  assert.ok(response.municipalities?.some((row) => row.code === '71072'));
  assert.equal(response.places, undefined);
  assert.equal(response.tally, undefined);
  assert.ok(response.catalogSource);
});
test('the API separates turns, forwards the requested zone and never falls back to first-turn votes on failure', async (t) => {
  const requested: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    return Response.json(url.includes('-z0001-') ? zone.raw : city.raw);
  });
  const url = 'https://example.com/api/local-results?uf=SP&municipality=71072';
  const legacy = await GET(new Request(url));
  assert.equal((await legacy.json()).turn, 1);
  assert.equal(requested.length, 0);
  const second = await GET(new Request(url + '&turn=2'));
  assert.equal(second.status, 200);
  assert.equal((await second.json()).tally.valid, 6962277);
  const selected = await GET(new Request(url + '&turn=2&zone=0001'));
  assert.equal(selected.status, 200);
  assert.equal((await selected.json()).tally.valid, 107564);
  assert.ok(requested.every((value) => value.includes('/6258/') && value.includes('e006258')));
  const calls = requested.length;
  for (const extra of ['&place=0001-1015', '&zone=0001&section=0001'])
    assert.equal((await GET(new Request(url + '&turn=2' + extra))).status, 409);
  assert.equal(requested.length, calls);
  t.mock.method(globalThis, 'fetch', async () => new Response('Unavailable', { status: 503 }));
  const failure = await GET(new Request(url + '&turn=2'));
  assert.equal(failure.status, 503);
  assert.equal((await failure.json()).tally, undefined);
});
test('invalid turns are rejected before reading the local archive', async () => {
  for (const turn of ['0', '3', '02', '../1'])
    assert.equal(
      (await GET(new Request(`https://example.com/api/local-results?uf=SP&turn=${turn}`))).status,
      400,
    );
});
