const OFFLINE = 'observatorio-offline-v3';
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(OFFLINE)
      .then((c) => c.addAll(['/offline.html', '/app-icon.svg']))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
self.addEventListener('fetch', (event) => {
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
        tag: data.id || data.result?.id || 'election-update',
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
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
