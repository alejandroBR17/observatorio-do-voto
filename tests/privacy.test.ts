import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import webpush from 'web-push';
import { createDatabase } from '../lib/database';
import { cleanupPushRetention, removePushRegistration, pushRetentionMs } from '../lib/push-storage';
import { eventId } from '../lib/push-identifier';
import { privacyChoice } from '../lib/privacy-choices';
import { analyticsConsentVersion, pushAuthorization, validPushAuthorization } from '../lib/privacy';
import { env } from '../lib/runtime';
import { GET, POST, DELETE } from '../app/api/push/route';

test('optional statistics require the current explicit local choice, never a generic terms acceptance', () => {
  for (const value of [
    null,
    {},
    { version: analyticsConsentVersion },
    { analytics: true },
    { analytics: { version: 'old', acceptedAt: '2026-10-13' } },
    { analytics: { version: analyticsConsentVersion, acceptedAt: 'invalid' } },
  ])
    assert.equal(privacyChoice(value, 'analytics'), null);
  assert.ok(
    privacyChoice(
      { analytics: { version: analyticsConsentVersion, acceptedAt: '2026-10-13T12:00:00Z' } },
      'analytics',
    ),
  );
  assert.equal(validPushAuthorization({ version: pushAuthorization.version }), false);
  assert.equal(
    validPushAuthorization({ ...pushAuthorization, internationalTransfer: false }),
    false,
  );
  assert.equal(validPushAuthorization(pushAuthorization), true);
  assert.equal(
    validPushAuthorization({ ...pushAuthorization, noticeVersion: '2026-10-13.2' }),
    true,
  );
  assert.equal(validPushAuthorization({ ...pushAuthorization, noticeVersion: 'unknown' }), false);
});

test('retention clears old technical receipts on quiet days without deleting active consent or VAPID keys', async () => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  const now = Date.now();
  try {
    for (const endpoint of ['active', 'orphan']) {
      await db.prepare('INSERT INTO subscription_keys VALUES(?,?,?)').bind(endpoint, '{}', 0).run();
      await db
        .prepare('INSERT INTO subscription_consents VALUES(?,?,?)')
        .bind(endpoint, '{}', 0)
        .run();
    }
    await db.prepare('INSERT INTO subscriptions VALUES(?,?,?)').bind('active', '{}', now).run();
    for (const [key, updated] of [
      ['test:old', now - pushRetentionMs - 1],
      ['test-receipt:old', 0],
      ['test:fresh', now],
      ['pushkeys', 0],
      ['monitor:last', now],
    ] as const)
      await db.prepare('INSERT INTO cache VALUES(?,?,?)').bind(key, 'value', updated).run();
    await db.prepare('INSERT INTO push_events VALUES(?,?,?)').bind('old', '{}', 0).run();
    await db
      .prepare('INSERT INTO push_deliveries VALUES(?,?,?,?,?)')
      .bind('old', 'active', 'sent', 0, 1)
      .run();
    await cleanupPushRetention(db, now);
    assert.deepEqual(
      (await db.prepare('SELECT key FROM cache ORDER BY key').all<{ key: string }>()).results.map(
        (row) => row.key,
      ),
      ['monitor:last', 'pushkeys', 'test:fresh'],
    );
    assert.equal(
      (await db.prepare('SELECT count(*) AS count FROM push_events').first<{ count: number }>())
        ?.count,
      0,
    );
    assert.deepEqual(
      (await db.prepare('SELECT endpoint FROM subscription_consents').all()).results,
      [{ endpoint: 'active' }],
    );
    assert.deepEqual((await db.prepare('SELECT endpoint FROM subscription_keys').all()).results, [
      { endpoint: 'active' },
    ]);
  } finally {
    client.close();
  }
});

test('push routes require explicit new opt-in, preserve legacy records honestly and remove associated data on revocation', async (t) => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  const original = Object.getOwnPropertyDescriptor(env, 'DB')!;
  Object.defineProperty(env, 'DB', { ...original, get: () => db });
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/privacy-fixture',
    keys: {
      p256dh: webpush.generateVAPIDKeys().publicKey,
      auth: Buffer.alloc(16, 1).toString('base64url'),
    },
  };
  const request = (method: string, body: unknown) =>
    new Request('https://observatorio.test/api/push', {
      method,
      headers: { Origin: 'https://observatorio.test', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const body = { endpoint: subscription.endpoint, subscription, preferences: { polls: true } };
  try {
    assert.equal((await POST(request('POST', body))).status, 409);
    assert.equal(
      (
        await POST(
          request('POST', {
            ...body,
            authorization: { ...pushAuthorization, internationalTransfer: false },
          }),
        )
      ).status,
      409,
    );
    assert.equal(
      (await db.prepare('SELECT count(*) AS count FROM subscriptions').first<{ count: number }>())
        ?.count,
      0,
    );
    assert.equal(
      (await POST(request('POST', { ...body, authorization: pushAuthorization }))).status,
      200,
    );
    const granted = await db
      .prepare('SELECT value,accepted FROM subscription_consents')
      .first<{ value: string; accepted: number }>();
    assert.deepEqual(JSON.parse(granted!.value), pushAuthorization);
    assert.equal(granted!.accepted, now);
    assert.equal(
      (
        await POST(
          request('POST', {
            ...body,
            authorization: { ...pushAuthorization, noticeVersion: '2026-10-13.2' },
          }),
        )
      ).status,
      200,
    );
    const priorDisclosure = await db
      .prepare('SELECT value FROM subscription_consents')
      .first<{ value: string }>();
    assert.equal(JSON.parse(priorDisclosure!.value).noticeVersion, '2026-10-13.2');
    now += 10000;
    assert.equal((await POST(request('POST', body))).status, 200);
    assert.equal(
      (await db.prepare('SELECT accepted FROM subscription_consents').first<{ accepted: number }>())
        ?.accepted,
      granted!.accepted,
    );
    for (const prefix of ['test', 'test-receipt'])
      await db
        .prepare('INSERT INTO cache VALUES(?,?,?)')
        .bind(eventId(prefix, subscription.endpoint), 'fixture', now)
        .run();
    await db
      .prepare('INSERT INTO push_deliveries VALUES(?,?,?,?,?)')
      .bind('fixture', subscription.endpoint, 'sent', now, 1)
      .run();
    const publicKey = await (await GET()).json();
    assert.deepEqual(Object.keys(publicKey), ['publicKey']);
    assert.equal(
      (await DELETE(request('DELETE', { endpoint: subscription.endpoint }))).status,
      200,
    );
    for (const table of [
      'subscriptions',
      'subscription_keys',
      'subscription_consents',
      'push_deliveries',
    ])
      assert.equal(
        (await db.prepare(`SELECT count(*) AS count FROM ${table}`).first<{ count: number }>())
          ?.count,
        0,
      );
    assert.equal(
      await db
        .prepare('SELECT key FROM cache WHERE key=?')
        .bind(eventId('test-receipt', subscription.endpoint))
        .first(),
      null,
    );
    assert.equal(
      (await POST(request('POST', body))).status,
      409,
      'background sync cannot re-enroll a revoked address',
    );
    assert.ok(
      await db.prepare("SELECT value FROM cache WHERE key='pushkeys'").first(),
      'revocation does not rotate the shared VAPID identity',
    );
    await db
      .prepare('INSERT INTO subscriptions VALUES(?,?,?)')
      .bind(subscription.endpoint, '{}', 1)
      .run();
    await db
      .prepare('INSERT INTO subscription_keys VALUES(?,?,?)')
      .bind(subscription.endpoint, JSON.stringify(subscription), 1)
      .run();
    assert.equal((await POST(request('POST', body))).status, 200);
    assert.equal(
      await db.prepare('SELECT endpoint FROM subscription_consents').first(),
      null,
      'legacy sync never fabricates a consent',
    );
    await db
      .prepare('DELETE FROM subscriptions WHERE endpoint=?')
      .bind(subscription.endpoint)
      .run();
    assert.equal(
      (await POST(request('POST', body))).status,
      409,
      'a partially removed registration cannot be resurrected by technical sync',
    );
    assert.equal(await db.prepare('SELECT endpoint FROM subscriptions').first(), null);
    await removePushRegistration(db, subscription.endpoint);
    assert.equal(
      (await POST(request('POST', { ...body, authorization: pushAuthorization }))).status,
      200,
    );
    const previousPreferences = await db.prepare('SELECT preferences FROM subscriptions').first();
    await db.prepare("UPDATE cache SET value='120' WHERE key LIKE 'ratelimit:push:write:%'").run();
    now += 1000;
    const throttled = await POST(
      request('POST', { ...body, preferences: { polls: false }, authorization: pushAuthorization }),
    );
    assert.equal(throttled.status, 429);
    assert.ok(Number(throttled.headers.get('Retry-After')) > 0);
    assert.deepEqual(
      await db.prepare('SELECT preferences FROM subscriptions').first(),
      previousPreferences,
      'a blocked operation never updates the subscription',
    );
    assert.equal(
      (await DELETE(request('DELETE', { endpoint: subscription.endpoint }))).status,
      200,
      'revocation remains available after rate limiting',
    );
  } finally {
    Object.defineProperty(env, 'DB', original);
    client.close();
  }
});
