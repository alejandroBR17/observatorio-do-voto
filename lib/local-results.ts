export type LocalSection = [number: string, votes: number[]];
export type VotingPlace = {
  id: string;
  number: string;
  zone: string;
  name: string;
  address: string;
  sections: LocalSection[];
};
export type Municipality = { code: string; name: string; places: VotingPlace[] };
export type LocalIndex = {
  year: number;
  turn: number;
  source: string;
  generated: string;
  importedAt: string;
  candidates: { number: string; name: string }[];
  municipalities: Municipality[];
};
export type LocalTally = {
  candidates: { number: string; name: string; votes: number; percent: number }[];
  valid: number;
  blank: number;
  nullVotes: number;
  total: number;
  sections: number;
};
export type PlaceSummary = Omit<VotingPlace, 'sections'> & { sections: string[] };
export type LocalResponse = {
  year: number;
  turn: number;
  source: string;
  generated: string;
  importedAt: string;
  municipalities?: { code: string; name: string }[];
  municipality?: { code: string; name: string };
  places?: PlaceSummary[];
  selection?: { place?: PlaceSummary; section?: string; zone?: string };
  tally?: LocalTally;
};

export const searchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

export function tallySections(
  candidates: LocalIndex['candidates'],
  sections: LocalSection[],
): LocalTally {
  const counts = Array<number>(candidates.length + 2).fill(0);
  const seen = new Set<string>();
  for (const [key, votes] of sections) {
    if (seen.has(key)) throw Error('Seção duplicada na agregação.');
    seen.add(key);
    if (votes.length !== counts.length || votes.some((v) => !Number.isSafeInteger(v) || v < 0))
      throw Error('Contagens da seção inválidas.');
    votes.forEach((v, i) => {
      counts[i] += v;
    });
  }
  const valid = counts.slice(0, candidates.length).reduce((a, b) => a + b, 0);
  const blank = counts[candidates.length],
    nullVotes = counts[candidates.length + 1];
  return {
    candidates: candidates
      .map((c, i) => ({ ...c, votes: counts[i], percent: valid ? (counts[i] * 100) / valid : 0 }))
      .sort((a, b) => b.votes - a.votes),
    valid,
    blank,
    nullVotes,
    total: valid + blank + nullVotes,
    sections: sections.length,
  };
}

export function selectLocal(
  index: LocalIndex,
  code?: string,
  placeId?: string,
  zone?: string,
  section?: string,
): LocalResponse {
  const meta = {
    year: index.year,
    turn: index.turn,
    source: index.source,
    generated: index.generated,
    importedAt: index.importedAt,
  };
  if (!code)
    return {
      ...meta,
      municipalities: index.municipalities.map(({ code, name }) => ({ code, name })),
    };
  const municipality = index.municipalities.find((m) => m.code === code);
  if (!municipality) throw Error('Município não encontrado neste estado.');
  const summaries: PlaceSummary[] = municipality.places.map(({ sections, ...p }) => ({
    ...p,
    sections: sections.map(([s]) => s),
  }));
  const places = municipality.places.filter(
    (p) => (!placeId || p.id === placeId) && (!zone || p.zone === zone),
  );
  if (!places.length) throw Error('Local ou zona não encontrado neste município.');
  if (section && !zone && !placeId) throw Error('Informe também a zona eleitoral.');
  // Zone is part of the key: different zones may reuse a section number.
  const sections: LocalSection[] = places.flatMap((p) =>
    p.sections
      .filter(([s]) => !section || s === section)
      .map(([s, votes]): LocalSection => [`${p.zone}-${s}`, votes]),
  );
  if (!sections.length) throw Error('Seção não encontrada nesta zona.');
  return {
    ...meta,
    municipality: { code: municipality.code, name: municipality.name },
    places: summaries,
    selection: {
      place: placeId ? summaries.find((p) => p.id === placeId) : undefined,
      section,
      zone,
    },
    tally: tallySections(index.candidates, sections),
  };
}
