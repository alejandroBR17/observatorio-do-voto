import test from 'node:test';
import assert from 'node:assert/strict';
import { resultLink } from '../lib/sharing';
test('shared results contain only explicit consultation filters, never unrelated local/profile data', () => {
  const link = new URL(
    resultLink('https://observatorio-voto.vercel.app/?favorite=13&nickname=Person', {
      tab: 'municipality',
      uf: 'SP',
      municipality: '71072',
      place: '0001-25',
      section: '0030',
      zone: undefined,
    }),
  );
  assert.equal(link.searchParams.get('section'), '0030');
  assert.equal(link.searchParams.get('municipality'), '71072');
  assert.equal(link.searchParams.has('zone'), false);
  assert.equal(link.searchParams.has('favorite'), false);
  assert.equal(link.searchParams.has('nickname'), false);
});
