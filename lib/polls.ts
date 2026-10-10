import type { Database } from './database';
import { queueContentAlerts } from './content-alerts';
export type PollSnapshot = {
  id: string;
  institute: string;
  publishedAt: string;
  fieldwork: string;
  sample: number;
  margin: number;
  confidence: number | null;
  registration: string;
  scope: string;
  turn: number;
  basis: 'valid' | 'total';
  flavio: number;
  lula: number;
  source: string;
  mode: 'snapshot' | 'automatic';
  totalVotes?: {
    flavio: number;
    lula: number;
    blankNull?: number;
    undecided?: number;
    other?: number;
  };
  note?: string;
};
export const pollSnapshots: PollSnapshot[] = [
  {
    id: 'BR-03663/2026',
    institute: 'AtlasIntel/Bloomberg',
    publishedAt: '2026-10-09T07:30:00-03:00',
    fieldwork: '3 a 8/10/2026 · recrutamento digital aleatório (Atlas RDR)',
    sample: 5026,
    margin: 1,
    confidence: 95,
    registration: 'BR-03663/2026',
    scope: 'Brasil',
    turn: 2,
    basis: 'valid',
    flavio: 52.8,
    lula: 47.2,
    source:
      'https://cdn1.atlasintel.org/pesquisa_atlas_bloomberg__nacional_261009_3da0d6d3d6d32fe1.pdf',
    mode: 'snapshot',
    totalVotes: { flavio: 51.1, lula: 45.7, other: 3.2 },
    note: 'Conferido no relatório original de 09/10: metodologia na página 5, votos totais na página 7 e válidos na página 8. Brancos, nulos e indecisos são divulgados juntos (3,2%); não foram separados por estimativa.',
  },
  {
    id: 'BR-02949/2026',
    institute: 'Datafolha',
    publishedAt: '2026-10-08T18:40:00-03:00',
    fieldwork: '6 e 7/10/2026, conforme reportagem da Folha',
    sample: 2520,
    margin: 2,
    confidence: null,
    registration: 'BR-02949/2026',
    scope: 'Brasil',
    turn: 2,
    basis: 'valid',
    flavio: 52,
    lula: 48,
    source:
      'https://www1.folha.uol.com.br/poder/2026/10/datafolha-flavio-bolsonaro-tem-52-e-lula-48-em-votos-validos-no-segundo-turno.shtml',
    mode: 'snapshot',
    totalVotes: { flavio: 49, lula: 45, blankNull: 5, undecided: 1 },
    note: 'Retrato conferido em 8/10. A Folha informa campo em 6 e 7/10; outras publicações mencionam 6 a 8/10. Confira a metodologia no registro.',
  },
  {
    id: 'BR-08134/2026',
    institute: 'PoderData/Aya',
    publishedAt: '2026-10-08T07:30:00-03:00',
    fieldwork: '5 a 7/10/2026',
    sample: 3000,
    margin: 1.8,
    confidence: 95,
    registration: 'BR-08134/2026',
    scope: 'Brasil',
    turn: 2,
    basis: 'valid',
    flavio: 53,
    lula: 47,
    source:
      'https://www.poder360.com.br/poderdata/flavio-tem-53-contra-47-de-lula-no-2o-turno-diz-poderdata-aya/',
    mode: 'snapshot',
    note: 'Telefone/URA; 705 municípios, 27 UFs. Retrato conferido em 8/10, sem atualização automática dos percentuais.',
  },
];
export type Publication = {
  institute: string;
  title: string;
  url: string;
  publishedAt: string | null;
  source: string;
  kind: 'publication';
  dateOnly?: boolean;
  publisher?: string;
};
const sources = [
  {
    name: 'Folha / Datafolha',
    url: 'https://feeds.folha.uol.com.br/poder/rss091.xml',
    format: 'rss',
    domain: 'folha.uol.com.br',
  },
  {
    name: 'G1 · pesquisas',
    url: 'https://g1.globo.com/rss/g1/politica/',
    format: 'rss',
    domain: 'g1.globo.com',
  },
  {
    name: 'PoderData',
    url: 'https://www.poder360.com.br/category/poderdata/feed/',
    format: 'rss',
    domain: 'poder360.com.br',
  },
  {
    name: 'Quaest',
    url: 'https://quaest.com.br/wp-json/wp/v2/relatorios?search=presidente&per_page=10',
    format: 'wp',
    domain: 'quaest.com.br',
  },
  {
    name: 'AtlasIntel',
    url: 'https://atlasintel.org/polls/exclusive-polls',
    format: 'atlas',
    domain: 'atlasintel.org',
  },
];
export function plainText(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, v) =>
      String.fromCodePoint(
        Math.min(0x10ffff, v[0].toLowerCase() === 'x' ? parseInt(v.slice(1), 16) : Number(v)),
      ),
    )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function safeUrl(value: string, domain: string) {
  try {
    const u = new URL(plainText(value));
    return u.protocol === 'https:' && (u.hostname === domain || u.hostname.endsWith('.' + domain))
      ? u.href
      : null;
  } catch {
    return null;
  }
}
function date(value: unknown) {
  if (typeof value !== 'string') return null;
  const n = Date.parse(value);
  return Number.isFinite(n) ? new Date(n).toISOString() : null;
}
function institute(title: string, fallback: string) {
  return /datafolha/i.test(title)
    ? 'Datafolha'
    : /poderdata/i.test(title)
      ? 'PoderData/Aya'
      : /quaest/i.test(title)
        ? 'Quaest'
        : /atlas/i.test(title)
          ? 'AtlasIntel'
          : fallback;
}
export function parseRss(
  xml: string,
  source: { name: string; url: string; domain: string },
): Publication[] {
  const out: Publication[] = [];
  for (const block of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const part = block[1],
      get = (tag: string) =>
        part.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] || '';
    const title = plainText(get('title')),
      url = safeUrl(get('link'), source.domain),
      publishedAt = date(plainText(get('pubDate')));
    if (
      !url ||
      !publishedAt ||
      !/^2026-/.test(publishedAt) ||
      !/datafolha|poderdata|quaest|atlasintel/i.test(title) ||
      !/lula|fl[aá]vio|presiden/i.test(title)
    )
      continue;
    out.push({
      institute: institute(title, source.name),
      title: title.slice(0, 240),
      url,
      publishedAt,
      source: source.url,
      kind: 'publication',
      publisher: source.name === 'G1 · pesquisas' ? 'G1' : undefined,
    });
  }
  return out.slice(0, 20);
}
export function parseWordPress(
  data: unknown,
  source: { name: string; url: string; domain: string },
): Publication[] {
  if (!Array.isArray(data)) return [];
  return data
    .flatMap((p: any) => {
      const title = plainText(p?.title?.rendered || ''),
        url = safeUrl(p?.link || '', source.domain),
        publishedAt = date(p?.date_gmt ? `${p.date_gmt}Z` : p?.date);
      return url && publishedAt && /^2026-/.test(publishedAt) && /presiden/i.test(title)
        ? [
            {
              institute: source.name,
              title: title.slice(0, 240),
              url,
              publishedAt,
              source: source.url,
              kind: 'publication' as const,
            },
          ]
        : [];
    })
    .slice(0, 20);
}
export function parseAtlas(
  html: string,
  source: { name: string; url: string; domain: string },
): Publication[] {
  const found = new Map<string, Publication>();
  for (const m of html.matchAll(
    /(?:href=["']|https:\/\/atlasintel\.org)(\/poll\/brazil-national-(2026-\d{2}-\d{2}))["']/g,
  )) {
    const url = safeUrl(`https://atlasintel.org${m[1]}`, source.domain);
    if (url)
      found.set(url, {
        institute: 'AtlasIntel',
        title: `Pesquisa nacional AtlasIntel · ${m[2]}`,
        url,
        publishedAt: date(m[2] + 'T00:00:00-03:00'),
        source: source.url,
        kind: 'publication',
        dateOnly: true,
      });
  }
  return [...found.values()].slice(0, 20);
}
// Deliberately narrow adapter: primary PoderData article JSON-LD, explicit valid-vote
// pair in its opening paragraph, methodology and BR registration are all required.
export function parsePoderDataArticle(
  html: string,
  url: string,
  now = Date.now(),
): PollSnapshot | null {
  if (!safeUrl(url, 'poder360.com.br') || !new URL(url).pathname.startsWith('/poderdata/'))
    return null;
  for (const block of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    let data: any;
    try {
      data = JSON.parse(block[1]);
    } catch {
      continue;
    }
    const nodes = Array.isArray(data) ? data : data['@graph'] || [data];
    for (const a of nodes) {
      const type = Array.isArray(a['@type']) ? a['@type'] : [a['@type']];
      if (!type.some((x: string) => /Article$/.test(x || '')) || typeof a.articleBody !== 'string')
        continue;
      const title = plainText(a.headline || ''),
        publishedAt = date(a.datePublished),
        body = plainText(a.articleBody),
        intro = plainText(a.articleBody.split(/\r?\n\s*\r?\n/)[0]);
      const pair = title.match(
        /^Fl[aá]vio(?: Bolsonaro)? tem (\d+(?:[,.]\d+)?)% contra (\d+(?:[,.]\d+)?)% de Lula no 2[ºo°] turno, diz (?:pesquisa )?PoderData/i,
      );
      if (
        !pair ||
        !publishedAt ||
        !publishedAt.startsWith('2026-') ||
        Date.parse(publishedAt) > now + 300000 ||
        !/Presid[eê]ncia da Rep[uú]blica/i.test(intro) ||
        !/Fl[aá]vio Bolsonaro/.test(intro) ||
        !/Lula/.test(intro) ||
        !/2[ºo°] turno/.test(intro) ||
        /votos totais|rejei[cç][aã]o|expectativa de vit[oó]ria/i.test(intro)
      )
        continue;
      const flavio = Number(pair[1].replace(',', '.')),
        lula = Number(pair[2].replace(',', '.'));
      if (Math.abs(flavio + lula - 100) > 0.11 || flavio < 0 || lula < 0) continue;
      const bodyPair = intro.match(
        /(?:congressista|senador|Fl[aá]vio(?: Bolsonaro)?) tem (\d+(?:[,.]\d+)?)% dos votos v[aá]lidos, (?:ante|contra) (\d+(?:[,.]\d+)?)% (?:do petista|de Lula)/i,
      );
      if (
        !bodyPair ||
        Number(bodyPair[1].replace(',', '.')) !== flavio ||
        Number(bodyPair[2].replace(',', '.')) !== lula
      )
        continue;
      const registrations = [...new Set(body.match(/BR-\d{5}\/2026/g) || [])],
        sample = body.match(/Foram ([\d.]+) entrevistas/i),
        margin = body.match(/margem de erro [ée] de (\d+(?:[,.]\d+)?) ponto/i),
        confidence = body.match(/intervalo de confian[cç]a [ée] de (\d+)%/i),
        fieldwork = body.match(
          /(?:levantamento|pesquisa)[\s\S]{0,45}?(?:realizad[oa]|feita) de (\d{1,2}) a (\d{1,2}) de ([a-zç]+)(?: de (2026))?/i,
        );
      if (
        registrations.length !== 1 ||
        !sample ||
        !margin ||
        !fieldwork ||
        !/27 unidades da Federa[cç][aã]o/.test(body)
      )
        continue;
      const sampleN = Number(sample[1].replace(/\./g, '')),
        marginN = Number(margin[1].replace(',', '.'));
      if (sampleN < 100 || sampleN > 1000000 || marginN <= 0 || marginN > 10) continue;
      return {
        id: registrations[0],
        institute: 'PoderData/Aya',
        publishedAt,
        fieldwork: `${fieldwork[1]} a ${fieldwork[2]} de ${fieldwork[3]} de 2026`,
        sample: sampleN,
        margin: marginN,
        confidence: confidence ? Number(confidence[1]) : null,
        registration: registrations[0],
        scope: 'Brasil',
        turn: 2,
        basis: 'valid',
        flavio,
        lula,
        source: url,
        mode: 'automatic',
        note: 'Extração automática conservadora da publicação primária PoderData. Registro informado pelo instituto; não representa validação do TSE nem previsão.',
      };
    }
  }
  return null;
}
let temporaryCache: { value: string; updated: number } | null = null;
let temporaryRequest: Promise<any> | undefined;
export function polls(db?: Database): Promise<any> {
  if (db) return collectPolls(db).catch(() => polls());
  if (temporaryRequest) return temporaryRequest;
  const pending = collectPolls();
  temporaryRequest = pending;
  void pending
    .finally(() => {
      if (temporaryRequest === pending) temporaryRequest = undefined;
    })
    .catch(() => {});
  return pending;
}
async function collectPolls(db?: Database) {
  const key = 'polls:publications:v3';
  const stored = db
    ? await db
        .prepare('SELECT value, updated FROM cache WHERE key=?')
        .bind(key)
        .first<{ value: string; updated: number }>()
    : temporaryCache;
  const previous =
    stored ||
    (db
      ? await db
          .prepare('SELECT value, updated FROM cache WHERE key=?')
          .bind('polls:publications:v2')
          .first<{ value: string; updated: number }>()
      : null);
  if (stored && Date.now() - stored.updated < 300000)
    return { ...JSON.parse(stored.value), cached: true, cacheStorage: db ? 'shared' : 'temporary' };
  const lease = db
    ? await db
        .prepare(
          'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET updated=excluded.updated WHERE cache.updated<?',
        )
        .bind('lease:polls:v3', '', Date.now(), Date.now() - 30000)
        .run()
    : { meta: { changes: 1 } };
  if (!lease.meta.changes)
    return previous
      ? { ...JSON.parse(previous.value), cached: true, stale: true }
      : {
          status: 'loading',
          checkedAt: null,
          cacheSeconds: 300,
          polls: pollSnapshots,
          publications: [],
          sources: [],
          notice:
            'Consultando as fontes públicas. Resultados conferidos em 08 e 09/10; a data de publicação aparece em cada pesquisa.',
          registrationSource: 'https://pesqele-divulgacao.tse.jus.br/',
        };
  const checkedAt = new Date().toISOString();
  const results = await Promise.all(
    sources.map(async (s) => {
      try {
        const response = await fetch(s.url, {
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
          headers: {
            Accept:
              s.format === 'wp'
                ? 'application/json'
                : 'application/rss+xml, text/html;q=0.9, */*;q=0.5',
          },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length > 2000000) throw new Error('Resposta excede limite');
        const declaration = new TextDecoder().decode(bytes.slice(0, 300));
        const encoding =
          /charset\s*=\s*iso-8859-1/i.test(response.headers.get('content-type') || '') ||
          /encoding=["']iso-8859-1/i.test(declaration)
            ? 'iso-8859-1'
            : 'utf-8';
        const text = new TextDecoder(encoding).decode(bytes);
        const items =
          s.format === 'wp'
            ? parseWordPress(JSON.parse(text), s)
            : s.format === 'atlas'
              ? parseAtlas(text, s)
              : parseRss(text, s);
        return {
          name: s.name,
          url: s.url,
          status: items.length ? 'ok' : 'empty',
          checkedAt,
          count: items.length,
          items,
        };
      } catch {
        return {
          name: s.name,
          url: s.url,
          status: 'unavailable',
          checkedAt,
          count: 0,
          items: [] as Publication[],
        };
      }
    }),
  );
  const current: Publication[] = results.flatMap((s) => s.items);
  for (const p of pollSnapshots)
    if (
      !current.some(
        (item) =>
          item.institute.startsWith(p.institute.split('/')[0]) &&
          item.publishedAt?.slice(0, 10) === p.publishedAt.slice(0, 10),
      )
    )
      current.push({
        institute: p.institute,
        title: `${p.institute}: intenção de voto no segundo turno presidencial`,
        url: p.source,
        publishedAt: p.publishedAt,
        source: p.source,
        kind: 'publication',
        dateOnly: true,
      });
  const staleItems = previous ? JSON.parse(previous.value).publications || [] : [];
  const fallback = staleItems
    .filter((p: Publication) =>
      results.some((s) => s.url === p.source && s.status === 'unavailable'),
    )
    .map((p: Publication) => ({ ...p, stale: true }));
  const publications = [...new Map([...current, ...fallback].map((p) => [p.url, p])).values()]
    .sort((a: any, b: any) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
    .slice(0, 40);
  const priorPolls: PollSnapshot[] = previous ? JSON.parse(previous.value).polls || [] : [];
  const known = new Set(priorPolls.filter((p) => p.mode === 'automatic').map((p) => p.source));
  const eligible = publications
    .filter(
      (p) =>
        p.institute === 'PoderData/Aya' &&
        !known.has(p.url) &&
        /^Fl[aá]vio.*tem.*contra.*de Lula no 2[ºo°] turno, diz/i.test(p.title) &&
        p.publishedAt &&
        Date.parse(p.publishedAt) <= Date.now() + 300000,
    )
    .slice(0, 3);
  const extracted = await Promise.all(
    eligible.map(async (p) => {
      try {
        const r = await fetch(p.url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
        if (!r.ok) return null;
        const html = await r.text();
        if (html.length > 2000000) return null;
        return parsePoderDataArticle(html, p.url);
      } catch {
        return null;
      }
    }),
  );
  const numeric = [
    ...new Map(
      [
        ...pollSnapshots,
        ...priorPolls.filter((p) => p.mode === 'automatic'),
        ...extracted.filter((p): p is PollSnapshot => !!p),
      ].map((p) => [p.id, p]),
    ).values(),
  ].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const payload = {
    status: results.some((s) => s.status === 'ok') ? 'ready' : 'unavailable',
    checkedAt,
    latestPublishedAt: numeric[0]?.publishedAt || null,
    cacheSeconds: 300,
    cacheStorage: db ? 'shared' : 'temporary',
    polls: numeric,
    publications,
    sources: results.map((source) => {
      const { items: _items, ...metadata } = source;
      return metadata;
    }),
    notice:
      'Fontes consultadas a cada 5 minutos com o app em uso. A data da consulta não é a data de uma nova pesquisa. PoderData: percentuais extraídos quando cenário e metodologia são inequívocos. Datafolha e AtlasIntel: retratos conferidos em 08 e 09/10. As novas publicações dos institutos são descobertas automaticamente; números sem validação permanecem apenas como links. Não há previsão de vencedor nem média automática.',
    registrationSource: 'https://pesqele-divulgacao.tse.jus.br/',
  };
  temporaryCache = { value: JSON.stringify(payload), updated: Date.now() };
  if (db) {
    await db
      .prepare(
        'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated',
      )
      .bind(key, temporaryCache.value, temporaryCache.updated)
      .run();
    await queueContentAlerts(db, payload, previous ? JSON.parse(previous.value) : null, 'polls');
  }
  return payload;
}
