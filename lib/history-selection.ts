import { states, type Candidate, type Result } from './elections';

/** Aggregate only the selected region; never substitute national votes for a missing state. */
export function historySelection(data: Result[], turn: number, uf: string, region: string) {
  const expected = states.filter((state) => region === 'Brasil' || state[3] === region);
  const rows = data.filter(
    (row) =>
      row.turn === turn &&
      (uf !== 'BR'
        ? row.uf === uf
        : region === 'Brasil'
          ? row.uf === 'BR'
          : expected.some((state) => state[1] === row.uf)),
  );
  if (!rows.length) return undefined;
  const valid = rows.reduce((total, row) => total + row.valid, 0);
  const votes = new Map<string, Candidate>();
  for (const row of rows) {
    for (const candidate of row.candidates) {
      const previous = votes.get(candidate.number);
      votes.set(candidate.number, {
        ...candidate,
        votes: (previous?.votes || 0) + candidate.votes,
      });
    }
  }
  return {
    valid,
    candidates: [...votes.values()]
      .map((candidate) => ({
        ...candidate,
        percent:
          uf !== 'BR' || region === 'Brasil'
            ? candidate.percent
            : valid
              ? (100 * candidate.votes) / valid
              : 0,
      }))
      .sort((a, b) => b.votes - a.votes),
    source: rows[0].source,
    generated: rows[0].generated,
    missingStates: uf === 'BR' && region !== 'Brasil' ? expected.length - rows.length : 0,
  };
}
