import { normalize } from './elections';
import type { LocalIndex, LocalResponse } from './local-results';

export const secondTurnCapabilities = { places: false, sections: true, zones: true };
const BASE = 'https://resultados.tse.jus.br/oficial/ele2026/6258/dados';

export function secondTurnCatalog(index: LocalIndex): LocalResponse {
  return {
    year: 2026,
    turn: 2,
    source: 'https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6258',
    generated: '',
    importedAt: '',
    catalogSource: index.source,
    capabilities: secondTurnCapabilities,
    municipalities: index.municipalities.map(({ code, name }) => ({ code, name })),
  };
}

export function decodeSecondTurn(
  input: unknown,
  url: string,
  code: string,
  name: string,
  zone?: string,
): LocalResponse {
  const raw = input as { ele?: string; tpabr?: string; cdabr?: string; s?: { st?: string } };
  if (
    String(raw?.ele) !== '6258' ||
    raw?.tpabr !== (zone ? 'zona' : 'mu') ||
    String(raw?.cdabr) !== (zone || code)
  )
    throw Error('Arquivo do TSE incompatível com o município ou zona solicitados.');
  const result = normalize(input, url);
  if (
    result.year !== 2026 ||
    result.turn !== 2 ||
    result.candidates.length !== 2 ||
    !result.candidates.every((candidate) => ['13', '22'].includes(candidate.number))
  )
    throw Error('Resultado incompatível com o segundo turno presidencial.');
  if (result.candidates.reduce((sum, candidate) => sum + candidate.votes, 0) !== result.valid)
    throw Error('A soma dos votos não confere com a fonte.');
  const sections = raw.s?.st === undefined ? NaN : Number(raw.s.st);
  if (!Number.isSafeInteger(sections) || sections < 0)
    throw Error('Número de seções indisponível na fonte.');
  return {
    year: 2026,
    turn: 2,
    source: url,
    generated: result.generated,
    importedAt: new Date().toISOString(),
    municipality: { code, name },
    selection: zone ? { zone } : undefined,
    capabilities: secondTurnCapabilities,
    tally: {
      candidates: result.candidates.map(({ number, name, votes, percent }) => ({
        number,
        name,
        votes,
        percent,
      })),
      valid: result.valid,
      blank: result.blank,
      nullVotes: result.nullVotes,
      total: result.valid + result.blank + result.nullVotes,
      sections,
    },
  };
}

export async function fetchSecondTurn(uf: string, code: string, name: string, zone?: string) {
  const area = uf.toLowerCase();
  const url = `${BASE}/${area}/${area}${code}${zone ? `-z${zone}` : ''}-c0001-e006258-u.json`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    const error = new Error(
      response.status === 404
        ? 'Resultado não encontrado no TSE para este município ou zona.'
        : 'A fonte do segundo turno está temporariamente indisponível.',
    );
    Object.assign(error, { status: response.status === 404 ? 404 : 503 });
    throw error;
  }
  return decodeSecondTurn(await response.json(), url, code, name, zone);
}
