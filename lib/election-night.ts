import type { Result } from './elections';

export const SECOND_TURN_START = Date.parse('2026-10-25T17:00:00-03:00');
export function electionNightAvailable(status: string, turn: number | undefined, now = Date.now()) {
  return now >= SECOND_TURN_START && status === 'live' && turn === 2;
}

/** A missing or stale state must never display national votes under its name. */
export function nightResult(national: Result, states: Result[], uf: string) {
  return uf === 'BR'
    ? national
    : states.find(
        (row) => row.uf === uf && row.year === national.year && row.turn === national.turn,
      );
}
