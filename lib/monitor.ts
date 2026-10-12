import { timingSafeEqual } from 'node:crypto';
import type { Database } from './database';
import { live } from './live';
import { polls } from './polls';
import { media } from './media';
import { dispatchPush } from './push';
import { dispatchRequestedAnnouncement } from './announcements';

export function monitorAuthorized(actual: string | null, secret: string) {
  const wanted = `Bearer ${secret}`;
  return (
    !!secret &&
    !!actual &&
    Buffer.byteLength(actual) === Buffer.byteLength(wanted) &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(wanted))
  );
}

type Collection = {
  status?: string;
  checkedAt?: string | null;
  stale?: boolean;
  cacheStorage?: string;
};
type Dependencies = {
  live: (db: Database) => Promise<Collection>;
  polls: (db: Database) => Promise<Collection>;
  media: (db: Database) => Promise<Collection>;
  dispatchPush: (db: Database) => Promise<unknown>;
};

async function dispatchMonitoredPush(db: Database) {
  try {
    await dispatchRequestedAnnouncement(db);
  } finally {
    await dispatchPush(db);
  }
}

// Collect independently: one failed source must not prevent the others or queue delivery.
export async function runMonitor(
  db: Database,
  dependencies: Dependencies = { live, polls, media, dispatchPush: dispatchMonitoredPush },
) {
  const started = Date.now();
  const previous = await db
    .prepare('SELECT value FROM cache WHERE key=?')
    .bind('monitor:last')
    .first<{ value: string }>();
  const results = await Promise.allSettled(
    [dependencies.live, dependencies.polls, dependencies.media].map((collect) =>
      Promise.resolve().then(() => collect(db)),
    ),
  );
  const names = ['live', 'polls', 'media'] as const;
  const sources = results.map((result, index) => {
    const data = result.status === 'fulfilled' ? result.value : null;
    const accepted = index === 0 ? ['waiting', 'live'] : index === 1 ? ['ready'] : ['live'];
    const age = Date.now() - Date.parse(data?.checkedAt || '');
    return {
      name: names[index],
      status: data?.status || 'unavailable',
      checkedAt: data?.checkedAt || null,
      ok:
        !!data &&
        accepted.includes(data.status || '') &&
        !!data.checkedAt &&
        age >= -300000 &&
        age < 600000 &&
        !data.stale &&
        data.cacheStorage !== 'temporary',
    };
  });
  let push = 'ok';
  try {
    await dependencies.dispatchPush(db);
  } catch {
    push = 'unavailable';
  }
  const previousAt = previous ? (JSON.parse(previous.value).startedAt as string) : null;
  const report = {
    status: sources.every((source) => source.ok) && push === 'ok' ? 'ready' : 'degraded',
    startedAt: new Date(started).toISOString(),
    checkedAt: new Date().toISOString(),
    previousStartedAt: previousAt,
    gapSeconds: previousAt
      ? Math.max(0, Math.round((started - Date.parse(previousAt)) / 1000))
      : null,
    sources,
    push,
  };
  await db
    .prepare(
      'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated',
    )
    .bind('monitor:last', JSON.stringify(report), Date.now())
    .run();
  return report;
}
