import type { Database } from './database';
import webpush from 'web-push';
import { cleanupPushRetention, removePushRegistration } from './push-storage';
export { eventId } from './push-identifier';
import {
  alertPreferences,
  adaptiveWindow,
  frequencyWindow,
  priorityAlert,
  type AlertType,
} from './alerts';
import type { ContentSubject } from './content-personalization';
import { imageUrl } from './article-image';
const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
export async function pushKeys(db: Database) {
  const existing = await db
    .prepare('SELECT value FROM cache WHERE key=?')
    .bind('pushkeys')
    .first<{ value: string }>();
  if (existing) return JSON.parse(existing.value);
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const data = {
    public: b64(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))),
    private: await crypto.subtle.exportKey('jwk', pair.privateKey),
  };
  await db
    .prepare('INSERT OR IGNORE INTO cache(key,value,updated) VALUES(?,?,?)')
    .bind('pushkeys', JSON.stringify(data), Date.now())
    .run();
  return JSON.parse(
    (await db
      .prepare('SELECT value FROM cache WHERE key=?')
      .bind('pushkeys')
      .first<{ value: string }>())!.value,
  );
}
export function validEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    const trusted =
      u.hostname === 'fcm.googleapis.com' ||
      ['push.apple.com', 'push.services.mozilla.com', 'notify.windows.com'].some((h) =>
        u.hostname.endsWith('.' + h),
      );
    return u.protocol === 'https:' && trusted && !u.username && !u.password && !u.port;
  } catch {
    return false;
  }
}
export function validSubscription(value: unknown): value is webpush.PushSubscription {
  const s = value as webpush.PushSubscription | undefined;
  if (
    !s ||
    typeof s.endpoint !== 'string' ||
    s.endpoint.length > 2000 ||
    !validEndpoint(s.endpoint) ||
    typeof s.keys?.auth !== 'string' ||
    typeof s.keys?.p256dh !== 'string'
  )
    return false;
  try {
    const auth = Buffer.from(s.keys.auth, 'base64url'),
      key = Buffer.from(s.keys.p256dh, 'base64url');
    return (
      /^[A-Za-z0-9_-]+={0,2}$/.test(s.keys.auth) &&
      /^[A-Za-z0-9_-]+={0,2}$/.test(s.keys.p256dh) &&
      auth.length === 16 &&
      key.length === 65 &&
      key[0] === 4
    );
  } catch {
    return false;
  }
}
export type PushEvent = {
  id: string;
  types: AlertType[];
  title: string;
  body: string;
  url: string;
  image?: string;
  icon?: string;
  urgent?: boolean;
  expiresAt?: number;
  subjects?: ContentSubject[];
};
function notificationAsset(value: string | undefined) {
  if (!value || value.length > 1500) return undefined;
  if (
    ['/assets/lula.jpeg', '/assets/flavio.jpeg', '/og-image.png', '/app-icon-192.png'].includes(
      value,
    )
  )
    return value;
  return imageUrl(value, 'https://observatorio-voto.vercel.app') || undefined;
}

export function pushPayload(event: PushEvent) {
  const payload = {
    id: event.id,
    title: event.title.trim().slice(0, 240) || 'Atualização eleitoral',
    body: event.body.slice(0, 500),
    url: event.url,
    types: event.types,
    ...(event.expiresAt ? { expiresAt: event.expiresAt } : {}),
    image: notificationAsset(event.image),
    icon: notificationAsset(event.icon),
  };
  // Encrypted Web Push has a small payload budget. Preserve the text if
  // unusually long image URLs would make the provider reject the alert.
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > 3500) {
    payload.image = undefined;
    payload.icon = undefined;
  }
  return payload;
}
export async function queuePush(db: Database, event: PushEvent) {
  await db
    .prepare('INSERT OR IGNORE INTO push_events(id,value,created) VALUES(?,?,?)')
    .bind(event.id, JSON.stringify(event), Date.now())
    .run();
}
export async function sendPush(
  db: Database,
  subscription: webpush.PushSubscription,
  event: PushEvent,
) {
  if (!validSubscription(subscription)) throw Error('Invalid subscription');
  const keys = await pushKeys(db);
  return webpush.sendNotification(subscription, JSON.stringify(pushPayload(event)), {
    vapidDetails: {
      subject:
        process.env.PUSH_SUBJECT || process.env.SITE_URL || 'https://observatorio-voto.vercel.app',
      publicKey: keys.public,
      privateKey: keys.private.d,
    },
    TTL: event.expiresAt
      ? Math.max(0, Math.min(3600, Math.floor((event.expiresAt - Date.now()) / 1000)))
      : 3600,
    urgency: event.urgent ? 'high' : 'normal',
    timeout: 10000,
  });
}
export async function dispatchPush(db: Database, send = sendPush) {
  // Run independently of the delivery lease and queue size, including quiet days.
  await cleanupPushRetention(db);
  const now = Date.now(),
    lease = await db
      .prepare(
        'INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET updated=excluded.updated WHERE cache.updated<?',
      )
      .bind('lease:push', '', now, now - 60000)
      .run();
  if (!lease.meta.changes) return;
  try {
    const events = await db
      .prepare(
        "SELECT e.id,e.value,e.created FROM push_events e WHERE e.created>? AND EXISTS(SELECT 1 FROM subscriptions s JOIN subscription_keys k ON k.endpoint=s.endpoint LEFT JOIN push_deliveries d ON d.endpoint=s.endpoint AND d.event_id=e.id WHERE (k.created<=e.created OR (json_extract(e.value,'$.types[0]')='debate' AND k.created<json_extract(e.value,'$.expiresAt'))) AND (json_extract(e.value,'$.types[0]')!='debate' OR json_extract(s.preferences,'$.debate')=1) AND (d.event_id IS NULL OR (d.status IN ('retry','deferred') AND d.updated<? AND (d.status='deferred' OR d.attempts<3)))) ORDER BY json_extract(e.value,'$.urgent') DESC,e.created DESC LIMIT 10",
      )
      .bind(now - 172800000, now - 60000)
      .all<{ id: string; value: string; created: number }>();
    let budget = 100;
    for (const row of events.results) {
      if (!budget) break;
      const event = JSON.parse(row.value) as PushEvent;
      const subs = await db
        .prepare(
          "SELECT s.endpoint,s.preferences,k.value FROM subscriptions s JOIN subscription_keys k ON k.endpoint=s.endpoint LEFT JOIN push_deliveries d ON d.endpoint=s.endpoint AND d.event_id=? WHERE k.created<=? AND (?=0 OR json_extract(s.preferences,'$.debate')=1) AND (d.event_id IS NULL OR (d.status IN ('retry','deferred') AND d.updated<? AND (d.status='deferred' OR d.attempts<3))) ORDER BY s.endpoint LIMIT ?",
        )
        .bind(
          row.id,
          event.types.includes('debate')
            ? Math.max(row.created, event.expiresAt || row.created)
            : row.created,
          event.types.includes('debate') ? 1 : 0,
          now - 60000,
          budget,
        )
        .all<{ endpoint: string; preferences: string; value: string }>();
      budget -= subs.results.length;
      for (let start = 0; start < subs.results.length; start += 20)
        await Promise.allSettled(
          subs.results.slice(start, start + 20).map(async (sub) => {
            const prefs = alertPreferences(JSON.parse(sub.preferences)),
              wanted =
                (!event.expiresAt || event.expiresAt > now) && event.types.some((t) => prefs[t]);
            let status = 'skipped',
              nextCheck = Date.now();
            if (wanted) {
              try {
                const window = adaptiveWindow(prefs, event, now),
                  priority = priorityAlert(event.types, prefs);
                let message = {
                  ...event,
                  types: event.types.filter((t) => prefs[t]),
                  urgent: priority,
                };
                let grouped: string[] = [];
                if (window && !priority) {
                  const history = await db
                    .prepare(
                      "SELECT d.updated,e.value FROM push_deliveries d JOIN push_events e ON e.id=d.event_id WHERE d.endpoint=? AND d.status='sent' AND d.updated>? ORDER BY d.updated DESC LIMIT 100",
                    )
                    .bind(sub.endpoint, now - window)
                    .all<{ updated: number; value: string }>();
                  const recentCommon = history.results.filter(
                    (r) =>
                      !priorityAlert((JSON.parse(r.value) as PushEvent).types, prefs) &&
                      (adaptiveWindow(prefs, JSON.parse(r.value), now) === window ||
                        now - r.updated < frequencyWindow(prefs)),
                  );
                  if (recentCommon.length) {
                    status = 'deferred';
                    nextCheck =
                      Math.max(
                        ...recentCommon.map(
                          (r) =>
                            r.updated +
                            (adaptiveWindow(prefs, JSON.parse(r.value), now) === window
                              ? window
                              : frequencyWindow(prefs)),
                        ),
                      ) - 60000;
                  } else {
                    const pending = await db
                      .prepare(
                        "SELECT e.id,e.value FROM push_events e JOIN subscription_keys k ON k.endpoint=? LEFT JOIN push_deliveries d ON d.event_id=e.id AND d.endpoint=k.endpoint WHERE e.created>? AND (k.created<=e.created OR (json_extract(e.value,'$.types[0]')='debate' AND k.created<json_extract(e.value,'$.expiresAt'))) AND (d.event_id IS NULL OR d.status='deferred' OR (d.status='retry' AND d.attempts<3)) ORDER BY e.created DESC LIMIT 100",
                      )
                      .bind(sub.endpoint, now - 172800000)
                      .all<{ id: string; value: string }>();
                    const common = pending.results.filter((r) => {
                      const e = JSON.parse(r.value) as PushEvent;
                      return (
                        (!e.expiresAt || e.expiresAt > now) &&
                        e.types.some((t) => prefs[t]) &&
                        !priorityAlert(e.types, prefs) &&
                        adaptiveWindow(prefs, e, now) === window
                      );
                    });
                    grouped = common.filter((r) => r.id !== row.id).map((r) => r.id);
                    if (common.length > 1) {
                      const latest = JSON.parse(common[0].value) as PushEvent;
                      message = {
                        ...event,
                        types: [
                          ...new Set(
                            common
                              .flatMap((r) => (JSON.parse(r.value) as PushEvent).types)
                              .filter((t) => prefs[t]),
                          ),
                        ],
                        title: `${common.length} atualizações da eleição`,
                        body: `${common.length} atualizações agrupadas. ${latest.title}. ${latest.body}`,
                        url: latest.url,
                        image: latest.image,
                        icon: latest.icon,
                        urgent: false,
                      };
                    }
                  }
                }
                if (status !== 'deferred') {
                  await send(db, JSON.parse(sub.value), message);
                  status = 'sent';
                  for (const id of grouped)
                    await db
                      .prepare(
                        "INSERT INTO push_deliveries(event_id,endpoint,status,updated,attempts) VALUES(?,?,'grouped',?,0) ON CONFLICT(event_id,endpoint) DO UPDATE SET status='grouped',updated=excluded.updated",
                      )
                      .bind(id, sub.endpoint, Date.now())
                      .run();
                }
              } catch (e) {
                const code = (e as { statusCode?: number }).statusCode;
                if (code === 404 || code === 410) {
                  await removePushRegistration(db, sub.endpoint);
                  status = 'expired';
                } else status = 'retry';
              }
            }
            await db
              .prepare(
                'INSERT INTO push_deliveries(event_id,endpoint,status,updated,attempts) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM subscriptions WHERE endpoint=?) ON CONFLICT(event_id,endpoint) DO UPDATE SET status=excluded.status,updated=excluded.updated,attempts=push_deliveries.attempts+excluded.attempts',
              )
              .bind(
                row.id,
                sub.endpoint,
                status,
                status === 'deferred' ? nextCheck : Date.now(),
                ['retry', 'sent', 'expired'].includes(status) ? 1 : 0,
                sub.endpoint,
              )
              .run();
          }),
        );
    }
  } finally {
    await db
      .prepare('UPDATE cache SET updated=0 WHERE key=? AND updated=?')
      .bind('lease:push', now)
      .run();
  }
}
