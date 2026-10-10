import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { normalize } from '../lib/elections';
import { installationPlatform, offlineSnapshot } from '../lib/pwa';
const result = normalize(
  JSON.parse(readFileSync('public/data/2026-br.json', 'utf8')),
  'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json',
);

test('installation instructions distinguish Apple touch devices, Android and desktop Safari', () => {
  assert.equal(installationPlatform('iPhone Safari'), 'ios');
  assert.equal(installationPlatform('Macintosh Safari', 5), 'ios');
  assert.equal(installationPlatform('Macintosh Safari'), 'safari');
  assert.equal(installationPlatform('Macintosh Chrome Safari'), 'desktop');
  assert.equal(installationPlatform('Android Chrome'), 'android');
});
test('offline copies accept completed official national results and retain attribution without personal data', () => {
  const saved = offlineSnapshot(result, '2026-10-10T15:00:00.000Z');
  assert.equal(saved.savedAt, '2026-10-10T15:00:00.000Z');
  assert.equal(saved.source, result.source);
  assert.equal(
    saved.candidates.reduce((n, c) => n + c.votes, 0),
    result.valid,
  );
  for (const altered of [
    { ...result, final: false },
    { ...result, counted: 99 },
    { ...result, uf: 'SP' },
    { ...result, source: 'https://evil.test/' },
    { ...result, valid: 1 },
  ])
    assert.throws(() => offlineSnapshot(altered));
  assert.equal('favorite' in saved, false);
});

type WorkerEvent = {
  waitUntil(task: Promise<unknown>): void;
  respondWith(task: Promise<unknown>): void;
  request: { method: string; url: string; mode: string };
  notification: { close(): void; data: { url: string } };
};
function worker() {
  const handlers: Record<string, (e: WorkerEvent) => void> = {};
  const deleted: string[] = [],
    fetched: string[] = [],
    opened: string[] = [],
    navigated: string[] = [];
  let cached: string[] = [];
  const windowClient = {
    url: 'https://example.test/?tab=overview',
    navigate: async (url: string) => {
      navigated.push(url);
    },
    focus: async () => undefined,
  };
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    URL,
    self: {
      location: { origin: 'https://example.test' },
      skipWaiting: async () => undefined,
      addEventListener: (name: string, fn: (e: WorkerEvent) => void) => {
        handlers[name] = fn;
      },
    },
    caches: {
      keys: async () => ['observatorio-offline-v3', 'observatorio-offline-v4', 'another-app'],
      delete: async (key: string) => {
        deleted.push(key);
      },
      open: async () => ({
        addAll: async (paths: string[]) => {
          cached = paths;
        },
        match: async () => new Response('asset'),
      }),
      match: async () => new Response('offline'),
    },
    clients: {
      claim: async () => undefined,
      matchAll: async () => [windowClient],
      openWindow: async (url: string) => {
        opened.push(url);
      },
    },
    fetch: async (request: { url: string }) => {
      fetched.push(request.url);
      throw Error('offline');
    },
  });
  let pending = Promise.resolve<unknown>(undefined);
  const base = {
    waitUntil: (task: Promise<unknown>) => {
      pending = task;
    },
    respondWith: (task: Promise<unknown>) => {
      pending = task;
    },
    request: { method: 'GET', url: 'https://example.test/', mode: 'navigate' },
    notification: { close: () => undefined, data: { url: '/?tab=live' } },
  };
  return {
    handlers,
    base,
    complete: () => pending,
    deleted,
    fetched,
    opened,
    navigated,
    assets: () => cached,
  };
}
test('service worker removes only its old caches and never caches live APIs', async () => {
  const w = worker();
  w.handlers.install(w.base);
  await w.complete();
  assert.deepEqual(Array.from(w.assets()), [
    '/offline.html',
    '/offline.css',
    '/offline.js',
    '/app-icon.svg',
  ]);
  w.handlers.activate(w.base);
  await w.complete();
  assert.deepEqual(w.deleted, ['observatorio-offline-v3']);
  let intercepted = false;
  w.handlers.fetch({
    ...w.base,
    request: { method: 'GET', url: 'https://example.test/api/live?uf=BR', mode: 'cors' },
    respondWith: () => {
      intercepted = true;
    },
  });
  assert.equal(intercepted, false);
  w.handlers.fetch(w.base);
  const response = (await w.complete()) as Response;
  assert.equal(await response.text(), 'offline');
  assert.equal(w.fetched.length, 1);
  w.handlers.fetch({
    ...w.base,
    request: { method: 'GET', url: 'https://example.test/offline.js', mode: 'cors' },
  });
  assert.equal(await ((await w.complete()) as Response).text(), 'asset');
  assert.equal(w.fetched.length, 1);
});
test('tapping an alert reuses a same-origin app window and rejects external destinations', async () => {
  const w = worker();
  w.handlers.notificationclick(w.base);
  await w.complete();
  assert.deepEqual(w.navigated, ['https://example.test/?tab=live']);
  assert.equal(w.opened.length, 0);
  w.handlers.notificationclick({
    ...w.base,
    notification: { close: () => undefined, data: { url: 'https://evil.test/' } },
  });
  await w.complete();
  assert.equal(w.navigated.at(-1), 'https://example.test/');
});
test('offline companion renders notes as text, tolerates bad storage and performs no network requests', () => {
  class Element {
    textContent = '';
    className = '';
    hidden = false;
    children: Element[] = [];
    append(...nodes: Element[]) {
      this.children.push(...nodes);
    }
    addEventListener() {}
  }
  const nodes = new Map<string, Element>();
  const values: Record<string, string> = {
    'observatorio.preferences': 'broken',
    'observatorio.watch': JSON.stringify({
      entries: [null, { title: '<img onerror=evil()>', body: '<script>evil()</script>' }],
    }),
  };
  runInNewContext(readFileSync('public/offline.js', 'utf8'), {
    URL,
    document: {
      documentElement: { dataset: {} },
      createElement: () => new Element(),
      getElementById: (id: string) => {
        if (!nodes.has(id)) nodes.set(id, new Element());
        return nodes.get(id);
      },
    },
    localStorage: { getItem: (key: string) => values[key] || null },
    navigator: { onLine: false },
    window: { addEventListener() {} },
    location: {},
  });
  assert.equal(nodes.get('notes')?.children[0].children[1].textContent, '<script>evil()</script>');
  assert.match(nodes.get('connection')!.textContent, /Sem conexão/);
});
