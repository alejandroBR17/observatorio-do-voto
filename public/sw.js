importScripts('/notification-store.js');
const OFFLINE = 'observatorio-offline-v6';
const OFFLINE_ASSETS = ['/offline.html', '/offline.css', '/offline.js', '/app-icon.svg'];
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(OFFLINE)
      .then((c) => c.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('observatorio-offline-') && key !== OFFLINE)
          .map((key) => caches.delete(key)),
      );
      await clients.claim();
    })(),
  ),
);
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && OFFLINE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches
        .open(OFFLINE)
        .then(async (cache) => (await cache.match(url.pathname)) || fetch(event.request)),
    );
    return;
  }
  if (event.request.mode === 'navigate')
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});
self.addEventListener('push', (event) =>
  event.waitUntil(
    (async () => {
      let data;
      try {
        data = event.data
          ? event.data.json()
          : await (await fetch('/api/events', { cache: 'no-store' })).json();
      } catch {
        data = { message: 'Abra o Observatório para consultar a atualização.' };
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
      if (typeof data.id === 'string' && !data.id.startsWith('test:')) {
        try {
          if ((await self.notificationStore.list()).some((item) => item.id === data.id)) return;
        } catch {
          /* History availability must not block a real alert. */
        }
      }
      const labels = {
        winner: 'Resultado confirmado pelo TSE',
        mathematical: 'Vantagem numericamente irreversível',
        lead: 'Mudança na liderança',
        margin: 'Mudança na vantagem',
        progress: 'Atualização da apuração',
        polls: 'Publicação sobre pesquisas',
        coverage: 'Noticiário eleitoral',
      };
      const type =
        data.event || (Array.isArray(data.types) ? data.types.find((t) => labels[t]) : null);
      const suppliedTitle = typeof data.title === 'string' ? data.title.trim() : '';
      const title =
        suppliedTitle && !/^nova\s+notifica[cç][aã]o$/i.test(suppliedTitle)
          ? suppliedTitle
          : labels[type] || 'Atualização eleitoral';
      const asset = (value) => {
        if (typeof value !== 'string') return undefined;
        if (
          [
            '/assets/lula.jpeg',
            '/assets/flavio.jpeg',
            '/og-image.png',
            '/app-icon-192.png',
          ].includes(value)
        )
          return value;
        try {
          const u = new URL(value);
          return u.protocol === 'https:' && !u.username && !u.password && !u.port
            ? u.href
            : undefined;
        } catch {
          return undefined;
        }
      };
      const options = {
        body:
          data.body || data.victory?.message || data.message || 'Novos dados oficiais disponíveis.',
        icon: asset(data.icon) || '/app-icon-192.png',
        image: asset(data.image),
        badge: '/app-icon-192.png',
        tag: ['winner', 'mathematical', 'lead'].includes(type)
          ? data.id || 'election-decisive'
          : typeof data.id === 'string' && data.id.startsWith('test:')
            ? data.id
            : 'election-summary',
        data: {
          url: typeof data.url === 'string' && data.url.startsWith('/?') ? data.url : '/?tab=live',
        },
      };
      try {
        await self.registration.showNotification(title, options);
      } catch {
        // Rich media must not suppress the alert on unsupported devices.
        const textOptions = { ...options };
        delete textOptions.image;
        await self.registration.showNotification(title, {
          ...textOptions,
          icon: '/app-icon-192.png',
        });
      }
      try {
        await self.notificationStore.put({
          id: typeof data.id === 'string' ? data.id : 'received:' + Date.now(),
          title: title.slice(0, 240),
          body: String(options.body).slice(0, 500),
          url: options.data.url,
          types: Array.isArray(data.types) ? data.types.filter((t) => labels[t]) : [],
          receivedAt: Date.now(),
          test: typeof data.id === 'string' && data.id.startsWith('test:'),
        });
        const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windows) client.postMessage({ type: 'notification-history:updated' });
      } catch {
        /* Push remains usable when device storage is unavailable. */
      }
      if (typeof data.id === 'string' && data.id.startsWith('test:')) {
        try {
          const sub = await self.registration.pushManager.getSubscription();
          if (sub)
            await fetch('/api/push/receipt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: sub.endpoint, id: data.id }),
            });
        } catch {}
      }
    })(),
  ),
);
self.addEventListener('message', (event) => {
  if (
    !['notification-history:list', 'notification-history:clear'].includes(event.data?.type) ||
    !event.ports[0]
  )
    return;
  event.waitUntil(
    (async () => {
      try {
        if (event.data.type === 'notification-history:clear') await self.notificationStore.clear();
        event.ports[0].postMessage({ items: await self.notificationStore.list() });
      } catch {
        event.ports[0].postMessage({
          error: 'Não foi possível acessar o histórico neste aparelho.',
        });
      }
    })(),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const path = event.notification.data?.url;
      const url = new URL(
        typeof path === 'string' && path.startsWith('/?') ? path : '/',
        self.location.origin,
      ).href;
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing =
        windows.find((client) => client.url === url) ||
        windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        try {
          await existing.navigate(url);
          await existing.focus();
          return;
        } catch {}
      }
      await clients.openWindow(url);
    })(),
  );
});
