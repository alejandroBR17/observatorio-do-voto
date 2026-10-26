import { states, type Result } from './elections';
import { historySelection } from './history-selection';

export function comparisonSelection(
  data: Result[],
  year: number,
  turn: number,
  uf: string,
  region: string,
) {
  const relevant = data.filter((row) => row.year === year && row.turn === turn && row.final);
  const result = historySelection(relevant, turn, uf, region);
  if (!result || result.missingStates > 0 || result.valid <= 0) return undefined;
  const pt = result.candidates.find((candidate) => candidate.party === 'PT');
  const pair = result.candidates.slice(0, 2);
  return {
    ...result,
    year,
    turn,
    pt,
    margin:
      pair.length === 2 && turn === 2 ? Math.abs(pair[0].percent - pair[1].percent) : undefined,
  };
}

export function stateSwings(current: Result[], historical: Result[], year: number, region: string) {
  return states
    .filter((state) => region === 'Brasil' || state[3] === region)
    .map((state) => {
      const now = comparisonSelection(current, 2026, 2, state[1], 'Brasil');
      const before = comparisonSelection(historical, year, 2, state[1], 'Brasil');
      return {
        uf: state[1],
        name: state[2],
        now,
        before,
        delta: now?.pt && before?.pt ? now.pt.percent - before.pt.percent : undefined,
      };
    })
    .sort(
      (a, b) =>
        Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0) || a.name.localeCompare(b.name, 'pt-BR'),
    );
}
