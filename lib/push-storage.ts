import type { Database } from './database';
import { eventId } from './push-identifier';
export const pushRetentionMs = 48 * 60 * 60 * 1000;

export async function removePushRegistration(db: Database, endpoint: string) {
  // Remove the address first: a partial storage failure must not keep it eligible
  // for delivery. Callers report failure and can safely retry the remaining work.
  for (const table of [
    'subscriptions',
    'subscription_keys',
    'subscription_consents',
    'push_deliveries',
  ]) {
    await db.prepare(`DELETE FROM ${table} WHERE endpoint=?`).bind(endpoint).run();
  }
  for (const prefix of ['test', 'test-receipt']) {
    await db.prepare('DELETE FROM cache WHERE key=?').bind(eventId(prefix, endpoint)).run();
  }
}

export async function cleanupPushRetention(db: Database, now = Date.now()) {
  const before = now - pushRetentionMs;
  await db.prepare('DELETE FROM push_deliveries WHERE updated<?').bind(before).run();
  await db
    .prepare(
      'DELETE FROM push_deliveries WHERE NOT EXISTS(SELECT 1 FROM subscriptions s WHERE s.endpoint=push_deliveries.endpoint)',
    )
    .run();
  await db.prepare('DELETE FROM push_events WHERE created<?').bind(before).run();
  await db
    .prepare(
      "DELETE FROM cache WHERE updated<? AND (key LIKE 'test:%' OR key LIKE 'test-receipt:%' OR key LIKE 'audience:announcement:%' OR key LIKE 'report:announcement:%' OR key LIKE 'lease:announcement:%')",
    )
    .bind(before)
    .run();
  await db
    .prepare(
      'DELETE FROM subscription_keys WHERE created<? AND NOT EXISTS(SELECT 1 FROM subscriptions s WHERE s.endpoint=subscription_keys.endpoint)',
    )
    .bind(before)
    .run();
  await db
    .prepare(
      'DELETE FROM subscription_consents WHERE accepted<? AND NOT EXISTS(SELECT 1 FROM subscriptions s WHERE s.endpoint=subscription_consents.endpoint)',
    )
    .bind(before)
    .run();
}
