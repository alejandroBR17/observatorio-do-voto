import type { Result } from './elections';

/** A waiting second turn must never fall back to first-turn or historical votes. */
export function overviewResults(
  year: number,
  turn: number,
  firstTurn: Result[],
  live: Result[],
  archive: Result[],
): Result[] {
  const source = year === 2026 ? (turn === 2 ? live : firstTurn) : archive;
  return source.filter((result) => result.year === year && result.turn === turn);
}
