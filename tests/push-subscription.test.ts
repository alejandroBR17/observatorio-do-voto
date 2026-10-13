import test from 'node:test';
import assert from 'node:assert/strict';
import { ensurePushSubscription, disablePushSubscription } from '../lib/push-subscription';

function device(initial: Uint8Array | null, unsubscribeOk = true) {
  const actions: string[] = [];
  const subscription = (key: Uint8Array): PushSubscription =>
    ({
      endpoint: 'https://fcm.googleapis.com/fcm/send/local-fixture',
      options: { applicationServerKey: key.buffer },
      unsubscribe: async () => {
        actions.push('unsubscribe');
        if (unsubscribeOk) existing = null;
        return unsubscribeOk;
      },
    }) as unknown as PushSubscription;
  let existing = initial ? subscription(initial) : null;
  const registration = {
    pushManager: {
      getSubscription: async () => existing,
      subscribe: async (options: PushSubscriptionOptionsInit) => {
        actions.push('subscribe');
        existing = subscription(new Uint8Array(options.applicationServerKey as ArrayBuffer));
        return existing;
      },
    },
  } as unknown as ServiceWorkerRegistration;
  return {
    registration,
    actions,
    get existing() {
      return existing;
    },
  };
}
const key = (marker: number) => Uint8Array.from({ length: 65 }, (_, i) => (i === 0 ? 4 : marker));
const encoded = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');

test('existing subscription survives when its application key still matches', async () => {
  const d = device(key(1));
  assert.equal(await ensurePushSubscription(d.registration, encoded(key(1))), d.existing);
  assert.deepEqual(d.actions, []);
});

test('failed server deletion never unsubscribes locally or reports success', async () => {
  const d = device(key(1));
  await assert.rejects(
    disablePushSubscription(d.registration, async () => new Response('{}', { status: 503 })),
    /servidor/,
  );
  assert.deepEqual(d.actions, []);
});

test('successful server deletion distinguishes a browser that could not unsubscribe', async () => {
  const d = device(key(1), false);
  const result = await disablePushSubscription(
    d.registration,
    async () => new Response('{}', { status: 200 }),
  );
  assert.deepEqual(result, { found: true, browserRemoved: false });
  assert.deepEqual(d.actions, ['unsubscribe']);
  const empty = device(null);
  assert.deepEqual(
    await disablePushSubscription(empty.registration, async () => {
      throw Error('must not call server without an address');
    }),
    { found: false, browserRemoved: true },
  );
});
test('a changed VAPID key renews an existing opt-in once across concurrent callers', async () => {
  const d = device(key(1));
  const [a, b] = await Promise.all([
    ensurePushSubscription(d.registration, encoded(key(2))),
    ensurePushSubscription(d.registration, encoded(key(2)), true),
  ]);
  assert.equal(a, b);
  assert.deepEqual(d.actions, ['unsubscribe', 'subscribe']);
});
test('startup does not subscribe new visitors; explicit activation does', async () => {
  const d = device(null);
  assert.equal(await ensurePushSubscription(d.registration, encoded(key(1))), null);
  assert.deepEqual(d.actions, []);
  assert.ok(await ensurePushSubscription(d.registration, encoded(key(1)), true));
  assert.deepEqual(d.actions, ['subscribe']);
});
test('failed renewal or an invalid server key never creates a second subscription', async () => {
  const d = device(key(1), false);
  await assert.rejects(ensurePushSubscription(d.registration, encoded(key(2))), /renovar/);
  assert.deepEqual(d.actions, ['unsubscribe']);
  const valid = device(key(1));
  await assert.rejects(
    ensurePushSubscription(valid.registration, encoded(new Uint8Array(12))),
    /inválida/,
  );
  assert.deepEqual(valid.actions, []);
});
