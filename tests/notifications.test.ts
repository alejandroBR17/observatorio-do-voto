import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createClient } from '@libsql/client';
import { createDatabase } from '../lib/database';
import { pushPayload } from '../lib/push';
import { queueContentAlerts } from '../lib/content-alerts';
import { articlePreview } from '../lib/article-preview';

async function receiveNotification(payload: unknown, rejectImage = false, history: any[] = []) {
  const calls: { title: string; options: Record<string, unknown> }[] = [];
  type PushInput = { data: { json: () => unknown }; waitUntil: (task: Promise<void>) => void };
  const handlers: Record<string, (event: PushInput) => void> = {};
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    URL,
    importScripts: () => {},
    self: {
      notificationStore: {
        list: async () => history,
        put: async (item: any) => {
          history.push(item);
        },
      },
      addEventListener: (name: string, handler: (event: PushInput) => void) => {
        handlers[name] = handler;
      },
      registration: {
        showNotification: async (title: string, options: Record<string, unknown>) => {
          calls.push({ title, options });
          if (rejectImage && options.image) throw new Error('Rich images unsupported');
        },
        pushManager: { getSubscription: async () => null },
      },
    },
  });
  let completed = Promise.resolve();
  handlers.push({
    data: { json: () => payload },
    waitUntil: (task) => {
      completed = task;
    },
  });
  await completed;
  return calls;
}

test('push payload includes only approved preview assets and preserves notification context', () => {
  const event = {
    id: 'publication:1',
    types: ['coverage'] as const,
    title: 'Manchete',
    body: 'G1',
    url: '/?tab=social',
  };
  const payload = pushPayload({
    ...event,
    types: [...event.types],
    image: 'https://s2.glbimg.com/photo.jpg',
    icon: '/assets/lula.jpeg',
  });
  assert.equal(payload.image, 'https://s2.glbimg.com/photo.jpg');
  assert.equal(payload.icon, '/assets/lula.jpeg');
  for (const image of [
    'http://localhost/secret',
    'https://evil.test/photo.jpg',
    '//evil.test/photo.jpg',
    '/api/push',
    'data:image/png;base64,secret',
  ])
    assert.equal(pushPayload({ ...event, types: [...event.types], image }).image, undefined);
});

test('received push history records delivered summaries, suppresses repeats and keeps decisive alerts distinct', async () => {
  const history: any[] = [];
  const summary = {
    id: 'summary:1',
    title: '5 notícias sobre a eleição',
    body: 'Fonte · Manchete',
    types: ['coverage'],
    url: '/?tab=social',
  };
  const first = await receiveNotification(summary, false, history);
  assert.equal(history.length, 1);
  assert.equal(history[0].title, summary.title);
  assert.ok(history[0].receivedAt > 0);
  assert.equal(first[0].options.tag, 'election-summary');
  assert.equal((await receiveNotification(summary, false, history)).length, 0);
  const winner = await receiveNotification(
    { ...summary, id: 'winner:1', types: ['winner'] },
    false,
    history,
  );
  assert.equal(winner[0].options.tag, 'winner:1');
  assert.equal(history.length, 2);
});

test('service worker shows the headline and photo and keeps navigation inside the app', async () => {
  const [notification] = await receiveNotification({
    id: 'news:1',
    title: 'Debate presidencial nesta noite',
    body: 'G1',
    types: ['coverage'],
    image: 'https://s2.glbimg.com/photo.jpg',
    icon: 'https://s2.glbimg.com/photo.jpg',
    url: '/?tab=social',
  });
  assert.equal(notification.title, 'Debate presidencial nesta noite');
  assert.equal(notification.options.image, 'https://s2.glbimg.com/photo.jpg');
  assert.equal(notification.options.icon, 'https://s2.glbimg.com/photo.jpg');
  assert.equal((notification.options.data as { url: string }).url, '/?tab=social');
});

test('long image URLs cannot make a text alert exceed the encrypted payload budget', () => {
  const payload = pushPayload({
    id: 'news:long',
    types: ['coverage'],
    title: 'ç'.repeat(240),
    body: 'ç'.repeat(500),
    url: '/?tab=social',
    image: 'https://s2.glbimg.com/' + 'x'.repeat(1400),
    icon: 'https://s2.glbimg.com/' + 'y'.repeat(1400),
  });
  assert.ok(Buffer.byteLength(JSON.stringify(payload), 'utf8') < 3500);
  assert.equal(payload.image, undefined);
  assert.equal(payload.icon, undefined);
  assert.equal(payload.title.length, 240);
});

test('generic legacy titles become meaningful and malformed payloads still produce an alert', async () => {
  assert.equal(
    (await receiveNotification({ title: 'Nova Notificação', types: ['lead'] }))[0].title,
    'Mudança na liderança',
  );
  assert.equal((await receiveNotification(null))[0].title, 'Atualização eleitoral');
  const [notification] = await receiveNotification({
    event: 'winner',
    url: 'https://evil.test/',
    image: 'javascript:alert(1)',
  });
  assert.equal(notification.title, 'Resultado confirmado pelo TSE');
  assert.equal(notification.options.image, undefined);
  assert.equal((notification.options.data as { url: string }).url, '/?tab=live');
});

test('unsupported rich media falls back to text without losing the title or destination', async () => {
  const calls = await receiveNotification(
    {
      title: 'Teste de notificação',
      image: '/og-image.png',
      icon: '/assets/lula.jpeg',
      url: '/?tab=alerts',
    },
    true,
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[1].title, calls[0].title);
  assert.equal(calls[1].options.image, undefined);
  assert.equal(calls[1].options.icon, '/app-icon-192.png');
  assert.equal((calls[1].options.data as { url: string }).url, '/?tab=alerts');
});

test('fresh publication alerts share a cached preview and use the actual headline', async () => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response(
      '<meta property="og:image" content="https://s2.glbimg.com/notification-test.jpg">',
      { headers: { 'Content-Type': 'text/html' } },
    );
  };
  try {
    const url = 'https://g1.globo.com/politica/notificacao-test.html';
    const publication = {
      url,
      title: 'Manchete da publicação',
      source: 'G1',
      publishedAt: new Date().toISOString(),
    };
    await queueContentAlerts(db, { articles: [publication] }, { articles: [] }, 'coverage');
    assert.equal(await articlePreview(url, db), 'https://s2.glbimg.com/notification-test.jpg');
    assert.equal(requests, 1);
    const row = await db.prepare('SELECT value FROM push_events').first<{ value: string }>();
    const event = JSON.parse(row!.value);
    assert.equal(event.title, publication.title);
    assert.equal(event.image, 'https://s2.glbimg.com/notification-test.jpg');
    assert.match(event.body, /G1/);
    assert.equal(await articlePreview('http://127.0.0.1/private', db), null);
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = originalFetch;
    client.close();
  }
});

test('a failed article source never suppresses its text alert', async () => {
  const client = createClient({ url: 'file::memory:' });
  const db = createDatabase(client);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('Source unavailable');
  };
  try {
    const publication = {
      url: 'https://g1.globo.com/politica/preview-unavailable.html',
      title: 'Notícia sem imagem',
      publishedAt: new Date().toISOString(),
    };
    await queueContentAlerts(db, { articles: [publication] }, { articles: [] }, 'coverage');
    const row = await db.prepare('SELECT value FROM push_events').first<{ value: string }>();
    const event = JSON.parse(row!.value);
    assert.equal(event.title, publication.title);
    assert.equal(event.image, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    client.close();
  }
});
