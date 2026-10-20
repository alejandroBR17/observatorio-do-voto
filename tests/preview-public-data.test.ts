import test from 'node:test';
import assert from 'node:assert/strict';
import { previewPublicData } from '../lib/preview-public-data';

test('public data fallback is preview-only and never forwards credentials', async (t) => {
  const originalEnv = process.env.VERCEL_ENV;
  const originalFetch = globalThis.fetch;
  t.after(() => {
    if (originalEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalEnv;
    globalThis.fetch = originalFetch;
  });
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://observatorio-voto.vercel.app');
    assert.equal(url.pathname, '/api/live');
    assert.equal(url.searchParams.get('uf'), 'SP');
    assert.equal(init?.headers, undefined);
    assert.equal(init?.method, undefined);
    return Response.json({ status: 'waiting' });
  };
  for (const environment of ['production', 'development', '']) {
    process.env.VERCEL_ENV = environment;
    assert.equal(await previewPublicData('/api/live', 'SP'), null);
  }
  assert.equal(calls, 0);
  process.env.VERCEL_ENV = 'preview';
  const result = await previewPublicData('/api/live', 'SP');
  assert.deepEqual(await result?.json(), { status: 'waiting' });
  assert.equal(result?.headers.get('Cache-Control'), 'no-store');
  assert.equal(calls, 1);
  globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
  assert.equal(await previewPublicData('/api/media'), null);
  globalThis.fetch = async () => {
    throw new Error('Timeout');
  };
  assert.equal(await previewPublicData('/api/media'), null);
});
