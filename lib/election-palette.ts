import type { Candidate } from './elections';
import { candidateName } from './presentation';
export type CandidateLegend = { number: string; name: string; color: string };
/** Keep the same two comparisons across states; additional candidates remain neutral. */
export function electionPalette(
  candidates: Pick<Candidate, 'number' | 'name'>[],
): CandidateLegend[] {
  const pair = candidates.slice(0, 2);
  const includesThirteen = pair.some((candidate) => candidate.number === '13');
  return pair.map((candidate, index) => ({
    number: candidate.number,
    name: candidateName(candidate.name),
    color: includesThirteen
      ? candidate.number === '13'
        ? '#c96856'
        : '#24796d'
      : index === 0
        ? '#24796d'
        : '#c96856',
  }));
}
