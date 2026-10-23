import assert from 'node:assert/strict';
import {
  parseRss,
  parseWordPress,
  parseAtlas,
  parsePoderDataArticle,
  pollSnapshots,
} from '../lib/polls.ts';
const src = {
  name: 'PoderData',
  url: 'https://www.poder360.com.br/category/poderdata/feed/',
  domain: 'poder360.com.br',
};
const item = (
  title,
  link = 'https://www.poder360.com.br/poderdata/example/',
  d = 'Thu, 08 Oct 2026 10:30:00 GMT',
) => `<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${d}</pubDate></item>`;
const parsed = parseRss(
  `<rss>${item('PoderData: Flávio tem 53% e Lula 47% no 2º turno')}${item('PoderData: aprovação do governo')}${item('PoderData: Lula na eleição', 'https://attacker.test/evil')}${item('PoderData: Lula na eleição', undefined, 'not a date')}${item('PoderData: Lula na eleição', undefined, 'Wed, 08 Oct 2025 10:30:00 GMT')}</rss>`,
  src,
);
assert.equal(parsed.length, 1);
assert.equal(parsed[0].institute, 'PoderData/Aya');
assert.equal(parsed[0].kind, 'publication');
assert.equal(parsed[0].flavio, undefined, 'headline percentage must not become voting data');
const ipespe = { name: 'Ipespe', url: 'https://ipespe.org.br/feed/', domain: 'ipespe.org.br' };
const ipespeItems = parseRss(
  `<rss>${item('Ipespe: Lula e Flávio no segundo turno', 'https://ipespe.org.br/presidente/')}${item('Pesquisa IPESPE &#8211; ABRAPEL &#8211; 2º Turno | Tracking da Campanha (Weekly Tracking) &#8211; Rodada 01', 'https://ipespe.org.br/tracking/')}${item('Ipespe: Elmano fala do apoio de Lula', 'https://ipespe.org.br/ceara/')}${item('IPESPE: segundo turno governo Pernambuco', 'https://ipespe.org.br/governador/')}${item('Ipespe: pesquisa de presidente', 'https://attacker.test/')}</rss>`,
  ipespe,
);
assert.equal(ipespeItems.length, 2);
assert.equal(ipespeItems[0].institute, 'Ipespe');
assert.equal(ipespeItems[0].flavio, undefined);
const cnn = {
  name: 'CNN Brasil',
  domain: 'cnnbrasil.com.br',
  url: 'https://www.cnnbrasil.com.br/feed/',
};
for (const [name, title] of [
  ['Gerp', 'Gerp: Flávio tem 55% e Lula 45% no 2º turno'],
  ['Futura/100 Cidades', 'Futura: Flávio e Lula no segundo turno presidencial'],
  ['BTG/Nexus', 'Pesquisa BTG/Nexus de intenção de votos para presidente do Brasil'],
  ['Palver', 'Palver: Flávio tem 50% e Lula 49% no segundo turno'],
  ['Indexa/Broadcast', 'Indexa/Broadcast: Flávio tem 51% e Lula 49% no segundo turno'],
  ['CNT/MDA', 'CNT/MDA confirma PoderData/Aya e dá Flávio com 50,5% e Lula com 49,5%'],
]) {
  const [publication] = parseRss(
    item(title, 'https://www.cnnbrasil.com.br/eleicoes/pesquisa/'),
    cnn,
  );
  assert.equal(publication.institute, name);
  assert.equal(publication.flavio, undefined, 'Discovery alone never publishes percentages');
}
for (const title of [
  'Quaest: Allyson tem 45% no segundo turno no RN; Cadu de Lula, 42%',
  'Quaest no RN, 2º turno: Allyson, 45%; Cadu de Lula, 42%',
])
  assert.equal(
    parseRss(item(title, 'https://www.cnnbrasil.com.br/eleicoes/governador/'), cnn).length,
    0,
  );
const reported = parseRss(
  item('Vox Brasil: Lula e Flávio no segundo turno', 'https://www.cnnbrasil.com.br/eleicoes/vox/'),
  cnn,
);
assert.equal(reported.length, 1);
assert.equal(reported[0].institute, 'Vox Brasil');
assert.equal(reported[0].publisher, 'CNN Brasil');
assert.equal(reported[0].flavio, undefined);
for (const spelling of ['DataTrends', 'Data Trends']) {
  const discovered = parseRss(
    item(
      `${spelling}: pesquisa de Lula e Flávio para presidente`,
      'https://www.cnnbrasil.com.br/eleicoes/datatrends/',
    ),
    cnn,
  );
  assert.equal(discovered.length, 1);
  assert.equal(discovered[0].institute, 'DataTrends');
  assert.equal(discovered[0].flavio, undefined);
}
assert.equal(
  parseRss(
    item('DataTrends: pesquisa para governador', 'https://www.cnnbrasil.com.br/eleicoes/governo/'),
    cnn,
  ).length,
  0,
);
assert.equal(
  parseRss(item('Datafolha: Lula &amp; Flávio na eleição', 'javascript:alert(1)'), src).length,
  0,
);
assert.equal(
  parseWordPress(
    [
      {
        link: 'https://quaest.com.br/relatorios/x',
        title: { rendered: 'Pesquisa para presidente &#8211; 03/10/2026' },
        date_gmt: '2026-10-04T18:39:12',
      },
      {
        link: 'https://quaest.com.br/x',
        title: { rendered: 'Pesquisa governador' },
        date_gmt: '2026-10-04T18:39:12',
      },
    ],
    { name: 'Quaest', url: 'https://quaest.com.br/wp-json', domain: 'quaest.com.br' },
  ).length,
  1,
);
assert.equal(
  parseAtlas(
    '<a href="/poll/brazil-national-2026-10-03">National</a><a href="/poll/brazil-parana-2026-10-03">Paraná</a>',
    { name: 'AtlasIntel', url: 'https://atlasintel.org/polls', domain: 'atlasintel.org' },
  ).length,
  1,
);
assert.equal(pollSnapshots.length, 36);
const realTimeOctober23 = pollSnapshots.find((poll) => poll.registration === 'BR-09670/2026');
assert.deepEqual([realTimeOctober23.flavio, realTimeOctober23.lula], [52, 48]);
assert.deepEqual(realTimeOctober23.totalVotes, {
  flavio: 49,
  lula: 45,
  blankNull: 5,
  undecided: 1,
});
assert.match(realTimeOctober23.fieldwork, /^19 a 22\/10\/2026/);
assert.match(realTimeOctober23.publishedAt, /^2026-10-23T/);
assert.equal(realTimeOctober23.sample, 2000);
assert.equal(realTimeOctober23.margin, 2);
assert.equal(realTimeOctober23.confidence, 95);
assert.equal(realTimeOctober23.basis, 'valid');
assert.match(realTimeOctober23.note, /registro do TSE prevê método misto/);
// October 22 verification: preserve published bases and rounding, never infer valid votes.
for (const [registration, sample, basis, flavio, lula, totals] of [
  ['BR-09709/2026', 2520, 'valid', 50, 50, [47, 46]],
  ['BR-02348/2026', 2000, 'valid', 50.6, 49.4, [45.2, 44.1]],
  ['BR-07926/2026', 4000, 'valid', 51, 49, [49, 48]],
  ['BR-08535/2026', 2154, 'total', 45, 44, [45, 44]],
]) {
  const snapshot = pollSnapshots.find((poll) => poll.registration === registration);
  assert.ok(snapshot, registration);
  assert.equal(snapshot.sample, sample);
  assert.equal(snapshot.basis, basis);
  assert.deepEqual([snapshot.flavio, snapshot.lula], [flavio, lula]);
  assert.deepEqual([snapshot.totalVotes.flavio, snapshot.totalVotes.lula], totals);
  assert.match(snapshot.registryCheckedAt, /^2026-10-23T/);
}
const quaestOctober21 = pollSnapshots.find((poll) => poll.registration === 'BR-08535/2026');
assert.match(quaestOctober21.publishedAt, /^2026-10-21T/);
assert.match(quaestOctober21.fieldwork, /^17 a 20\/10\/2026/);
assert.equal(quaestOctober21.totalVotes.other, 9);
const poderDataOctober22 = pollSnapshots.find((poll) => poll.registration === 'BR-07926/2026');
assert.equal(poderDataOctober22.totalVotes.blankNull, 3);
assert.equal(poderDataOctober22.totalVotes.undecided, 1);
assert.match(poderDataOctober22.note, /101%/);

// October 21: preserve published bases and the digital survey's rounding.
for (const [registration, sample, basis, flavio, lula, totals] of [
  ['BR-06614/2026', 2000, 'valid', 51.1, 48.9, [48.9, 46.8]],
  ['BR-08251/2026', 1500, 'valid', 51.1, 48.9, [48, 46]],
  ['BR-04612/2026', 5000, 'total', 50, 48, [50, 48]],
]) {
  const snapshot = pollSnapshots.find((poll) => poll.registration === registration);
  assert.ok(snapshot, registration);
  assert.equal(snapshot.sample, sample);
  assert.equal(snapshot.basis, basis);
  assert.deepEqual([snapshot.flavio, snapshot.lula], [flavio, lula]);
  assert.deepEqual([snapshot.totalVotes.flavio, snapshot.totalVotes.lula], totals);
  assert.match(snapshot.publishedAt, /^2026-10-21T/);
  assert.ok(snapshot.registryCheckedAt);
  assert.match(snapshot.metadataSource, /^https:\/\/dadosabertos\.tse\.jus\.br\//);
}
const palverOctober21 = pollSnapshots.find((poll) => poll.registration === 'BR-04612/2026');
assert.match(palverOctober21.fieldwork, /^18 a 20\/10\/2026/);
assert.equal(palverOctober21.totalVotes.other, 1);
assert.equal(palverOctober21.totalVotes.undecided, 0);
for (const pending of ['BR-03835/2026', 'BR-06396/2026']) {
  assert.ok(!pollSnapshots.some((poll) => poll.registration === pending));
}
// October 20: keep the original reports' precision and the effective fieldwork.
for (const [registration, sample, flavio, lula, totals] of [
  ['BR-07896/2026', 3000, 50.81, 49.19, [40.95, 39.65]],
  ['BR-02952/2026', 2000, 52, 48, [48, 45]],
  ['BR-00820/2026', 2700, 51.5, 48.5, [48.8, 45.9]],
]) {
  const snapshot = pollSnapshots.find((poll) => poll.registration === registration);
  assert.ok(snapshot, registration);
  assert.equal(snapshot.sample, sample);
  assert.deepEqual([snapshot.flavio, snapshot.lula], [flavio, lula]);
  assert.deepEqual([snapshot.totalVotes.flavio, snapshot.totalVotes.lula], totals);
  assert.match(snapshot.publishedAt, /^2026-10-20T/);
  assert.ok(snapshot.registryCheckedAt);
  assert.match(snapshot.metadataSource, /^https:\/\/dadosabertos\.tse\.jus\.br\//);
}
assert.equal(new Set(pollSnapshots.map((p) => p.registration)).size, pollSnapshots.length);
for (const p of pollSnapshots) {
  if (p.basis === 'valid') assert.equal(p.flavio + p.lula, 100);
  assert.equal(p.turn, 2);
  assert.match(p.registration, /^BR-\d{5}\/2026$/);
  assert.equal(p.mode, 'snapshot');
  assert.ok(p.contractor?.trim(), `${p.registration}: contractor required for disclosure`);
  assert.ok(p.confidence > 0 && p.confidence <= 100, `${p.registration}: confidence required`);
}
const article = {
  '@type': 'NewsArticle',
  headline: 'Flávio tem 53% contra 47% de Lula no 2º turno, diz pesquisa PoderData/Aya',
  datePublished: '2026-10-08T07:30:00-03:00',
  articleBody:
    'Pesquisa PoderData/Aya mostra Flávio Bolsonaro à frente no 2º turno à Presidência da República. No embate com Lula, o congressista tem 53% dos votos válidos, ante 47% do petista.\n\nO levantamento, realizado de 5 a 7 de outubro, ouviu eleitores. Foram 3.000 entrevistas nas 27 unidades da Federação. A margem de erro é de 1,8 ponto percentual. O intervalo de confiança é de 95%. BR-08134/2026. A pesquisa foi realizada pelo PoderData, empresa do grupo Poder360 Jornalismo, com recursos próprios.',
};
const html = (a) =>
  `<script type="application/ld+json">${JSON.stringify({ '@graph': [a] })}</script>`;
const u = pollSnapshots.find((p) => p.registration === 'BR-08134/2026').source;
const now = Date.parse('2026-10-08T23:59:00-03:00');
const reversed = {
  ...article,
  headline: 'Lula reage e vai a 49% contra 51% de Flávio, diz PoderData/Aya',
  datePublished: '2026-10-13T07:15:43-03:00',
  articleBody:
    'O presidente Lula e Flávio Bolsonaro disputam o 2º turno. O petista tem 49% dos votos válidos ante 51% do senador Flávio Bolsonaro.\n\n' +
    article.articleBody
      .split('\n\n')[1]
      .replace('5 a 7', '10 a 12')
      .replace('BR-08134/2026', 'BR-01209/2026'),
};
const today = Date.parse('2026-10-13T23:00:00-03:00');
const reversedPoll = parsePoderDataArticle(html(reversed), u, today);
assert.equal(reversedPoll.flavio, 51);
assert.equal(reversedPoll.lula, 49);
assert.equal(reversedPoll.registration, 'BR-01209/2026');
for (const body of [
  reversed.articleBody.replace('49% dos votos válidos', '48% dos votos válidos'),
  reversed.articleBody.replace('votos válidos', 'votos totais'),
  reversed.articleBody.replace('2º turno', '1º turno'),
  reversed.articleBody.replace('27 unidades da Federação', 'Amazonas'),
])
  assert.equal(parsePoderDataArticle(html({ ...reversed, articleBody: body }), u, today), null);
assert.equal(parsePoderDataArticle(html(article), u, now).flavio, 53);
assert.match(parsePoderDataArticle(html(article), u, now).contractor, /recursos próprios/);
for (const confidence of ['0%', '101%'])
  assert.equal(
    parsePoderDataArticle(
      html({ ...article, articleBody: article.articleBody.replace('95%', confidence) }),
      u,
      now,
    ),
    null,
  );
for (const omitted of ['O intervalo de confiança é de 95%.', 'com recursos próprios.'])
  assert.equal(
    parsePoderDataArticle(
      html({ ...article, articleBody: article.articleBody.replace(omitted, '') }),
      u,
      now,
    ),
    null,
    'Incomplete disclosure remains a publication rather than a numeric poll',
  );
const atlasSnapshot = pollSnapshots.find((p) => p.registration === 'BR-03663/2026');
const ipespeSnapshot = pollSnapshots.find((p) => p.registration === 'BR-00933/2026');
const voxSnapshot = pollSnapshots.find((p) => p.registration === 'BR-09623/2026');
const dataTrendsSnapshot = pollSnapshots.find((p) => p.institute === 'DataTrends');
assert.equal(dataTrendsSnapshot.registration, 'BR-03576/2026');
assert.equal(dataTrendsSnapshot.flavio, 53.1);
assert.equal(dataTrendsSnapshot.lula, 46.9);
assert.equal(dataTrendsSnapshot.sample, 2000);
assert.equal(dataTrendsSnapshot.margin, 2.19);
assert.deepEqual(dataTrendsSnapshot.totalVotes, {
  flavio: 50,
  lula: 44,
  blankNull: 5,
  undecided: 1,
});
assert.equal(voxSnapshot.basis, 'total');
assert.equal(voxSnapshot.registration, 'BR-09623/2026');
assert.equal(voxSnapshot.flavio, 42.7);
assert.equal(voxSnapshot.lula, 44.2);
assert.equal(voxSnapshot.sample, 2100);
assert.equal(voxSnapshot.margin, 2.15);
assert.equal(voxSnapshot.totalVotes.blankNull, 3.4);
assert.equal(voxSnapshot.totalVotes.undecided, 9.7);
assert.equal(
  Math.round(
    (voxSnapshot.flavio +
      voxSnapshot.lula +
      voxSnapshot.totalVotes.blankNull +
      voxSnapshot.totalVotes.undecided) *
      10,
  ),
  1000,
);
assert.equal(ipespeSnapshot.registration, 'BR-00933/2026');
assert.equal(ipespeSnapshot.flavio, 52.7);
assert.equal(ipespeSnapshot.lula, 47.3);
assert.equal(ipespeSnapshot.sample, 1500);
assert.equal(ipespeSnapshot.confidence, 95.45);
assert.equal(
  ipespeSnapshot.totalVotes.flavio +
    ipespeSnapshot.totalVotes.lula +
    ipespeSnapshot.totalVotes.blankNull +
    ipespeSnapshot.totalVotes.undecided,
  101,
);
assert.equal(atlasSnapshot.registration, 'BR-03663/2026');
assert.equal(atlasSnapshot.totalVotes.other, 3.2);
assert.equal(atlasSnapshot.totalVotes.blankNull, undefined);
assert.equal(atlasSnapshot.flavio, 52.8);
assert.equal(
  parsePoderDataArticle(
    html({ ...article, headline: article.headline.replace('2º', '1º') }),
    u,
    now,
  ),
  null,
);
assert.equal(
  parsePoderDataArticle(html({ ...article, datePublished: '2026-10-09T18:00:00-03:00' }), u, now),
  null,
);
assert.equal(
  parsePoderDataArticle(
    html({ ...article, articleBody: article.articleBody.replace('votos válidos', 'votos totais') }),
    u,
    now,
  ),
  null,
);
assert.equal(
  parsePoderDataArticle(
    html({ ...article, articleBody: article.articleBody.replace('BR-08134/2026', '') }),
    u,
    now,
  ),
  null,
);
assert.equal(
  parsePoderDataArticle(
    html({ ...article, articleBody: article.articleBody.replace('53%', '52%') }),
    u,
    now,
  ),
  null,
);
assert.equal(
  parsePoderDataArticle(
    html({ ...article, articleBody: article.articleBody + ' BR-08135/2026' }),
    u,
    now,
  ),
  null,
);
assert.equal(parsePoderDataArticle(html(article), 'https://attacker.test/poderdata/x', now), null);
console.log(
  'Poll parser: URLs, dates, year, presidential scope, source encoding fields and no headline percentage inference passed.',
);
if (process.argv.includes('--live')) {
  const feed = await fetch(src.url, { signal: AbortSignal.timeout(10000) });
  assert.equal(feed.status, 200);
  const items = parseRss(await feed.text(), src);
  assert.ok(items.length > 0);
  console.log('PoderData feed HTTP200; discovered', items.length, 'publications.');
  const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
  assert.equal(r.status, 200);
  const p = parsePoderDataArticle(await r.text(), u, now);
  assert.ok(p, 'real primary article conservative adapter');
  assert.equal(p.registration, 'BR-08134/2026');
  assert.equal(p.flavio, 53);
  assert.equal(p.sample, 3000);
  console.log('Primary PoderData JSON-LD HTTP200; numeric adapter and methodology verified.');
  const q = await fetch(
    'https://quaest.com.br/wp-json/wp/v2/relatorios?search=presidente&per_page=10',
    { signal: AbortSignal.timeout(10000) },
  );
  assert.equal(q.status, 200);
  assert.ok(
    parseWordPress(await q.json(), {
      name: 'Quaest',
      url: 'https://quaest.com.br/wp-json/wp/v2/relatorios',
      domain: 'quaest.com.br',
    }).length > 0,
  );
  console.log('Quaest public WordPress HTTP200; presidential publication discovery verified.');
  const a = await fetch('https://atlasintel.org/polls/exclusive-polls', {
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(a.status, 200);
  assert.ok(
    parseAtlas(await a.text(), {
      name: 'AtlasIntel',
      url: 'https://atlasintel.org/polls/exclusive-polls',
      domain: 'atlasintel.org',
    }).length > 0,
  );
  console.log(
    'AtlasIntel official Exclusive Polls HTTP200; national presidential publication discovery verified.',
  );
}

const voxOctober18 = pollSnapshots.find((p) => p.registration === 'BR-04332/2026');
assert.equal(voxOctober18.basis, 'valid');
assert.equal(voxOctober18.flavio, 49);
assert.equal(voxOctober18.lula, 51);
assert.equal(voxOctober18.totalVotes.flavio, 44.6);
assert.equal(voxOctober18.totalVotes.lula, 46.4);
assert.equal(voxOctober18.totalVotes.other, 5);
assert.equal(voxOctober18.totalVotes.undecided, 3.9);
assert.equal(voxOctober18.registryCheckedAt, undefined);
assert.ok(voxOctober18.source.endsWith('RELATORIO-VOX-BRASIL-NACIONAL-10-2-TURNO-18-10-2026.pdf'));

for (const [registration, flavio, lula, sample, totals] of [
  [
    'BR-06715/2026',
    50.4,
    49.6,
    2000,
    { flavio: 48.3, lula: 47.5, other: 2.4, otherLabel: 'Ninguém, branco ou nulo', undecided: 1.9 },
  ],
  [
    'BR-02418/2026',
    51.1,
    48.9,
    4998,
    { flavio: 49.8, lula: 47.6, other: 2.6, otherLabel: 'Branco, nulo ou não sei' },
  ],
  ['BR-02586/2026', 52, 48, 3000, { flavio: 49, lula: 46, blankNull: 4, undecided: 2 }],
  [
    'BR-04499/2026',
    50.3,
    49.7,
    2002,
    { flavio: 46.5, lula: 45.9, other: 4.7, otherLabel: 'Nenhum, branco ou nulo', undecided: 2.9 },
  ],
]) {
  const poll = pollSnapshots.find((p) => p.registration === registration);
  assert.equal(poll.basis, 'valid');
  assert.equal(poll.flavio, flavio);
  assert.equal(poll.lula, lula);
  assert.equal(poll.sample, sample);
  assert.deepEqual(poll.totalVotes, totals);
  assert.equal(poll.registryCheckedAt, undefined);
  assert.ok(poll.source.endsWith('.pdf'));
}
assert.match(
  pollSnapshots.find((p) => p.registration === 'BR-06715/2026').note,
  /mudança na ponderação/,
);
assert.match(
  pollSnapshots.find((p) => p.registration === 'BR-04499/2026').note,
  /uma casa decimal/,
);
assert.ok(
  !pollSnapshots.some((p) => p.registration === 'BR-04454/2026'),
  'DataTrends stays a publication pending the original report',
);
