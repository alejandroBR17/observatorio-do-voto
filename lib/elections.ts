export const num = (value: unknown) => Number(String(value ?? 0).replace(',', '.'));
export type Candidate = {
  number: string;
  name: string;
  party: string;
  votes: number;
  percent: number;
  status: string;
  elected: boolean;
  photo?: string;
};
export type Result = {
  year: number;
  turn: number;
  uf: string;
  source: string;
  generated: string;
  id: string;
  counted: number;
  electorate: number;
  remaining: number;
  turnout: number;
  abstention: number;
  blank: number;
  nullVotes: number;
  valid: number;
  candidates: Candidate[];
  final: boolean;
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Estrutura do arquivo eleitoral inválida.');
  return value as Record<string, unknown>;
}

function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error('Lista eleitoral inválida.');
  return value.map(record);
}

// Missing counts must never become zero: remaining electorate bounds victory calls.
function statistic(value: unknown, percent = false): number {
  if (
    !['string', 'number'].includes(typeof value) ||
    String(value).trim() === '' ||
    !Number.isFinite(num(value)) ||
    num(value) < 0 ||
    (percent ? num(value) > 100 : !Number.isSafeInteger(num(value)))
  )
    throw new Error('Arquivo incompleto ou estatísticas inválidas.');
  return num(value);
}

export function normalize(input: unknown, source: string, year = 2026): Result {
  const raw = record(input);
  const offices = records(raw.carg);
  const office = offices[0];
  if (raw.f !== 'o' || String(office?.cd) !== '1' || !['1', '2'].includes(String(raw.t)))
    throw new Error('Arquivo não oficial ou cargo inesperado.');
  const electorateData = record(raw.e);
  const votesData = record(raw.v);
  const sections = record(raw.s);
  const electorate = statistic(electorateData.te);
  const remaining = statistic(electorateData.esnt);
  const valid = statistic(votesData.vv);
  const counted = statistic(sections.pstn ?? sections.pst, true);
  if (remaining > electorate || valid > electorate)
    throw new Error('Estatísticas fora dos limites.');
  const candidates: Candidate[] = records(office.agr)
    .flatMap((a) =>
      records(a.par).flatMap((p) =>
        (p.cand === undefined ? [] : records(p.cand)).map((c) => ({
          number: String(c.n),
          name: String(c.nmu || c.nm || ''),
          party: String(p.sg || ''),
          votes: statistic(c.vap),
          percent: statistic(c.pvapn ?? c.pvap, true),
          status: String(c.st || ''),
          elected: c.e === 's' && /eleit/i.test(String(c.st)),
          photo: `https://resultados.tse.jus.br/oficial/ele${year}/${raw.ele}/fotos/br/${c.sqcand}.jpeg`,
        })),
      ),
    )
    .sort((a: Candidate, b: Candidate) => b.votes - a.votes);
  if (candidates.some((c) => !c.name || !c.party || c.votes > valid))
    throw new Error('Votação inválida.');
  return {
    year,
    turn: num(raw.t),
    uf: String(raw.cdabr).toUpperCase(),
    source,
    generated: `${raw.dg} ${raw.hg} (Brasília)`,
    id: String(raw.idg),
    counted,
    electorate,
    remaining,
    turnout: statistic(electorateData.c),
    abstention: statistic(electorateData.pan ?? electorateData.pa, true),
    blank: statistic(votesData.vb),
    nullVotes: statistic(votesData.tvn),
    valid,
    candidates,
    final: raw.and === 'f',
  };
}
export function victory(result: Result) {
  const sorted = [...result.candidates].sort((a, b) => b.votes - a.votes);
  if (result.turn !== 2 || sorted.length !== 2)
    return { kind: 'waiting', message: 'Definição de vitória disponível apenas no segundo turno.' };
  const elected = sorted.find((c) => c.elected);
  if (elected) return { kind: 'official', message: `${elected.name}: eleito conforme o TSE.` };
  if (sorted[0].votes - sorted[1].votes > result.remaining)
    return {
      kind: 'mathematical',
      message: `Vantagem numericamente irreversível de ${sorted[0].name}, condicionada aos dados atuais. Aguardando confirmação do TSE.`,
    };
  return {
    kind: 'partial',
    message: 'Resultado em aberto. A ordem de apuração não é uma amostra aleatória.',
  };
}
export const states = [
  ['11', 'RO', 'Rondônia', 'Norte'],
  ['12', 'AC', 'Acre', 'Norte'],
  ['13', 'AM', 'Amazonas', 'Norte'],
  ['14', 'RR', 'Roraima', 'Norte'],
  ['15', 'PA', 'Pará', 'Norte'],
  ['16', 'AP', 'Amapá', 'Norte'],
  ['17', 'TO', 'Tocantins', 'Norte'],
  ['21', 'MA', 'Maranhão', 'Nordeste'],
  ['22', 'PI', 'Piauí', 'Nordeste'],
  ['23', 'CE', 'Ceará', 'Nordeste'],
  ['24', 'RN', 'Rio Grande do Norte', 'Nordeste'],
  ['25', 'PB', 'Paraíba', 'Nordeste'],
  ['26', 'PE', 'Pernambuco', 'Nordeste'],
  ['27', 'AL', 'Alagoas', 'Nordeste'],
  ['28', 'SE', 'Sergipe', 'Nordeste'],
  ['29', 'BA', 'Bahia', 'Nordeste'],
  ['31', 'MG', 'Minas Gerais', 'Sudeste'],
  ['32', 'ES', 'Espírito Santo', 'Sudeste'],
  ['33', 'RJ', 'Rio de Janeiro', 'Sudeste'],
  ['35', 'SP', 'São Paulo', 'Sudeste'],
  ['41', 'PR', 'Paraná', 'Sul'],
  ['42', 'SC', 'Santa Catarina', 'Sul'],
  ['43', 'RS', 'Rio Grande do Sul', 'Sul'],
  ['50', 'MS', 'Mato Grosso do Sul', 'Centro-Oeste'],
  ['51', 'MT', 'Mato Grosso', 'Centro-Oeste'],
  ['52', 'GO', 'Goiás', 'Centro-Oeste'],
  ['53', 'DF', 'Distrito Federal', 'Centro-Oeste'],
];
