export type PollBasis = 'valid' | 'total';
type Numbers = { flavio: number; lula: number };
export function pollNumbers(
  poll: Numbers & { basis: string; totalVotes?: Numbers },
  basis: PollBasis,
): Numbers | null {
  if (poll.basis === basis) return { flavio: poll.flavio, lula: poll.lula };
  if (basis === 'total' && poll.totalVotes)
    return { flavio: poll.totalVotes.flavio, lula: poll.totalVotes.lula };
  return null; // Never reconstruct or relabel a basis the source did not publish.
}
export function transferScenario(
  a: number,
  b: number,
  others: number,
  toA: number,
  excluded: number,
) {
  const moving = Math.max(0, others) * (1 - excluded / 100),
    aVotes = a + (moving * toA) / 100,
    bVotes = b + moving * (1 - toA / 100);
  return {
    aVotes,
    bVotes,
    excluded: (Math.max(0, others) * excluded) / 100,
    aPercent: (100 * aVotes) / Math.max(1, aVotes + bVotes),
    bPercent: (100 * bVotes) / Math.max(1, aVotes + bVotes),
    aShare: ((100 - excluded) * toA) / 100,
    bShare: ((100 - excluded) * (100 - toA)) / 100,
  };
}
