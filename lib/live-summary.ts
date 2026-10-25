import type { Result } from './elections';

export function currentLiveResult(live: { result?: Result; lastGood?: Result }, uf: string) {
  return [live.result, live.lastGood].find(
    (row) => row?.year === 2026 && row.turn === 2 && row.uf === uf,
  );
}

export function liveMargin(result: Result) {
  const sorted = [...result.candidates].sort((a, b) => b.votes - a.votes);
  if (result.valid <= 0 || sorted.length < 2) return null;
  const [leader, runnerUp] = sorted;
  return {
    leader,
    votes: leader.votes - runnerUp.votes,
    points: Math.abs(leader.percent - runnerUp.percent),
  };
}
