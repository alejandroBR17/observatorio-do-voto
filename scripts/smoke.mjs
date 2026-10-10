import assert from 'node:assert/strict';
const base = process.env.TEST_URL || process.argv[2] || 'http://localhost:3000';
for (const path of [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/app-icon-192.png',
  '/app-icon-512.png',
  '/og-image.png',
  '/sw.js',
  '/data/brazil.json',
]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  if (path === '/') {
    const html = await response.text();
    assert.ok(html.includes('og-image.png'));
    assert.ok(html.includes('apple-touch-icon.png'));
  }
}
const invalid = await fetch(base + '/api/live?uf=INVALID');
assert.equal(invalid.status, 400);
const live = await fetch(base + '/api/live');
assert.equal(live.status, 200);
assert.ok(['waiting', 'live', 'loading', 'unavailable'].includes((await live.json()).status));
for (const path of ['/api/polls', '/api/media', '/api/events'])
  assert.equal((await fetch(base + path)).status, 200, path);
assert.equal(
  (
    await fetch(base + '/api/push', {
      method: 'POST',
      headers: { origin: 'https://other.example' },
      body: '{}',
    })
  ).status,
  403,
);
assert.equal(
  (
    await fetch(base + '/api/push', {
      method: 'POST',
      headers: { origin: base },
      body: 'invalid-json',
    })
  ).status,
  400,
);
assert.ok([401, 503].includes((await fetch(base + '/api/monitor')).status));
const key = await (await fetch(base + '/api/push')).json();
assert.ok(typeof key.publicKey === 'string' && key.publicKey.length > 80);
assert.equal(key.private, undefined);
assert.equal((await fetch(base + '/this-page-does-not-exist')).status, 404);
console.log(
  'Production smoke passed: icons, metadata, sources, API input validation, protected monitor and public-only push key.',
);
