import test from 'node:test';
import assert from 'node:assert/strict';
import { rememberedCity } from '../lib/remembered-city';

test('remembered municipalities survive reloads without retaining voting-place details; malformed preferences are ignored', () => {
  const city = { version: 1, uf: 'SP', code: '71072', name: 'São Paulo' };
  assert.deepEqual(rememberedCity(JSON.stringify({ ...city, zone: '123', section: '456' })), city);
  for (const value of [
    null,
    'broken',
    'null',
    JSON.stringify({ ...city, version: 2 }),
    JSON.stringify({ ...city, uf: 'XX' }),
    JSON.stringify({ ...city, code: '../01' }),
    JSON.stringify({ ...city, code: 71072 }),
    JSON.stringify({ ...city, name: '' }),
  ])
    assert.equal(rememberedCity(value), null);
});
