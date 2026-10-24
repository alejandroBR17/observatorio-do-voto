import assert from 'node:assert/strict';
const base = process.env.TEST_URL || process.argv[2] || 'http://localhost:3000';
let canonical;
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
    canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(canonical, 'homepage has a canonical URL');
    const publicUrl = new URL(canonical);
    assert.equal(publicUrl.search, '', 'view filters do not become canonical URLs');
    assert.equal(publicUrl.pathname, '/');
    assert.ok(html.includes(`property="og:url" content="${canonical}"`));
    assert.ok(html.includes('name="twitter:description"'));
    assert.ok(
      html.includes(`property="og:image" content="${new URL('/og-image.png', canonical).href}"`),
    );
    assert.ok(html.includes('property="og:image:type" content="image/png"'));
    assert.ok(html.includes('property="og:image:alt"'));
    assert.ok(html.includes('application/ld+json'));
    assert.match(
      html,
      /<link\b(?=[^>]*href="\/assets\/fonts\.css")(?=[^>]*data-precedence="fonts")[^>]*>/,
    );
  }
}
const filterPage = await (await fetch(base + '/?tab=polls&uf=SP&region=Sudeste')).text();
assert.ok(filterPage.includes(`<link rel="canonical" href="${canonical}"`));
const debateResponse = await fetch(base + '/debate');
assert.equal(debateResponse.status, 200, 'debate has its own public link');
const debateHtml = await debateResponse.text();
assert.ok(debateHtml.includes('O debate na Globo.'));
assert.ok(debateHtml.includes('id="debate-broadcast-title"'));
assert.ok(
  debateHtml.includes(
    'href="https://g1.globo.com/politica/eleicoes/2026/ao-vivo/debate-globo-segundo-turno.ghtml"',
  ),
  'official coverage is accessible without being presented as a video URL',
);
assert.ok(debateHtml.includes('Quando as pessoas foram ouvidas?'));
assert.ok(debateHtml.includes('TRANSMISSÃO OFICIAL'));
assert.ok(debateHtml.includes('O que cada um propõe?'));
assert.ok(debateHtml.includes('debate-propostas') && debateHtml.includes('debate-pesquisas'));
assert.ok(!debateHtml.includes('Prévia para revisão'));
assert.ok(
  debateHtml.includes(`<link rel="canonical" href="${new URL('/debate', canonical).href}"`),
);
assert.ok(
  debateHtml.includes('property="og:title" content="Debate na Globo: acompanhe com contexto"'),
);
const robots = await fetch(base + '/robots.txt');
assert.equal(robots.status, 200);
const robotsText = await robots.text();
assert.ok(robotsText.includes('Disallow: /api/'));
assert.ok(robotsText.includes(`Sitemap: ${new URL('/sitemap.xml', canonical).href}`));
const sitemap = await fetch(base + '/sitemap.xml');
assert.equal(sitemap.status, 200);
const sitemapText = await sitemap.text();
assert.ok(!sitemapText.includes('/api/') && !sitemapText.includes('?tab='));
for (const path of ['/', '/termos', '/privacidade', '/creditos'])
  assert.ok(sitemapText.includes(`<loc>${new URL(path, canonical).href}</loc>`));
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
  assert.ok(html.includes(`<link rel="canonical" href="${new URL(path, canonical).href}"`));
  assert.ok(
    html.includes(path === '/privacidade' ? '22 DE OUTUBRO DE 2026' : '13 DE OUTUBRO DE 2026'),
    path,
  );
  assert.ok(html.includes('Alejandro Mateus Sobral Cortes'), path);
  assert.ok(html.includes('mailto:ale.sobral.cortes@gmail.com'), path);
  if (path === '/privacidade') {
    assert.ok(html.includes('id="personalizacao"'));
    assert.ok(html.includes('id="transferencias"'));
    assert.ok(html.includes('id="estatisticas"'));
    assert.ok(html.includes('2026-10-22.2'));
    assert.ok(html.includes('Adaptar também o ritmo dos alertas'));
  }
}
for (const path of [
  '/termos/versoes/2026-10-09',
  '/privacidade/versoes/2026-10-10',
  '/privacidade/versoes/2026-10-13',
  '/privacidade/versoes/2026-10-22-1',
])
  assert.equal((await fetch(base + path)).status, 200, path);
const priorPrivacy = await (await fetch(base + '/privacidade/versoes/2026-10-13')).text();
assert.ok(priorPrivacy.includes('Documento histórico.'));
assert.ok(priorPrivacy.includes('noindex'));
const learningPrivacy = await (await fetch(base + '/privacidade/versoes/2026-10-22-1')).text();
assert.ok(learningPrivacy.includes('Documento histórico.') && learningPrivacy.includes('noindex'));
const profilePage = await (await fetch(base + '/?tab=profile')).text();
assert.ok(profilePage.includes('Personalizar minha experiência pelo uso'));
assert.ok(profilePage.includes('Organizar notícias e publicações para mim'));
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
const debateContextResponse = await fetch(base + '/api/debate');
assert.equal(debateContextResponse.status, 200, 'debate context responds');
const debateContext = await debateContextResponse.json();
assert.ok(['ready', 'stale', 'unavailable'].includes(debateContext.status));
assert.ok(Array.isArray(debateContext.checks));
assert.ok(Number.isSafeInteger(debateContext.editorial?.revision));
assert.ok(['planned', 'live', 'ended'].includes(debateContext.editorial?.state));
assert.ok(Array.isArray(debateContext.editorial?.proposals?.economia));
if (debateContext.video) {
  assert.ok(
    ['player.globo.com', 'globoplay.globo.com'].includes(
      new URL(debateContext.video.watchUrl).hostname,
    ),
  );
  if (debateContext.video.embedUrl)
    assert.equal(new URL(debateContext.video.embedUrl).hostname, 'player.globo.com');
}
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
