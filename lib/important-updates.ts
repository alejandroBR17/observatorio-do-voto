import type { PollResponse } from './polls/types';
import type { UpdateItem } from './recent-updates';
export type ImportantLive = {
  status?: string;
  stale?: boolean;
  checkedAt?: string;
  result?: { uf: string; turn: number; year: number };
  victory?: { kind?: string };
};

/** Only confirmed numeric polls and national second-turn milestones; never the news feed. */
export function importantUpdates(
  polls: Partial<PollResponse> | null,
  live: ImportantLive,
  now = Date.now(),
): UpdateItem[] {
  const seen = new Set<string>();
  const result: UpdateItem[] = [];
  for (const poll of polls?.polls || []) {
    if (
      seen.has(poll.id) ||
      !poll.id ||
      poll.turn !== 2 ||
      !Number.isFinite(Date.parse(poll.publishedAt)) ||
      Date.parse(poll.publishedAt) > now + 300000
    )
      continue;
    seen.add(poll.id);
    result.push({
      id: 'result:' + poll.id,
      title: poll.institute,
      date: poll.publishedAt,
      destination: 'polls',
      kind: 'Pesquisa',
    });
  }
  result.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  if (
    live.status === 'live' &&
    !live.stale &&
    live.result?.uf === 'BR' &&
    live.result.turn === 2 &&
    live.result.year === 2026 &&
    Number.isFinite(Date.parse(live.checkedAt || ''))
  ) {
    const kind =
      live.victory?.kind === 'official'
        ? 'official'
        : live.victory?.kind === 'mathematical'
          ? 'mathematical'
          : 'started';
    result.unshift({
      id: 'phase:2026-2:' + kind,
      title:
        kind === 'official'
          ? 'Resultado nacional confirmado pelo TSE'
          : kind === 'mathematical'
            ? 'Vantagem nacional numericamente irreversível'
            : 'A apuração do segundo turno começou',
      date: live.checkedAt!,
      destination: 'live',
      kind: 'Apuração',
    });
  }
  return result;
}
