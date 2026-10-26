import type { LocalResponse } from './local-results';

// Restricted reader for the BU envelope and presidential fields of the TSE ASN.1 v2 layout.
// Unknown layouts fail closed; no search for candidate numbers inside arbitrary bytes.
type Node = { tag: number; bytes: Uint8Array; children: Node[] };
function nodes(bytes: Uint8Array, depth = 0): Node[] {
  if (depth > 24 || bytes.length > 2_000_000) throw Error('Boletim fora dos limites de leitura.');
  const output: Node[] = [];
  let at = 0;
  while (at < bytes.length) {
    const tag = bytes[at++];
    if ((tag & 31) === 31 || at >= bytes.length) throw Error('Estrutura do boletim inválida.');
    let length = bytes[at++];
    if (length & 128) {
      const size = length & 127;
      if (!size || size > 4 || at + size > bytes.length) throw Error('Comprimento inválido.');
      length = 0;
      for (let i = 0; i < size; i++) length = length * 256 + bytes[at++];
    }
    if (at + length > bytes.length) throw Error('Boletim incompleto.');
    const value = bytes.subarray(at, at + length);
    at += length;
    output.push({ tag, bytes: value, children: tag & 32 ? nodes(value, depth + 1) : [] });
    if (output.length > 10000) throw Error('Boletim fora dos limites de leitura.');
  }
  return output;
}
function sequence(node: Node | undefined, tag = 48): Node[] {
  if (!node || node.tag !== tag) throw Error('Leiaute do boletim não reconhecido.');
  return node.children;
}
function integer(node: Node | undefined, tag = 2): number {
  if (
    !node ||
    node.tag !== tag ||
    !node.bytes.length ||
    node.bytes.length > 4 ||
    node.bytes[0] & 128
  )
    throw Error('Campo numérico inválido no boletim.');
  return node.bytes.reduce((value, byte) => value * 256 + byte, 0);
}
function header(node: Node | undefined) {
  const fields = sequence(node);
  if (integer(fields[1], 130) !== 3221)
    throw Error('O boletim não pertence ao segundo turno de 2026.');
}
function identity(node: Node | undefined, code: string, zone: string, section: string, tag = 48) {
  const fields = sequence(node, tag);
  const area = sequence(fields[0]);
  if (
    integer(area[0]) !== Number(code) ||
    integer(area[1]) !== Number(zone) ||
    integer(fields[2]) !== Number(section)
  )
    throw Error('O boletim pertence a outra seção eleitoral.');
  return integer(fields[1]);
}

export function decodeSectionBallot(
  bytes: Uint8Array,
  code: string,
  zone: string,
  section: string,
) {
  const roots = nodes(bytes);
  if (roots.length !== 1) throw Error('Envelope do boletim inválido.');
  const envelope = sequence(roots[0]);
  header(envelope[0]);
  if (
    integer(envelope[1], 10) !== 2 ||
    integer(envelope[3], 10) !== 1 ||
    envelope[4]?.tag !== 4 ||
    envelope.length !== 5
  )
    throw Error('O arquivo não é um boletim oficial compatível.');
  const envelopePlace = identity(envelope[2], code, zone, section, 160);
  const content = nodes(envelope[4].bytes);
  if (content.length !== 1) throw Error('Conteúdo do boletim inválido.');
  const ballot = sequence(content[0]);
  header(ballot[0]);
  if (integer(ballot[1], 10) !== 2) throw Error('Boletim de simulação não permitido.');
  const placeNumber = identity(ballot[3], code, zone, section);
  if (placeNumber !== envelopePlace) throw Error('Identificação inconsistente no boletim.');
  if (ballot[4]?.tag !== 27) throw Error('Data de emissão indisponível.');
  const emitted = new TextDecoder().decode(ballot[4].bytes);
  if (!/^20261025T\d{6}$/.test(emitted)) throw Error('Data de emissão incompatível com o turno.');
  const attendance = integer(ballot[6]);
  const resultAt = ballot[7]?.tag === 161 ? 8 : 7;
  const elections = sequence(ballot[resultAt]);
  const presidential = elections
    .map((entry) => sequence(entry))
    .filter((entry) => integer(entry[0]) === 6258);
  if (presidential.length !== 1) throw Error('Eleição presidencial ausente ou duplicada.');
  const election = presidential[0];
  const eligible = integer(election[1]);
  if (integer(election[2]) + integer(election[3]) !== eligible || attendance > eligible)
    throw Error('Comparecimento inconsistente.');
  const results = sequence(election[4]);
  if (results.length !== 1) throw Error('Resultado presidencial incompatível.');
  const result = sequence(results[0]);
  if (integer(result[0], 10) !== 1 || integer(result[1]) !== attendance)
    throw Error('Comparecimento presidencial inconsistente.');
  const offices = sequence(result[2]);
  if (offices.length !== 1) throw Error('Cargo presidencial ausente ou duplicado.');
  const office = sequence(offices[0]);
  if (integer(office[0], 129) !== 1) throw Error('Cargo diferente de presidente.');
  const counts: Record<string, number> = { '13': 0, '22': 0, blank: 0, null: 0 };
  const seen = new Set<string>();
  for (const entry of sequence(office[2])) {
    const vote = sequence(entry);
    const type = integer(vote[0], 129);
    const amount = integer(vote[1], 130);
    let key: string;
    if (type === 1) {
      const candidate = sequence(vote[2], 163);
      key = String(integer(candidate[1]));
      if (!['13', '22'].includes(key) || integer(candidate[0]) !== Number(key))
        throw Error('Candidatura incompatível com este turno.');
    } else {
      if (![2, 3].includes(type) || vote.some((field) => field.tag === 163))
        throw Error('Tipo de voto não reconhecido.');
      key = type === 2 ? 'blank' : 'null';
    }
    if (seen.has(key)) throw Error('Contagem duplicada no boletim.');
    seen.add(key);
    counts[key] = amount;
  }
  if (Object.values(counts).reduce((a, b) => a + b, 0) !== attendance)
    throw Error('A soma dos votos não confere com o comparecimento.');
  return { counts, attendance, eligible, placeNumber: String(placeNumber), emitted };
}

type Section = { ns: string; nsp?: string; nsa?: string[] };
type SectionCatalog = {
  f: string;
  cdp: string;
  abr: { cd: string; mu: { cd: string; zon: { cd: string; sec: Section[] }[] }[] }[];
};
const BASE = 'https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3221';
const cache = new Map<string, { expires: number; value: Promise<SectionCatalog> }>();
async function official(url: string, maxBytes: number) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok)
    throw Object.assign(
      Error(
        response.status === 404
          ? 'Arquivo desta seção ainda não disponível no TSE.'
          : 'Fonte da seção temporariamente indisponível.',
      ),
      { status: response.status === 404 ? 404 : 503 },
    );
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > maxBytes) throw Error('Arquivo da seção excede o limite de leitura.');
  return bytes;
}
async function catalog(uf: string) {
  const key = uf.toLowerCase();
  const previous = cache.get(key);
  if (previous && previous.expires > Date.now()) return previous.value;
  const value = official(`${BASE}/config/${key}/${key}-p003221-cs.json`, 20_000_000).then(
    (bytes) => JSON.parse(new TextDecoder().decode(bytes)) as SectionCatalog,
  );
  cache.set(key, { expires: Date.now() + 300000, value });
  if (cache.size > 3) cache.delete(cache.keys().next().value!);
  try {
    return await value;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}

export async function fetchSectionBallot(
  uf: string,
  code: string,
  name: string,
  zone: string,
  requested: string,
): Promise<LocalResponse> {
  const index = await catalog(uf);
  if (index.f.toLowerCase() !== 'o' || String(index.cdp) !== '3221')
    throw Error('Catálogo de seções incompatível com o turno.');
  const sections = index.abr
    .find((area) => area.cd.toUpperCase() === uf)
    ?.mu.find((city) => city.cd === code)
    ?.zon.find((item) => item.cd === zone)?.sec;
  const entry = sections?.find((item) => item.ns === requested);
  if (!entry)
    throw Object.assign(Error('Seção não encontrada neste município e zona no segundo turno.'), {
      status: 404,
    });
  const principal = entry.nsp || requested;
  if (!/^\d{4}$/.test(principal) || !sections?.some((item) => item.ns === principal && !item.nsp))
    throw Error('Seção principal não encontrada no catálogo.');
  const root = `${BASE}/dados/${uf.toLowerCase()}/${code}/${zone}/${principal}`;
  const auxSource = `${root}/p003221-${uf.toLowerCase()}-m${code}-z${zone}-s${principal}-aux.json`;
  const aux = JSON.parse(new TextDecoder().decode(await official(auxSource, 100000))) as {
    f: string;
    st: string;
    hashes: { hash: string; st: string; arq: { nm: string; tp: string }[] }[];
  };
  if (aux.f.toLowerCase() !== 'o' || !['Recebida', 'Totalizada'].includes(aux.st))
    throw Error('Seção sem boletim recebido ou totalizado disponível.');
  const totalized = aux.hashes.filter((hash) => hash.st === 'Totalizado');
  const accepted = totalized.length
    ? totalized
    : aux.hashes.filter((hash) => hash.st === 'Recebido');
  if (accepted.length !== 1)
    throw Error('Há mais de um boletim sem versão totalizada inequívoca. Consulte a fonte.');
  const hash = accepted[0];
  const files = hash.arq.filter((file) => file.tp === 'bu');
  if (
    files.length !== 1 ||
    !/^[a-fA-F0-9]{32,256}$/.test(hash.hash) ||
    files[0].nm !== `o03221${uf.toLowerCase()}${code}${zone}${principal}-bu.dat`
  )
    throw Error('Referência de boletim não reconhecida.');
  const source = `${root}/${hash.hash}/${files[0].nm}`;
  const parsed = decodeSectionBallot(await official(source, 2_000_000), code, zone, principal);
  const valid = parsed.counts['13'] + parsed.counts['22'];
  const emitted = parsed.emitted;
  return {
    year: 2026,
    turn: 2,
    source,
    generated: `${emitted.slice(6, 8)}/${emitted.slice(4, 6)}/${emitted.slice(0, 4)} ${emitted.slice(9, 11)}:${emitted.slice(11, 13)}:${emitted.slice(13, 15)} (hora da urna)`,
    importedAt: new Date().toISOString(),
    municipality: { code, name },
    selection: { zone, section: requested },
    capabilities: { places: false, sections: true, zones: true },
    ballot: {
      principal,
      aggregated: sections!.filter((item) => item.nsp === principal).map((item) => item.ns),
      placeNumber: parsed.placeNumber,
      status: aux.st,
      auxSource,
    },
    tally: {
      candidates: [
        { number: '13', name: 'Lula' },
        { number: '22', name: 'Flávio Bolsonaro' },
      ].map((candidate) => ({
        ...candidate,
        votes: parsed.counts[candidate.number],
        percent: valid ? (parsed.counts[candidate.number] * 100) / valid : 0,
      })),
      valid,
      blank: parsed.counts.blank,
      nullVotes: parsed.counts.null,
      total: parsed.attendance,
      sections: 1,
    },
  };
}
