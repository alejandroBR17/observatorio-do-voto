/* Local delivery history, shared with the app through its service worker. */
(() => {
  const MAX_ITEMS = 50;
  const MAX_AGE = 30 * 86400000;
  function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('observatorio-notifications', 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('received', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Histórico temporariamente indisponível.'));
    });
  }
  async function transact(mode, action) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('received', mode);
        const request = action(tx.objectStore('received'));
        tx.oncomplete = () => resolve(request?.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }
  async function list() {
    const items = await transact('readonly', (store) => store.getAll());
    return items
      .filter((item) => item.receivedAt > Date.now() - MAX_AGE)
      .sort((a, b) => b.receivedAt - a.receivedAt)
      .slice(0, MAX_ITEMS);
  }
  async function put(item) {
    await transact('readwrite', (store) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const previous = request.result.filter((entry) => entry.id !== item.id);
        const kept = new Set(
          previous
            .filter((entry) => entry.receivedAt > Date.now() - MAX_AGE)
            .sort((a, b) => b.receivedAt - a.receivedAt)
            .slice(0, MAX_ITEMS - 1)
            .map((entry) => entry.id),
        );
        for (const entry of previous) if (!kept.has(entry.id)) store.delete(entry.id);
        store.put(item);
      };
    });
  }
  self.notificationStore = {
    list,
    put,
    clear: () => transact('readwrite', (store) => store.clear()),
  };
})();
