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
  '/assets/flavio.jpeg',
  '/assets/lula.jpeg',
  '/assets/licenses/candidate-portraits.json',
]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  if (path === '/') {
    const csp = response.headers.get('content-security-policy') || '';
    const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
    assert.ok(nonce, 'page requires a CSP nonce');
    assert.ok(csp.includes("frame-ancestors 'none'"));
    const scriptPolicy = csp
      .split(';')
      .find((directive) => directive.trim().startsWith('script-src'));
    assert.ok(!scriptPolicy?.includes('unsafe-inline') && !scriptPolicy?.includes('unsafe-eval'));
    const html = await response.text();
    for (const [script] of html.matchAll(/<script\b[^>]*>/g))
      assert.ok(
        script.includes(`nonce="${nonce}"`),
        'framework and theme scripts use the current nonce',
      );
    assert.ok(html.includes('og-image.png'));
    assert.ok(html.includes('apple-touch-icon.png'));
    assert.match(
      html,
      /<link\b(?=[^>]*href="\/assets\/fonts\.css")(?=[^>]*data-precedence="fonts")[^>]*>/,
    );
  }
}
const secondPage = await fetch(base + '/');
assert.notEqual(
  secondPage.headers.get('content-security-policy'),
  (await fetch(base + '/')).headers.get('content-security-policy'),
  'each request uses a fresh nonce',
);
const offlineDocument = await fetch(base + '/offline.html');
assert.equal(offlineDocument.status, 200);
assert.ok(offlineDocument.headers.get('content-security-policy')?.includes("script-src 'self'"));
const invalid = await fetch(base + '/api/live?uf=INVALID');
for (const path of ['/termos', '/privacidade']) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(html.includes('13 DE OUTUBRO DE 2026'), path);
  assert.ok(html.includes('Alejandro Mateus Sobral Cortes'), path);
  assert.ok(html.includes('mailto:ale.sobral.cortes@gmail.com'), path);
  if (path === '/privacidade') {
    assert.ok(html.includes('id="transferencias"'));
    assert.ok(html.includes('id="estatisticas"'));
  }
}
for (const path of ['/termos/versoes/2026-10-09', '/privacidade/versoes/2026-10-10'])
  assert.equal((await fetch(base + path)).status, 200, path);
const credits = await fetch(base + '/creditos');
assert.equal(credits.status, 200);
const creditsHtml = await credits.text();
assert.ok(creditsHtml.includes('Carlos Moura'));
assert.ok(creditsHtml.includes('Ricardo Stuckert'));
assert.ok(creditsHtml.includes('CC BY-SA 4.0'));
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
