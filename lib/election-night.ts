export const SECOND_TURN_START = Date.parse('2026-10-25T17:00:00-03:00');
export function electionNightAvailable(status: string, turn: number | undefined, now = Date.now()) {
  return now >= SECOND_TURN_START && status === 'live' && turn === 2;
}
