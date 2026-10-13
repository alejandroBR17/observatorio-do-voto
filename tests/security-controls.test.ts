import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { createDatabase } from '../lib/database';
import { limitedJson } from '../lib/json-request';
import { contentSecurityPolicy } from '../lib/csp';
import {
  clientAddress,
  consumeWindow,
  rateKey,
  rateRetentionMs,
  limitPush,
  cleanupPushRateLimits,
} from '../lib/push-rate-limit';

test('atomic shared counters enforce bursts across concurrent requests and recover after the window', async () => {
  const client = createClient({ url: 'file::memory:' }),
    db = createDatabase(client),
    now = 1000000;
  try {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => consumeWindow(db, 'ratelimit:push:fixture', 5, 60000, now)),
    );
    assert.equal(results.filter((r) => !r).length, 5);
    assert.equal(results.filter((r) => r?.status === 429).length, 15);
    assert.equal(results.find(Boolean)?.headers.get('Retry-After'), '60');
    assert.equal(await consumeWindow(db, 'ratelimit:push:fixture', 5, 60000, now + 60000), null);
    await db.prepare("INSERT INTO cache VALUES('pushkeys','unchanged',0)").run();
    await cleanupPushRateLimits(db, now + 60000 + rateRetentionMs + 1);
    assert.equal(
      await db.prepare("SELECT key FROM cache WHERE key LIKE 'ratelimit:push:%'").first(),
      null,
    );
    assert.ok(await db.prepare("SELECT key FROM cache WHERE key='pushkeys'").first());
  } finally {
    client.close();
  }
});

test('only trusted platform IPs identify limits; hashed identities rotate daily and aggregate signup limits remain shared', async () => {
  const req = new Request('https://app.example/api/push', {
    headers: { 'x-vercel-forwarded-for': '192.0.2.42', 'x-forwarded-for': '198.51.100.1' },
  });
  assert.equal(clientAddress(req, true), '192.0.2.42');
  assert.equal(clientAddress(req, false), 'local');
  assert.equal(
    clientAddress(
      new Request('https://app.example', { headers: { 'x-forwarded-for': '192.0.2.1' } }),
      true,
    ),
    'unknown',
  );
  const a = rateKey('test-secret', '192.0.2.42', 'signup', 0);
  assert.ok(!a.includes('192.0.2.42'));
  assert.notEqual(a, rateKey('test-secret', '192.0.2.42', 'signup', rateRetentionMs));
  const client = createClient({ url: 'file::memory:' }),
    db = createDatabase(client),
    now = 1000000;
  try {
    await db
      .prepare("INSERT INTO cache VALUES('ratelimit:push:global:signup','300',?)")
      .bind(now)
      .run();
    assert.equal((await limitPush(db, req, 'signup', 'test-secret', now))?.status, 429);
  } finally {
    client.close();
  }
});

test('push payload bounds apply to chunked bodies, multibyte content and declared oversized bodies', async () => {
  const request = (body: string, headers: Record<string, string> = {}) =>
    new Request('https://app.example/api/push', { method: 'POST', headers, body });
  assert.deepEqual(await limitedJson(request('{"endpoint":"fixture"}')), { endpoint: 'fixture' });
  for (const req of [
    request('x'.repeat(8200)),
    request(JSON.stringify({ text: 'á'.repeat(4500) })),
    request('{}', { 'Content-Length': '100000' }),
  ])
    assert.equal(((await limitedJson(req)) as Response).status, 413);
  assert.equal(await limitedJson(request('invalid')), null);
  assert.equal(await limitedJson(request('[]')), null);
});

test('production CSP requires trusted scripts, confines network and images and supports the offline document', () => {
  const policy = contentSecurityPolicy('test-nonce', 'https://app.example');
  const scripts = policy.split('; ').find((s) => s.startsWith('script-src'))!;
  assert.ok(scripts.includes("'nonce-test-nonce'"));
  assert.ok(scripts.includes("'strict-dynamic'"));
  assert.ok(!scripts.includes('unsafe-inline') && !scripts.includes('unsafe-eval'));
  assert.ok(policy.includes("object-src 'none'") && policy.includes("frame-ancestors 'none'"));
  assert.ok(policy.includes('wss://app.example') && !policy.includes('https://* '));
  assert.ok(policy.includes('https://*.glbimg.com'));
  const offline = contentSecurityPolicy(null, 'https://app.example');
  assert.ok(offline.includes("script-src 'self';") && !offline.includes('nonce-'));
  const dev = contentSecurityPolicy('test', 'http://localhost:3000', true);
  assert.ok(
    dev.includes('ws://localhost:3000') &&
      dev.includes('unsafe-eval') &&
      !dev.includes('upgrade-insecure-requests'),
  );
});
