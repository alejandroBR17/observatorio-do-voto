import { createHash } from 'node:crypto';
import { databaseConfig, type Database } from './database';
import { alertPreferences } from './alerts';
import { sendPush, type PushEvent } from './push';

export type Announcement = PushEvent & { registeredBefore: number; expiresAt: number };

export async function captureAnnouncementAudience(db: Database, id: string, now = Date.now()) {
  const key = `audience:${id}`;
  const previous = await db
    .prepare('SELECT updated FROM cache WHERE key=?')
    .bind(key)
    .first<{ updated: number }>();
  if (previous) return previous.updated;
  const current = await db
    .prepare(
      'SELECT count(*) AS count FROM subscriptions s JOIN subscription_keys k ON s.endpoint=k.endpoint WHERE k.created<=?',
    )
    .bind(now)
    .first<{ count: number }>();
  // Do not freeze an empty audience while the owner repairs a missing opt-in.
  if (!current?.count) return now;
  await db
    .prepare('INSERT OR IGNORE INTO cache(key,value,updated) VALUES(?,?,?)')
    .bind(key, '', now)
    .run();
  return (await db
    .prepare('SELECT updated FROM cache WHERE key=?')
    .bind(key)
    .first<{ updated: number }>())!.updated;
}

// Operational notices are invoked only by the authenticated monitor. They have a
// fixed audience cutoff and expiry; they never masquerade as an election result.
export async function dispatchAnnouncement(db: Database, notice: Announcement, send = sendPush) {
  const now = Date.now();
  if (now > notice.expiresAt || now < notice.registeredBefore) return;
  const leaseKey = `lease:${notice.id}`;
  const lease = await db
    .prepare(
      'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET updated=excluded.updated WHERE cache.updated<?',
    )
    .bind(leaseKey, '', now, now - 120000)
    .run();
  if (!lease.meta.changes) return;
  try {
    const subscriptions = await db
      .prepare(
        "SELECT s.endpoint,s.preferences,k.value FROM subscriptions s JOIN subscription_keys k ON s.endpoint=k.endpoint LEFT JOIN push_deliveries d ON d.endpoint=s.endpoint AND d.event_id=? WHERE k.created<=? AND (d.event_id IS NULL OR (d.status='retry' AND d.attempts<3 AND d.updated<?)) ORDER BY s.endpoint LIMIT 100",
      )
      .bind(notice.id, notice.registeredBefore, now - 60000)
      .all<{ endpoint: string; preferences: string; value: string }>();
    const failures: Record<string, number> = {};
    for (let start = 0; start < subscriptions.results.length; start += 20) {
      await Promise.all(
        subscriptions.results.slice(start, start + 20).map(async (sub) => {
          let status = 'skipped';
          let attempts = 0;
          try {
            const preferences = alertPreferences(JSON.parse(sub.preferences));
            if (Object.values(preferences).some((value) => value === true)) {
              attempts = 1;
              await send(db, JSON.parse(sub.value), notice);
              status = 'sent';
            }
          } catch (error) {
            const code = (error as { statusCode?: number }).statusCode;
            const label = code ? String(code) : 'internal';
            failures[label] = (failures[label] || 0) + 1;
            status = code === 404 || code === 410 ? 'expired' : 'retry';
            attempts = 1;
            if (status === 'expired') {
              await db
                .prepare('DELETE FROM subscriptions WHERE endpoint=?')
                .bind(sub.endpoint)
                .run();
              await db
                .prepare('DELETE FROM subscription_keys WHERE endpoint=?')
                .bind(sub.endpoint)
                .run();
            }
          }
          await db
            .prepare(
              'INSERT INTO push_deliveries(event_id,endpoint,status,updated,attempts) VALUES(?,?,?,?,?) ON CONFLICT(event_id,endpoint) DO UPDATE SET status=excluded.status,updated=excluded.updated,attempts=push_deliveries.attempts+excluded.attempts',
            )
            .bind(notice.id, sub.endpoint, status, Date.now(), attempts)
            .run();
        }),
      );
    }
    const totals = await db
      .prepare(
        'SELECT status,count(*) AS count FROM push_deliveries WHERE event_id=? GROUP BY status',
      )
      .bind(notice.id)
      .all<{ status: string; count: number }>();
    const audience = await db
      .prepare(
        'SELECT (SELECT count(*) FROM subscriptions) AS registered,count(*) AS withKeys,sum(CASE WHEN k.created<=? THEN 1 ELSE 0 END) AS eligible FROM subscriptions s JOIN subscription_keys k ON s.endpoint=k.endpoint',
      )
      .bind(notice.registeredBefore)
      .first<{ registered: number; withKeys: number; eligible: number | null }>();
    const report = {
      id: notice.id,
      audience,
      totals: totals.results,
      failures,
      checkedAt: new Date().toISOString(),
    };
    await db
      .prepare(
        'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated',
      )
      .bind(`report:${notice.id}`, JSON.stringify(report), Date.now())
      .run();
    // Expose only aggregate diagnostics during the bounded announcement window.
    // This also makes a completed send auditable after short-lived logs expire.
    console.info('Push announcement', JSON.stringify(report));
    return report;
  } finally {
    await db
      .prepare('UPDATE cache SET updated=0 WHERE key=? AND updated=?')
      .bind(leaseKey, now)
      .run();
  }
}

// One-off message explicitly requested by the owner on 12 October. Preview,
// development, future installs and subsequent days must never trigger it.
export async function dispatchRequestedAnnouncement(db: Database) {
  const expiresAt = Date.parse('2026-10-13T02:59:59Z');
  if (
    process.env.VERCEL_ENV !== 'production' ||
    Date.now() < Date.parse('2026-10-12T14:35:00Z') ||
    Date.now() > expiresAt
  )
    return;
  if (Date.now() < Date.parse('2026-10-12T18:00:00Z')) {
    const { url } = databaseConfig();
    console.info(
      'Push storage diagnostics',
      JSON.stringify({
        scheme: url.split(':')[0],
        host: new URL(url).hostname,
        source: process.env.TURSO_DATABASE_URL
          ? 'TURSO_DATABASE_URL'
          : 'STORAGE_TURSO_DATABASE_URL',
        identity: createHash('sha256').update(url).digest('hex'),
        nodeEnvironment: process.env.NODE_ENV,
        vercelRuntime: !!process.env.VERCEL,
      }),
    );
  }
  return dispatchAnnouncement(db, {
    id: 'announcement:2026-10-12-daily-overview',
    registeredBefore: await captureAnnouncementAudience(
      db,
      'announcement:2026-10-12-daily-overview',
    ),
    expiresAt,
    types: [],
    title: 'Seu panorama eleitoral está atualizado',
    body: 'Confira as notícias de 12/10, as pesquisas mais recentes e os resultados da sua cidade no Observatório do Voto.',
    url: '/?tab=overview',
    image: '/og-image.png',
  });
}
