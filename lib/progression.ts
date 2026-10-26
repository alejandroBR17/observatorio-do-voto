import type { Database } from './database';
import type { Result } from './elections';

export type ProgressionPoint = {
  id?: string;
  time?: string;
  counted: number;
  lula: number;
  bolsonaro: number;
};

export function mergeProgressionPoints(points: ProgressionPoint[]) {
  const unique = [
    ...new Map(
      points
        .filter((point) =>
          [point.counted, point.lula, point.bolsonaro].every(
            (value) => Number.isFinite(value) && value >= 0 && value <= 100,
          ),
        )
        .map((point) => [point.id || `${point.counted}:${point.lula}:${point.bolsonaro}`, point]),
    ).values(),
  ];
  const stamp = (point: ProgressionPoint) => {
    const match = point.time?.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
    return match
      ? Date.UTC(+match[3], +match[2] - 1, +match[1], +match[4], +match[5], +match[6])
      : null;
  };
  return unique.sort((a, b) => {
    const first = stamp(a),
      second = stamp(b);
    return first !== null && second !== null ? first - second : a.counted - b.counted;
  });
}

export function progressionPoint(result: Result): ProgressionPoint | null {
  const lula = result.candidates.find((candidate) => candidate.number === '13');
  const opponent = result.candidates.find((candidate) => candidate.number === '22');
  if (
    result.year !== 2026 ||
    result.turn !== 2 ||
    !lula ||
    !opponent ||
    ![result.counted, lula.percent, opponent.percent].every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 100,
    )
  )
    return null;
  return {
    id: result.id,
    time: result.generated,
    counted: result.counted,
    lula: lula.percent,
    bolsonaro: opponent.percent,
  };
}

export async function recordProgression(db: Database, result: Result) {
  const point = progressionPoint(result);
  if (!point) return;
  await db
    .prepare(
      'INSERT OR IGNORE INTO election_snapshots(year,turn,uf,id,value,observed) VALUES(?,?,?,?,?,?)',
    )
    .bind(result.year, result.turn, result.uf, result.id, JSON.stringify(point), Date.now())
    .run();
}

export async function readProgression(db: Database, uf: string) {
  const rows = await db
    .prepare(
      'SELECT value FROM election_snapshots WHERE year=? AND turn=? AND uf=? ORDER BY observed ASC, id ASC LIMIT 1000',
    )
    .bind(2026, 2, uf)
    .all<{ value: string }>();
  return rows.results.map((row) => JSON.parse(row.value) as ProgressionPoint);
}
